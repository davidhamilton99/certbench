// Shapes raw DB rows into the minimal data structures the analytics charts
// render from. All pure functions — no fetching, no Supabase client. Unit
// testable with fixtures.

export interface RawSnapshot {
  overall_score: number | string;
  computed_at: string;
}

export interface ReadinessPoint {
  /** ISO day key (yyyy-mm-dd) in UTC. */
  day: string;
  /** Most recent snapshot score for that day, 0-100. */
  score: number;
}

/**
 * Collapses multiple snapshots from the same UTC day into a single point
 * (taking the latest). Returns oldest-first so a line chart reads left-to-right.
 * `snapshots` can be in any order; the function re-sorts internally.
 */
export function shapeReadinessSeries(
  snapshots: RawSnapshot[]
): ReadinessPoint[] {
  if (snapshots.length === 0) return [];

  const byDay = new Map<string, { score: number; computedAt: number }>();
  for (const s of snapshots) {
    const ts = new Date(s.computed_at).getTime();
    if (!Number.isFinite(ts)) continue;
    const day = new Date(ts).toISOString().slice(0, 10);
    const score = Number(s.overall_score);
    if (!Number.isFinite(score)) continue;
    const existing = byDay.get(day);
    if (!existing || existing.computedAt < ts) {
      byDay.set(day, { score, computedAt: ts });
    }
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, score: v.score }));
}

export interface RawAttempt {
  completed_at: string | null;
  total_questions: number | null;
  correct_count: number | null;
  is_complete: boolean;
}

export interface DailyActivity {
  /** ISO day key (yyyy-mm-dd). */
  day: string;
  attempts: number;
  questions: number;
  correct: number;
}

/**
 * Produces a dense array of days across `[startDay, endDay]` (inclusive),
 * filling in zero-activity days so the bar chart never has gaps.
 * `endDay` defaults to today UTC.
 */
export function shapeActivityByDay(
  attempts: RawAttempt[],
  rangeDays: number,
  now: Date = new Date()
): DailyActivity[] {
  const endMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );
  const startMs = endMs - (rangeDays - 1) * 86_400_000;

  const byDay = new Map<string, DailyActivity>();
  // Seed empty days so gaps render as zero bars.
  for (let t = startMs; t <= endMs; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    byDay.set(day, { day, attempts: 0, questions: 0, correct: 0 });
  }

  for (const a of attempts) {
    if (!a.is_complete || !a.completed_at) continue;
    const ts = new Date(a.completed_at).getTime();
    if (!Number.isFinite(ts) || ts < startMs || ts > endMs + 86_400_000) continue;
    const day = new Date(ts).toISOString().slice(0, 10);
    const entry = byDay.get(day);
    if (!entry) continue;
    entry.attempts += 1;
    entry.questions += a.total_questions ?? 0;
    entry.correct += a.correct_count ?? 0;
  }

  return [...byDay.values()].sort((a, b) => a.day.localeCompare(b.day));
}

export interface RawPerformance {
  question_id: string;
  times_seen: number;
  times_correct: number;
}

export interface WeakSubObjective {
  subObjectiveId: string;
  code: string;
  title: string;
  domainNumber: string;
  attempted: number;
  correct: number;
  accuracy: number;
}

/**
 * Returns the worst-performing sub-objectives sorted by accuracy ascending.
 * Only considers sub-objectives with at least `minAttempted` attempts so a
 * single unlucky answer doesn't pin them to 0%.
 */
export function shapeWeakestSubObjectives(
  performance: RawPerformance[],
  questionToSub: Map<string, string>,
  subObjectives: {
    id: string;
    code: string;
    title: string;
    domain_id: string;
  }[],
  domainNumbers: Map<string, string>,
  opts: { minAttempted: number; limit: number }
): WeakSubObjective[] {
  const agg = new Map<string, { attempted: number; correct: number }>();
  for (const p of performance) {
    const subId = questionToSub.get(p.question_id);
    if (!subId) continue;
    const bucket = agg.get(subId) ?? { attempted: 0, correct: 0 };
    bucket.attempted += p.times_seen;
    bucket.correct += p.times_correct;
    agg.set(subId, bucket);
  }

  const subMap = new Map(subObjectives.map((s) => [s.id, s]));

  const rows: WeakSubObjective[] = [];
  for (const [subId, bucket] of agg) {
    if (bucket.attempted < opts.minAttempted) continue;
    const sub = subMap.get(subId);
    if (!sub) continue;
    rows.push({
      subObjectiveId: subId,
      code: sub.code,
      title: sub.title,
      domainNumber: domainNumbers.get(sub.domain_id) ?? "",
      attempted: bucket.attempted,
      correct: bucket.correct,
      accuracy: (bucket.correct / bucket.attempted) * 100,
    });
  }

  return rows
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, opts.limit);
}
