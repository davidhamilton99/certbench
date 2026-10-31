import {
  itemStatus,
  recordAnswer,
  sanitizeProgress as sanitizeItems,
  type ItemMap,
} from "@/core/drill-rounds/drill-rounds";
import { parseRepId } from "./rep-id";
import {
  EMPTY_PATH_PROGRESS,
  type CheckpointResult,
  type ObjectiveStatus,
  type PathGoal,
  type PathPlan,
  type PathProgress,
  type StopRecord,
} from "./types";

/** Caps that keep a stored path blob small and well-formed. */
export const MAX_PATH_ITEMS = 2000;
export const MAX_PATH_STOPS = 400;
/** Ids sent with a stop request, newest first. */
export const MAX_SEEN_SENT = 1200;
export const MAX_MISSED_SENT = 40;

/** Record one graded answer. */
export function recordRep(
  progress: PathProgress,
  repId: string,
  correct: boolean,
  now: number
): PathProgress {
  return { ...progress, items: recordAnswer(progress.items, repId, correct, now) };
}

/** Mark a stop finished with its score. */
export function finishStop(
  progress: PathProgress,
  stopId: string,
  correct: number,
  total: number,
  now: number
): PathProgress {
  const prev = progress.stops[stopId];
  return {
    ...progress,
    stops: {
      ...progress.stops,
      [stopId]: { n: (prev?.n ?? 0) + 1, c: correct, t: total, at: now },
    },
  };
}

export function isStopDone(progress: PathProgress, stopId: string): boolean {
  return (progress.stops[stopId]?.n ?? 0) > 0;
}

/**
 * The stop to play next: the first one in path order not yet finished.
 * Past the end it's `plan.stops.length` — the open-ended review rounds.
 */
export function nextStopIndex(plan: PathPlan, progress: PathProgress): number {
  const i = plan.stops.findIndex((s) => !isStopDone(progress, s.id));
  return i < 0 ? plan.stops.length : i;
}

/** Stops finished, out of the path's total. */
export function stopsDone(plan: PathPlan, progress: PathProgress): number {
  return plan.stops.filter((s) => isStopDone(progress, s.id)).length;
}

export function hasStarted(progress: PathProgress): boolean {
  return Object.keys(progress.items).length > 0 || Object.keys(progress.stops).length > 0;
}

/**
 * Where each objective stands, from every rep answered against it: "got" when
 * the latest answer to each of its reps was right, "missed" while any rep's
 * latest answer was wrong (it comes back in a later stop), "new" otherwise.
 */
export function objectiveStatuses(items: ItemMap): Map<string, ObjectiveStatus> {
  const out = new Map<string, ObjectiveStatus>();
  for (const [id, record] of Object.entries(items)) {
    const parsed = parseRepId(id);
    if (!parsed) continue;
    const status = itemStatus(record);
    if (status === "new") continue;
    const prev = out.get(parsed.objective);
    if (status === "missed" || prev === "missed") out.set(parsed.objective, "missed");
    else out.set(parsed.objective, "got");
  }
  return out;
}

/** Rep ids answered at least once, most recent first. */
export function seenIds(items: ItemMap, limit = MAX_SEEN_SENT): string[] {
  return Object.entries(items)
    .filter(([, r]) => r.a > 0)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, limit)
    .map(([id]) => id);
}

/** Rep ids whose latest answer was wrong, oldest miss first. */
export function missedIds(items: ItemMap, limit = MAX_MISSED_SENT): string[] {
  return Object.entries(items)
    .filter(([, r]) => itemStatus(r) === "missed")
    .sort((a, b) => a[1].t - b[1].t)
    .slice(0, limit)
    .map(([id]) => id);
}

/**
 * Combine two snapshots of one person's path (this device + their account, or
 * two devices). Items: the record with more attempts wins, then the later one.
 * Stops: more completions wins, then the later run. Checkpoint and goal: the
 * later one.
 */
