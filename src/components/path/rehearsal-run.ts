import type { Reading } from "@/core/path/rehearsal";
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

const isChoiceRep = (r: unknown): r is ChoiceRep => {
  if (!r || typeof r !== "object") return false;
  const rep = r as Partial<ChoiceRep>;
  return (
    rep.type === "choice" &&
    typeof rep.id === "string" &&
    typeof rep.prompt === "string" &&
    typeof rep.objective === "string" &&
    Array.isArray(rep.options) &&
    rep.options.every((o) => typeof o === "string") &&
    Number.isInteger(rep.answer)
  );
};

/** This device's rehearsal for an exam, if it's this account's and intact. */
export function readRun(cert: string, owner: string): RehearsalRun | null {
  try {
    const raw = window.localStorage.getItem(pathRehearsalKey(cert));
    if (!raw) return null;
    const run = JSON.parse(raw) as Partial<RehearsalRun>;
    if (run.v !== 1 || run.owner !== owner) return null;
    if (run.size !== "full" && run.size !== "half") return null;
    const reps = Array.isArray(run.reps) ? run.reps : [];
    if (reps.length === 0 || !reps.every(isChoiceRep)) return null;
    const picks = Array.isArray(run.picks) ? run.picks : [];
    if (picks.length !== reps.length || !picks.every((p) => p === null || Number.isInteger(p))) return null;
    const numbers = [run.i, run.spentMs, run.limitMs, run.startedAt];
    if (!numbers.every((n) => typeof n === "number" && Number.isFinite(n) && n >= 0)) return null;
    return {
      v: 1,
      owner,
      size: run.size,
      asStop: run.asStop === true,
      reps,
      picks,
      flagged: Array.isArray(run.flagged) ? run.flagged.filter((n) => Number.isInteger(n)) : [],
      i: Math.min(run.i as number, reps.length - 1),
      spentMs: run.spentMs as number,
      limitMs: run.limitMs as number,
      startedAt: run.startedAt as number,
      done: run.done && typeof run.done === "object" && run.done.result ? run.done : null,
    };
  } catch {
    return null;
  }
}

export function writeRun(cert: string, run: RehearsalRun): void {
  try {
    window.localStorage.setItem(pathRehearsalKey(cert), JSON.stringify(run));
  } catch {
    /* storage blocked or full: the run still works in this tab */
  }
}

export function clearRun(cert: string): void {
  try {
    window.localStorage.removeItem(pathRehearsalKey(cert));
  } catch {
    /* nothing to clear */
  }
}
