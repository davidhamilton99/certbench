import { biggestOpportunity } from "./checkpoint";
import { stopsDone } from "./progress";
import type { CheckpointResult, PathDomain, PathPlan, PathProgress } from "./types";

/**
 * The checkpoint follow-up goes the day after, not while they might still be
 * deciding, and not once a week has gone by.
 */
export const FOLLOW_UP_MIN_HOURS = 20;
export const FOLLOW_UP_MAX_HOURS = 7 * 24;

export interface CheckpointFollowUp {
  result: CheckpointResult;
  /** Stops still to play: the part of the path the offer opens. */
  remaining: number;
  /** The domain with the most to gain, if any was missed. */
  opportunity: PathDomain | null;
}

/**
 * Whether someone should get the one-time email about their readiness
 * checkpoint: they took it, saw the offer, and haven't been back since. Pure,
 * so the cron's decision is unit-tested. (Pro and once-per-exam are the
 * caller's checks.)
 */
export function checkpointFollowUp(
  plan: PathPlan,
  domains: PathDomain[],
  progress: PathProgress,
  lastActiveMs: number,
  nowMs: number
): CheckpointFollowUp | null {
  const result = progress.checkpoint;
  if (!result) return null;
  const hoursSince = (ms: number) => (nowMs - ms) / 3_600_000;
  const taken = hoursSince(result.at);
  if (taken < FOLLOW_UP_MIN_HOURS || taken > FOLLOW_UP_MAX_HOURS) return null;
  if (hoursSince(lastActiveMs) < FOLLOW_UP_MIN_HOURS) return null;
  return {
    result,
    remaining: plan.stops.length - stopsDone(plan, progress),
    opportunity: biggestOpportunity(result, domains),
  };
}
