import { hasStarted, sanitizePathProgress } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathProgress } from "@/core/path/types";
import { pathGuestKey, pathStorageKey } from "./storage-key";

/**
 * This device's copy of one exam's path, in localStorage. Dependency-free so
 * public pages (the exam picker, inline quick rounds) can use it without
 * pulling in the account client.
 */
export interface LocalPath {
  v: 1;
  /** Account the progress belongs to; null = anonymous visitor. */
  owner: string | null;
  progress: PathProgress;
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

export function writeLocalPath(cert: string, state: LocalPath): void {
  try {
    window.localStorage.setItem(pathStorageKey(cert), JSON.stringify(state));
  } catch {
    /* storage blocked — progress still works for this tab */
  }
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

export function writeGuestPath(cert: string, progress: PathProgress): void {
  try {
    window.localStorage.setItem(pathGuestKey(cert), JSON.stringify(progress));
  } catch {
    /* storage blocked — the work still counts for this tab */
  }
}

export function clearGuestPath(cert: string): void {
  try {
    window.localStorage.removeItem(pathGuestKey(cert));
  } catch {
    /* storage blocked: nothing was kept */
  }
}

/**
 * Hand this device's anonymous path for an exam to an account that just
 * signed in on a public page. The path then saves it to that account when it
 * opens. Never takes another account's copy from a shared device.
 */
export function claimLocalPath(cert: string, owner: string): void {
  const local = readLocalPath(cert);
  if (local && local.owner === null) writeLocalPath(cert, { ...local, owner });
}

/**
 * Apply a change to this device's saved path for an exam, keeping whose it
 * is. For public pages that play a stop inline: the path picks the work up
 * (and saves it to the account) the next time it opens.
 */
export function updateLocalPath(cert: string, change: (p: PathProgress) => PathProgress): void {
  const local = readLocalPath(cert);
  writeLocalPath(cert, {
    v: 1,
    owner: local?.owner ?? null,
    progress: change(local?.progress ?? EMPTY_PATH_PROGRESS),
  });
}
