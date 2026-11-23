import { scoreCheckpoint, type CheckpointAnswer } from "./checkpoint";
import { allocate } from "./compose";
import type { ChoiceRep, PathDomain, PathProgress, RehearsalResult, RehearsalSize } from "./types";

/**
 * The exam rehearsal: the whole exam in one sitting, timed, with no answers
 * until the end. Full length is the real exam's own limit: Security+, Network+
 * and A+ each allow at most 90 questions in 90 minutes (CompTIA's exam pages,
 * checked 2026-11-22). Half is for a shorter sitting. It's scored like the
 * checkpoint, so both read on one dial.
 */
export const REHEARSAL_FORMATS: Record<RehearsalSize, { questions: number; minutes: number }> = {
  full: { questions: 90, minutes: 90 },
  half: { questions: 45, minutes: 45 },
};

/**
 * A half-length sitting cut from a full-length draw: each domain keeps its
 * exam weight's share of the half's questions, taken in the draw's own order,
 * so a page that holds one full exam can offer either length. Fewer questions
 * than a half are returned as they are.
 */
export function halfOfExam(reps: readonly ChoiceRep[], domains: readonly PathDomain[]): ChoiceRep[] {
  const wanted = REHEARSAL_FORMATS.half.questions;
  if (reps.length <= wanted) return [...reps];
  const domainOf = (objective: string) => (objective.includes(".") ? `${objective.split(".")[0]}.0` : objective);
  const slots = allocate(
    domains.map((d) => d.weight),
    wanted
  );
  const taken = new Set<number>();
  domains.forEach((d, i) => {
    let left = slots[i];
    reps.forEach((rep, index) => {
      if (left > 0 && domainOf(rep.objective) === d.number) {
        taken.add(index);
        left--;
      }
    });
  });
  // A domain too thin for its share leaves room: fill it in draw order.
  reps.forEach((_, index) => {
    if (taken.size < wanted) taken.add(index);
  });
  return reps.filter((_, index) => taken.has(index));
}

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

const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

/**
 * A finished rehearsal's result as read back from storage, or null when any
 * part of it is out of range. A stored result is not trusted: it is checked
 * before a page prints it or the study path takes it in. These are the checks
 * the path applies to the rehearsals kept with its progress (progress.ts).
 */
export function sanitizeRehearsalResult(raw: unknown): RehearsalResult | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isCount(r.score) || r.score > 100 || !isCount(r.at)) return null;
  if (r.size !== "full" && r.size !== "half") return null;
  if (!isCount(r.answered) || !isCount(r.total) || !isCount(r.seconds)) return null;
  if (r.answered > r.total || r.total > 200 || r.seconds > 86_400) return null;
  if (!Array.isArray(r.domains) || r.domains.length > 12) return null;
  const domains: RehearsalResult["domains"] = [];
  for (const d of r.domains) {
    if (!d || typeof d !== "object") return null;
    const { number, correct, total } = d as Record<string, unknown>;
    if (typeof number !== "string" || number.length === 0 || number.length > 8) return null;
    if (!isCount(correct) || !isCount(total) || correct > total) return null;
    domains.push({ number, correct, total });
  }
  return { score: r.score, at: r.at, domains, size: r.size, answered: r.answered, total: r.total, seconds: r.seconds };
}

/** A stored reading (the score a result is set against), or null when it is not one. */
export function sanitizeReading(raw: unknown): Reading | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isCount(r.score) || r.score > 100 || !isCount(r.at)) return null;
  if (r.source !== "checkpoint" && r.source !== "rehearsal") return null;
  return { score: r.score, at: r.at, source: r.source };
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
