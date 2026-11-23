import { sanitizeReading, sanitizeRehearsalResult, type Reading } from "@/core/path/rehearsal";
import type { ChoiceRep, RehearsalResult, RehearsalSize } from "@/core/path/types";
import { pathRehearsalKey } from "./storage-key";

/**
 * One exam rehearsal on this device: the questions drawn for it, the answers
 * so far and the clock. A run in progress survives a closed tab; a finished one
 * stays so its answers can be looked over, until the next one starts.
 */
export interface RehearsalRun {
  v: 1;
  /** The account it belongs to: never shown to another one on a shared device. */
  owner: string;
  /**
   * For a practice exam taken on a public page (its `owner` is the device, not
   * an account): the account its score was shown to, stamped when the score is
   * shown. The study path brings a finished exam into an account only when
   * nobody has claimed it or that account did, so that on a shared computer
   * one person's exam never lands in the next person's study path.
   */
  claimedBy?: string | null;
  size: RehearsalSize;
  /** Started as the path's last stop: finishing it counts the stop. */
  asStop: boolean;
  reps: ChoiceRep[];
  /** The option picked for each question (as displayed), or null. */
  picks: (number | null)[];
  /** Questions flagged to come back to, by index. */
  flagged: number[];
  /** The question on screen. */
  i: number;
  /** Clock time used, in ms. It only runs while the rehearsal is on screen. */
  spentMs: number;
  limitMs: number;
  startedAt: number;
  /** Once scored: the result, the reading it's set against, and whether time ran out. */
  done: { result: RehearsalResult; before: Reading | null; timedOut: boolean } | null;
}

/**
 * Where a run is kept. Its questions are written once, when the sitting starts,
 * and its answers are written often (every answer, every flag, and the clock
 * every few seconds), so the two live under separate keys: a tap rewrites a
 * few hundred bytes and not the whole exam.
 *
 *   the run key        the answers, the flags, the clock and the result
 *   the questions key  the questions of one sitting, with that sitting's id
 *   the id key         which sitting the questions key holds, to check without reading it
 *
 * A run written before the split holds its questions inline under the run key;
 * it is still read, and is written back in two parts at its next change.
 */
export const rehearsalQuestionsKey = (cert: string) => `${pathRehearsalKey(cert)}_questions`;
export const rehearsalQuestionsIdKey = (cert: string) => `${pathRehearsalKey(cert)}_questions_id`;

/** The longest time limit a stored run may claim: a day. */
const MAX_LIMIT_MS = 86_400_000;

/**
 * The questions this tab knows to be in storage for an exam: the array it last
 * wrote or read. A sitting keeps one array of questions from start to finish,
 * so a run that arrives with the same array needs only its answers written.
 */
const storedQuestions = new Map<string, readonly ChoiceRep[]>();

const isString = (v: unknown): v is string => typeof v === "string";
const isIndex = (v: unknown, length: number): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) < length;

/** A stored question with every part the player, the result and the import read. */
const isChoiceRep = (r: unknown): r is ChoiceRep => {
  if (!r || typeof r !== "object") return false;
  const rep = r as Partial<ChoiceRep>;
  return (
    rep.type === "choice" &&
    isString(rep.id) &&
    isString(rep.prompt) &&
    isString(rep.objective) &&
    isString(rep.takeaway) &&
    (rep.explanation === undefined || isString(rep.explanation)) &&
    Array.isArray(rep.options) &&
    rep.options.length >= 2 &&
    rep.options.length <= 8 &&
    rep.options.every(isString) &&
    // The answer is one of the options shown.
    isIndex(rep.answer, rep.options.length) &&
    (rep.order === undefined ||
      (Array.isArray(rep.order) &&
        rep.order.length === rep.options.length &&
        rep.order.every((n) => isIndex(n, rep.options!.length))))
  );
};

/** The questions of the sitting that started at `startedAt`, if storage holds them intact. */
function readQuestions(cert: string, startedAt: number): ChoiceRep[] | null {
  const raw = window.localStorage.getItem(rehearsalQuestionsKey(cert));
  if (!raw) return null;
  const stored = JSON.parse(raw) as { id?: unknown; reps?: unknown };
  if (stored.id !== startedAt || !Array.isArray(stored.reps)) return null;
  return stored.reps as ChoiceRep[];
}

