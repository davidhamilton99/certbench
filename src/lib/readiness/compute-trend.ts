// Readiness trend: compares the current readiness score against a historical
// baseline pulled from readiness_snapshots. Lets the UI show "+4% this week"
// without having to re-score from scratch.

export interface SnapshotRow {
  overall_score: number | string;
  computed_at: string;
}

export interface ReadinessTrend {
  /** Delta from the baseline snapshot to the current score, rounded to 1dp. */
  delta: number;
  /** Exact baseline score we compared against. */
  baselineScore: number;
  /** Days between the baseline snapshot and now. */
  daysSpan: number;
  /** True when we found a snapshot older than the target window. */
  hasBaseline: boolean;
}

const DEFAULT_WINDOW_DAYS = 7;

/**
 * Returns the week-over-week delta in readiness score.
 *
 * `snapshots` should be ordered newest-first. We pick the newest snapshot
 * that is at least `windowDays` old; if nothing is that old yet we fall back
 * to the oldest available snapshot, so new users still see early progress.
 */
export function computeReadinessTrend(
  currentScore: number,
  snapshots: SnapshotRow[],
  windowDays: number = DEFAULT_WINDOW_DAYS,
  now: Date = new Date()
): ReadinessTrend | null {
  if (snapshots.length === 0) return null;

  const cutoff = now.getTime() - windowDays * 24 * 60 * 60 * 1000;

  // Snapshots newer than `now` are ignored (clock skew defensively).
  const usable = snapshots.filter(
    (s) => new Date(s.computed_at).getTime() <= now.getTime()
  );
  if (usable.length === 0) return null;

  // Prefer the newest snapshot older than the cutoff — that's the proper
  // week-ago baseline. If none qualify, fall back to the oldest snapshot
  // we have so brand-new users still see movement.
  const older = usable.find((s) => new Date(s.computed_at).getTime() <= cutoff);
  const baseline = older ?? usable[usable.length - 1];
  const baselineScore = Number(baseline.overall_score);

  if (!Number.isFinite(baselineScore)) return null;

  const daysSpan = Math.max(
    0,
    Math.round(
      (now.getTime() - new Date(baseline.computed_at).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return {
    delta: Math.round((currentScore - baselineScore) * 10) / 10,
    baselineScore: Math.round(baselineScore * 100) / 100,
    daysSpan,
    hasBaseline: Boolean(older),
  };
}
