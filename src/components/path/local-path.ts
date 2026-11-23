import { hasStarted, mergePathProgress, sanitizePathProgress } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";
import { pathExamTakenKey, pathGuestClaimKey, pathGuestKey, pathStorageKey } from "./storage-key";

/**
 * This device's copy of one exam's path, in localStorage. Dependency-free so
 * public pages (the exam picker, inline quick rounds) can use it without
 * pulling in the account client.
 *
 * Whose work goes where. The device copy belongs to one account, or to nobody
 * yet (an anonymous visitor). Work done by someone who is not signed in as
 * that account is guest work: it is kept beside the copy, never in it, and it
 * joins whichever account signs in next. So on a shared computer one person's
 * answers never land in another person's study path.
 */
export interface LocalPath {
  v: 1;
  /** Account the progress belongs to; null = anonymous visitor. */
  owner: string | null;
  progress: PathProgress;
}

/**
 * What this tab last put under each key. A stored copy that still reads the
 * same has had no other writer, so it does not need to be parsed and merged
 * again before the next write.
 */
const lastWritten = new Map<string, string>();

/** Store a value. False when the browser refuses: blocked site data, private browsing or a full store. */
function put(key: string, json: string): boolean {
  try {
    window.localStorage.setItem(key, json);
    lastWritten.set(key, json);
    return true;
  } catch {
    return false;
  }
}

/** Whether another tab or page has written under a key since this tab last did. */
function writtenElsewhere(key: string): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null && raw !== lastWritten.get(key);
  } catch {
    return false;
  }
}

export function readLocalPath(cert: string): LocalPath | null {
  try {
    const raw = window.localStorage.getItem(pathStorageKey(cert));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalPath>;
    return {
      v: 1,
      owner: typeof parsed.owner === "string" ? parsed.owner : null,
      progress: sanitizePathProgress(parsed.progress),
    };
  } catch {
    return null;
  }
}

/**
 * Keep a copy of the path on this device. Every writer stores the whole copy
 * from its own memory, and a second tab or an inline round on a public page
 * may have added to it since, so work in a stored copy with the same owner is
 * merged in first and is never overwritten. Returns false when the browser
 * refused to keep it: the progress then lasts only as long as the tab.
 */
export function writeLocalPath(cert: string, state: LocalPath): boolean {
  const key = pathStorageKey(cert);
  let progress = state.progress;
  if (writtenElsewhere(key)) {
    const stored = readLocalPath(cert);
    if (stored && stored.owner === state.owner) progress = mergePathProgress(progress, stored.progress);
  }
  return put(key, JSON.stringify({ v: 1, owner: state.owner, progress }));
}

/** Guest work beside an account's copy (see pathGuestKey), once some has been played. */
export function readGuestPath(cert: string): PathProgress | null {
  try {
    const raw = window.localStorage.getItem(pathGuestKey(cert));
    if (!raw) return null;
    const progress = sanitizePathProgress(JSON.parse(raw));
    return hasStarted(progress) ? progress : null;
  } catch {
    return null;
  }
}

/** Keep guest work, merged with any that another tab has kept since. False when the browser refused. */
export function writeGuestPath(cert: string, progress: PathProgress): boolean {
  const key = pathGuestKey(cert);
  const stored = writtenElsewhere(key) ? readGuestPath(cert) : null;
  return put(key, JSON.stringify(stored ? mergePathProgress(progress, stored) : progress));
}

export function clearGuestPath(cert: string): void {
  try {
    window.localStorage.removeItem(pathGuestKey(cert));
    window.localStorage.removeItem(pathGuestClaimKey(cert));
  } catch {
    /* storage blocked: nothing was kept */
  }
}

/** The account a public page handed the guest work to, if it handed it to one. */
export function readGuestClaim(cert: string): string | null {
  try {
    return window.localStorage.getItem(pathGuestClaimKey(cert)) || null;
  } catch {
    return null;
  }
}