/** This device's rehearsal for an exam, if it's this account's and intact. */
export function readRun(cert: string, owner: string): RehearsalRun | null {
  try {
    const raw = window.localStorage.getItem(pathRehearsalKey(cert));
    if (!raw) return null;
    const run = JSON.parse(raw) as Partial<RehearsalRun>;
    if (run.v !== 1 || run.owner !== owner) return null;
    if (run.size !== "full" && run.size !== "half") return null;
    const numbers = [run.i, run.spentMs, run.limitMs, run.startedAt];
    if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
    const limitMs = run.limitMs as number;
    if (limitMs <= 0 || limitMs > MAX_LIMIT_MS) return null;
    const startedAt = run.startedAt as number;

    // The questions: inline in a run written before the split, beside it since.
    const inline = Array.isArray(run.reps);
    const reps = inline ? (run.reps as ChoiceRep[]) : (readQuestions(cert, startedAt) ?? []);
    if (reps.length === 0 || !reps.every(isChoiceRep)) return null;
    // A pick is one of its own question's options.
    const picks = Array.isArray(run.picks) ? run.picks : [];
    if (picks.length !== reps.length) return null;
    if (!picks.every((p, k) => p === null || isIndex(p, reps[k].options.length))) return null;
    const flagged = Array.isArray(run.flagged)
      ? [...new Set(run.flagged.filter((n) => isIndex(n, reps.length)))].sort((a, b) => a - b)
      : [];

    // A result is kept only when every figure in it is in range and it is the
    // result of these questions. Otherwise the sitting counts as not yet scored.
    const result = run.done && typeof run.done === "object" ? sanitizeRehearsalResult(run.done.result) : null;
    const done =
      result && result.total === reps.length && result.size === run.size
        ? { result, before: sanitizeReading(run.done?.before), timedOut: run.done?.timedOut === true }
        : null;

    if (!inline) storedQuestions.set(cert, reps);
    return {
      v: 1,
      owner,
      claimedBy: isString(run.claimedBy) && run.claimedBy.length > 0 ? run.claimedBy : null,
      size: run.size,
      asStop: run.asStop === true,
      reps,
      picks,
      flagged,
      i: Math.min(Math.floor(run.i as number), reps.length - 1),
      spentMs: Math.min(run.spentMs as number, limitMs),
      limitMs,
      startedAt,
      done,
    };
  } catch {
    return null;
  }
}

/**
 * Keep a run on the device. The questions are written when a sitting is first
 * kept, or when storage no longer holds them (another tab started a sitting of
 * its own); every later call writes the answers alone.
 */
export function writeRun(cert: string, run: RehearsalRun): void {
  try {
    const storage = window.localStorage;
    const id = String(run.startedAt);
    const kept = storedQuestions.get(cert) === run.reps && storage.getItem(rehearsalQuestionsIdKey(cert)) === id;
    if (!kept) {
      storedQuestions.delete(cert);
      storage.setItem(rehearsalQuestionsKey(cert), JSON.stringify({ id: run.startedAt, reps: run.reps }));
      storage.setItem(rehearsalQuestionsIdKey(cert), id);
      storedQuestions.set(cert, run.reps);
    }
    // Everything but the questions. Written last: if the questions could not be
    // kept, the run already in storage is left whole.
    const state: Omit<RehearsalRun, "reps"> = {
      v: 1,
      owner: run.owner,
      claimedBy: run.claimedBy ?? null,
      size: run.size,
      asStop: run.asStop,
      picks: run.picks,
      flagged: run.flagged,
      i: run.i,
      spentMs: run.spentMs,
      limitMs: run.limitMs,
      startedAt: run.startedAt,
      done: run.done,
    };
    storage.setItem(pathRehearsalKey(cert), JSON.stringify(state));
  } catch {
    /* storage blocked or full: the run still works in this tab */
  }
}

export function clearRun(cert: string): void {
  storedQuestions.delete(cert);
  try {
    window.localStorage.removeItem(pathRehearsalKey(cert));
    window.localStorage.removeItem(rehearsalQuestionsKey(cert));
    window.localStorage.removeItem(rehearsalQuestionsIdKey(cert));
  } catch {
    /* nothing to clear */
  }
}