export function mergePathProgress(a: PathProgress, b: PathProgress): PathProgress {
  const items: ItemMap = { ...a.items };
  for (const [id, rb] of Object.entries(b.items)) {
    const ra = items[id];
    if (!ra || rb.a > ra.a || (rb.a === ra.a && rb.t > ra.t)) items[id] = rb;
  }
  const stops: Record<string, StopRecord> = { ...a.stops };
  for (const [id, sb] of Object.entries(b.stops)) {
    const sa = stops[id];
    if (!sa || sb.n > sa.n || (sb.n === sa.n && sb.at > sa.at)) stops[id] = sb;
  }
  const later = <T extends { at: number }>(x: T | null, y: T | null): T | null =>
    !x ? y : !y ? x : y.at > x.at ? y : x;
  return {
    items,
    stops,
    checkpoint: later(a.checkpoint, b.checkpoint),
    goal: later(a.goal, b.goal),
  };
}

const isCount = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;
const isIsoDate = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

/**
 * Parse a stored path blob defensively — it comes from localStorage or a jsonb
 * column, so anything malformed is dropped rather than trusted.
 */
export function sanitizePathProgress(raw: unknown): PathProgress {
  if (!raw || typeof raw !== "object") return EMPTY_PATH_PROGRESS;
  const r = raw as Record<string, unknown>;

  // Items share the drills' record shape and validation; lift the cap.
  const items = capItems(sanitizeItems({ items: r.items, rounds: 0 }).items, r.items);

  const stops: Record<string, StopRecord> = {};
  if (r.stops && typeof r.stops === "object") {
    let n = 0;
    for (const [id, s] of Object.entries(r.stops as Record<string, unknown>)) {
      if (n >= MAX_PATH_STOPS || id.length === 0 || id.length > 32) continue;
      if (!s || typeof s !== "object") continue;
      const { n: done, c, t, at } = s as Record<string, unknown>;
      if (![done, c, t, at].every(isCount) || (c as number) > (t as number)) continue;
      stops[id] = { n: done as number, c: c as number, t: t as number, at: at as number };
      n++;
    }
  }

  let checkpoint: CheckpointResult | null = null;
  if (r.checkpoint && typeof r.checkpoint === "object") {
    const cp = r.checkpoint as Record<string, unknown>;
    const domains = Array.isArray(cp.domains)
      ? cp.domains.flatMap((d) => {
          if (!d || typeof d !== "object") return [];
          const { number, correct, total } = d as Record<string, unknown>;
          if (typeof number !== "string" || number.length > 8) return [];
          if (!isCount(correct) || !isCount(total) || correct > total) return [];
          return [{ number, correct, total }];
        })
      : [];
    if (isCount(cp.score) && (cp.score as number) <= 100 && isCount(cp.at)) {
      checkpoint = { score: cp.score as number, at: cp.at as number, domains: domains.slice(0, 12) };
    }
  }

  let goal: PathGoal | null = null;
  if (r.goal && typeof r.goal === "object") {
    const g = r.goal as Record<string, unknown>;
    if (isCount(g.at)) {
      goal = {
        examDate: isIsoDate(g.examDate) ? g.examDate : null,
        target: isIsoDate(g.target) ? g.target : null,
        minutes: isCount(g.minutes) && (g.minutes as number) <= 600 ? (g.minutes as number) : null,
        at: g.at as number,
      };
    }
  }

  return { items, stops, checkpoint, goal };
}

/**
 * The drills' sanitizer caps at its own item limit; the path allows more.
 * Re-run the same per-item checks past that cap.
 */
function capItems(first: ItemMap, raw: unknown): ItemMap {
  if (!raw || typeof raw !== "object") return first;
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length <= Object.keys(first).length) return first;
  const out: ItemMap = { ...first };
  let n = Object.keys(out).length;
  for (const [id, rec] of entries) {
    if (n >= MAX_PATH_ITEMS) break;
    if (out[id] || id.length === 0 || id.length > 64) continue;
    const clean = sanitizeItems({ items: { [id]: rec }, rounds: 0 }).items[id];
    if (clean) {
      out[id] = clean;
      n++;
    }
  }
  return out;
}
