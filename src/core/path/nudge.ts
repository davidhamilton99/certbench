import { hasStarted, isStopDone, nextStopIndex, stopsDone } from "./progress";
import type { PathPlan, PathProgress, StopKind } from "./types";

/** A stalled path gets its nudge between two and seven days after the last activity. */
export const NUDGE_MIN_HOURS = 48;
export const NUDGE_MAX_HOURS = 7 * 24;

/** How far into their path someone is. */
export interface PathStanding {
  done: number;
  total: number;
  /** Stops of the free stretch, the checkpoint included, not played yet. */
  freeLeft: number;
}

export function pathStanding(plan: PathPlan, progress: PathProgress): PathStanding {
  return {
    done: stopsDone(plan, progress),
    total: plan.stops.length,
    freeLeft: plan.stops
      .slice(0, plan.freeThrough + 1)
      .filter((s) => !isStopDone(progress, s.id)).length,
  };
}

export interface PathNudge extends PathStanding {
  /** The stop they'd play next. */
  next: { title: string; kind: StopKind };
  /** Stops still to play before the checkpoint, counting the next one. */
  toCheckpoint: number;
  /** The free stretch in order, the checkpoint last: drawn in the email. */
  stretch: { kind: StopKind; done: boolean }[];
}

/**
 * Whether a learner should get the one-time "pick up where you left off"
 * email for a path, and what it says. Only for someone who started, stopped
 * for two to seven days, and hasn't reached the readiness checkpoint yet — the
 * point where they see where they stand and the offer is made. Pure, so the
 * cron's decision is unit-tested. (Once per exam is enforced by the email log.)
 */
export function pathNudge(
  plan: PathPlan,
  progress: PathProgress,
  lastActiveMs: number,
  nowMs: number
): PathNudge | null {
  if (!hasStarted(progress)) return null;
  const checkpoint = plan.stops[plan.freeThrough];
  if (!checkpoint || isStopDone(progress, checkpoint.id)) return null;

  const hours = (nowMs - lastActiveMs) / 3_600_000;
  if (hours < NUDGE_MIN_HOURS || hours > NUDGE_MAX_HOURS) return null;

  const next = plan.stops[nextStopIndex(plan, progress)];
  const standing = pathStanding(plan, progress);
  return {
    ...standing,
    next: { title: next.title, kind: next.kind },
    toCheckpoint: standing.freeLeft - 1,
    stretch: plan.stops
      .slice(0, plan.freeThrough + 1)
      .map((s) => ({ kind: s.kind, done: isStopDone(progress, s.id) })),
  };
}
