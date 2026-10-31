import { MINUTES_PER_STOP } from "./plan";
import type { CheckpointResult, PathDomain } from "./types";

export interface CheckpointAnswer {
  /** Domain number, e.g. "2.0". */
  domain: string;
  correct: boolean;
}

/**
 * Score a checkpoint: accuracy per domain, combined by exam weight across the
 * domains it sampled. A plain test score, clearly not the confidence-weighted
 * readiness the app builds over time.
 */
export function scoreCheckpoint(
  answers: CheckpointAnswer[],
  domains: PathDomain[],
  at: number
): CheckpointResult {
  const weight = new Map(domains.map((d) => [d.number, d.weight]));
  const tally = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const t = tally.get(a.domain) ?? { correct: 0, total: 0 };
    t.total++;
    if (a.correct) t.correct++;
    tally.set(a.domain, t);
  }
  let weighted = 0;
  let weightSum = 0;
  for (const [number, t] of tally) {
    const w = weight.get(number) ?? 0;
    weighted += (t.correct / t.total) * 100 * w;
    weightSum += w;
  }
  const score = weightSum > 0 ? Math.round(weighted / weightSum) : 0;
  return {
    score,
    at,
    domains: domains
      .filter((d) => tally.has(d.number))
      .map((d) => ({ number: d.number, ...tally.get(d.number)! })),
  };
}

/**
 * The domain with the most to gain: lowest accuracy, ties broken by the larger
 * share of the exam.
 */
export function biggestOpportunity(
  result: CheckpointResult,
  domains: PathDomain[]
): PathDomain | null {
  const weight = new Map(domains.map((d) => [d.number, d.weight]));
  const ranked = result.domains
    .filter((d) => d.total > 0)
    .map((d) => ({ d, pct: d.correct / d.total, w: weight.get(d.number) ?? 0 }))
    .sort((a, b) => a.pct - b.pct || b.w - a.w);
  const top = ranked[0];
  if (!top || top.pct >= 1) return null;
  return domains.find((d) => d.number === top.d.number) ?? null;
}

const DAY = 86_400_000;

/** Stops a day at a given daily time budget (at least one). */
export function stopsPerDay(minutesPerDay: number | null): number {
  return Math.max(1, Math.floor((minutesPerDay ?? 20) / MINUTES_PER_STOP));
}

/** When the remaining stops are done at this pace, counting today as day one. */
export function projectFinish(
  remainingStops: number,
  minutesPerDay: number | null,
  now: number
): Date {
  const days = Math.max(1, Math.ceil(remainingStops / stopsPerDay(minutesPerDay)));
  return new Date(now + (days - 1) * DAY);
}

/** Whole days from `from` to an ISO date (yyyy-mm-dd), negative if past. */
export function daysUntil(isoDate: string, from: number): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const start = new Date(from);
  const today = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  return Math.round((target - today) / DAY);
}

/** The ISO date (yyyy-mm-dd) `days` from now. */
export function isoInDays(days: number, now: number): string {
  return new Date(now + days * DAY).toISOString().slice(0, 10);
}