/**
 * Hand this device's work for an exam to an account that has just signed up or
 * signed in on a public page. The study path saves it to that account when it
 * opens. An anonymous copy becomes the account's. Another account's copy is
 * never taken: beside one, the visitor's work is guest work, which is marked as
 * this account's so that the study path does not count the account again.
 */
export function claimLocalPath(cert: string, owner: string): void {
  const local = readLocalPath(cert);
  if (local && local.owner === null) {
    writeLocalPath(cert, { ...local, owner });
    return;
  }
  if (readGuestPath(cert)) put(pathGuestClaimKey(cert), owner);
}

/**
 * Apply a change to the visitor's own work on this device for an exam. For
 * public pages that play a stop inline: the study path picks the work up (and
 * saves it to the account) the next time it opens.
 *
 * `userId` is who is signed in. A caller that does not know passes nothing,
 * which means nobody is. When the device copy belongs to an account the
 * visitor is not signed in as, the change is applied to the guest work beside
 * it and the account's copy is left as it is.
 *
 * Returns false when the browser refused to keep the change.
 */
export function updateLocalPath(
  cert: string,
  change: (p: PathProgress) => PathProgress,
  userId?: string | null
): boolean {
  const local = readLocalPath(cert);
  if (local?.owner && local.owner !== (userId ?? null)) {
    const kept = writeGuestPath(cert, change(readGuestPath(cert) ?? EMPTY_PATH_PROGRESS));
    // Played by someone who is signed in: the work is that account's already.
    // Marked as such, the study path takes it without counting the account as
    // newly linked (as it does for work a public page handed to a new account).
    if (kept && userId) put(pathGuestClaimKey(cert), userId);
    return kept;
  }
  return writeLocalPath(cert, {
    v: 1,
    owner: local?.owner ?? null,
    progress: change(local?.progress ?? EMPTY_PATH_PROGRESS),
  });
}

/**
 * The visitor's own work on this device, as the study path will show it to
 * them: the device copy when it is anonymous or theirs, together with any
 * guest work beside it, and otherwise the guest work alone. Another account's
 * copy is never returned. Null when there is none.
 */
export function readVisitorPath(cert: string, userId?: string | null): PathProgress | null {
  const local = readLocalPath(cert);
  const guest = readGuestPath(cert);
  const mine = local && (local.owner === null || local.owner === (userId ?? null)) ? local.progress : null;
  return mine && guest ? mergePathProgress(mine, guest) : (mine ?? guest);
}

/**
 * What became of a practice exam finished on a public page of this device:
 * `by` is the account that took it onto its study path, or null when it was
 * set aside. `at` names the exam by the time it was finished.
 */
export interface ExamMark {
  at: number;
  by: string | null;
}

export function readExamMark(cert: string): ExamMark | null {
  try {
    const mark = JSON.parse(window.localStorage.getItem(pathExamTakenKey(cert)) || "null") as Partial<ExamMark> | null;
    if (!mark || typeof mark.at !== "number") return null;
    return { at: mark.at, by: typeof mark.by === "string" ? mark.by : null };
  } catch {
    return null;
  }
}

export function writeExamMark(cert: string, mark: ExamMark): void {
  put(pathExamTakenKey(cert), JSON.stringify(mark));
}

/**
 * Whether a practice exam that was finished on a public page of this device is
 * this account's to bring onto its study path. Public pages keep an exam for
 * the device and not for a person, so on a shared computer it must not go to
 * whoever opens the study path next.
 *
 *   - An exam that an account claimed (by creating an account or signing in to
 *     see the score) belongs to that account and to no other.
 *   - An exam that this device has already given to an account, or has set
 *     aside, stays where it is.
 *   - An exam that nobody claimed is taken only when the device did not hold
 *     another account's study path when this account arrived (`foreign`).
 */
export function mayTakeExam(
  userId: string,
  exam: { at: number; claimedBy: string | null },
  device: { foreign: boolean; mark: ExamMark | null }
): boolean {
  if (exam.claimedBy) return exam.claimedBy === userId;
  if (device.mark && device.mark.at === exam.at) return device.mark.by === userId;
  return !device.foreign;
}
