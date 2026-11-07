import { scoreCheckpoint, type CheckpointAnswer } from "./checkpoint";
import type { PathDomain, PathProgress, RehearsalResult, RehearsalSize } from "./types";

/**
 * The exam rehearsal: the whole exam in one sitting, timed, with no answers
 * until the end. Full length is the real exam's own limit: Security+, Network+
 * and A+ each allow at most 90 questions in 90 minutes (CompTIA's exam pages,
 * checked 2026-11-07). Half is for a shorter sitting. It's scored like the
 * checkpoint, so both read on one dial.
 */
export const REHEARSAL_FORMATS: Record<RehearsalSize, { questions: number; minutes: number }> = {
  full: { questions: 90, minutes: 90 },
  half: { questions: 45, minutes: 45 },
};

/** Finished rehearsals kept with a path: the newest. */
export const MAX_REHEARSALS = 20;

/**
 * Score a finished rehearsal. Every question asked counts, as on the exam: one
 * left unanswered is wrong.
 */
export function scoreRehearsal(
  answers: CheckpointAnswer[],
  domains: PathDomain[],
  run: { size: RehearsalSize; answered: number; seconds: number; at: number }
): RehearsalResult {
  return {
    ...scoreCheckpoint(answers, domains, run.at),
    size: run.size,
    answered: run.answered,
    total: answers.length,
    seconds: run.seconds,
  };
}

/** Oldest first, one entry per run (a run is its finish time), the newest kept. */
export function keepRehearsals(list: readonly RehearsalResult[]): RehearsalResult[] {
  const byAt = new Map<number, RehearsalResult>();
  for (const r of list) byAt.set(r.at, r);
  return [...byAt.values()].sort((a, b) => a.at - b.at).slice(-MAX_REHEARSALS);
}

/** Keep a finished rehearsal with the path's progress. */
export function addRehearsal(progress: PathProgress, result: RehearsalResult): PathProgress {
  return { ...progress, rehearsals: keepRehearsals([...progress.rehearsals, result]) };
}

/** A readiness score and what measured it. */
export interface Reading {
  score: number;
  at: number;
  source: "checkpoint" | "rehearsal";
}

/** The latest reading: the checkpoint's or a rehearsal's, whichever came last. */
export function latestReading(progress: Pick<PathProgress, "checkpoint" | "rehearsals">): Reading | null {
  const checkpoint = progress.checkpoint;
  const last = progress.rehearsals.at(-1);
  if (last && (!checkpoint || last.at >= checkpoint.at)) {
    return { score: last.score, at: last.at, source: "rehearsal" };
  }
  return checkpoint ? { score: checkpoint.score, at: checkpoint.at, source: "checkpoint" } : null;
}

/** Time left on the clock: "1:05:09", "9:03", "0:07". */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
