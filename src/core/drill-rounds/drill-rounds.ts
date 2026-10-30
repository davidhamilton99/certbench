/**
 * Rounds + progress for the free public drills (ports, acronyms, subnetting).
 *
 * A drill is played in fixed-size rounds. The first round is free for
 * anyone; continuing needs a free account, which saves the visitor's progress
 * map and builds every later round from what they missed. Pure — shared by the
 * client hook and the progress API, so a merge means the same thing on both.
 */

export const DRILL_TOOLS = ["ports", "acronyms", "subnetting"] as const;
export type DrillTool = (typeof DRILL_TOOLS)[number];

/** Questions per round. */
export const ROUND_SIZE = 20;

/** Caps that keep a stored progress blob small and well-formed. */
export const MAX_ITEMS = 1000;
export const MAX_ITEM_ID = 64;

/**
 * One drilled fact (a port, an acronym) or skill (a subnetting mode).
 * Short keys: this is stored per item, per user.
 *   a — attempts, c — correct, s — consecutive correct, t — last answered (ms)
 * A type alias, not an interface, so it stays assignable to a jsonb column.
 */
export type ItemRecord = {
  a: number;
  c: number;
  s: number;
  t: number;
};

export type ItemMap = Record<string, ItemRecord>;

export interface DrillProgress {
  items: ItemMap;
  /** Rounds completed. */
  rounds: number;
}

export const EMPTY_PROGRESS: DrillProgress = { items: {}, rounds: 0 };

export type ItemStatus = "new" | "missed" | "got";

/** Status of a single fact: what happened the last time it was asked. */
export function itemStatus(record: ItemRecord | undefined): ItemStatus {
  if (!record || record.a === 0) return "new";
  return record.s > 0 ? "got" : "missed";
}

/**
 * Status of a skill (subnetting), which is answered many times with fresh
 * numbers: judged on overall accuracy, so one slip doesn't flip a solid skill.
 */
export function skillStatus(record: ItemRecord | undefined): ItemStatus {
  if (!record || record.a === 0) return "new";
  return record.c / record.a >= 0.8 ? "got" : "missed";
}

export function recordAnswer(
  items: ItemMap,
  id: string,
  correct: boolean,
  now: number
): ItemMap {
  const prev = items[id] ?? { a: 0, c: 0, s: 0, t: 0 };
  return {
    ...items,
    [id]: {
      a: prev.a + 1,
      c: prev.c + (correct ? 1 : 0),
      s: correct ? prev.s + 1 : 0,
      t: now,
    },
  };
}

/**
 * Combine two snapshots of the same person's progress (this device + their
 * account, or two devices). Per item, keep the record with more attempts —
 * it has seen everything the other has — and the later one on a tie.
 */
export function mergeProgress(a: DrillProgress, b: DrillProgress): DrillProgress {
  const items: ItemMap = { ...a.items };
  for (const [id, rb] of Object.entries(b.items)) {
    const ra = items[id];
    if (!ra || rb.a > ra.a || (rb.a === ra.a && rb.t > ra.t)) items[id] = rb;
  }
  return { items, rounds: Math.max(a.rounds, b.rounds) };
}

function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The order a round asks its items in: misses first (longest-ago first), then
 * items never seen (shuffled), then known items, weakest and stalest first.
 * A deck smaller than the round wraps around in the same order.
 */
export function planRound(
  ids: readonly string[],
  items: ItemMap,
  size: number = ROUND_SIZE,
  rng: () => number = Math.random
): string[] {
  if (ids.length === 0) return [];
  const missed: string[] = [];
  const fresh: string[] = [];
  const known: string[] = [];
  for (const id of ids) {
    const status = itemStatus(items[id]);
    if (status === "missed") missed.push(id);
    else if (status === "new") fresh.push(id);
    else known.push(id);
  }
  missed.sort((x, y) => items[x].t - items[y].t);
  known.sort((x, y) => items[x].s - items[y].s || items[x].t - items[y].t);
  const order = [...missed, ...shuffle(fresh, rng), ...known];
  const queue: string[] = [];
  for (let i = 0; queue.length < size; i++) queue.push(order[i % order.length]);
  return queue;
}

export interface StatusCounts {
  got: number;
  missed: number;
  new: number;
}

export function countStatuses(
  ids: readonly string[],
  items: ItemMap,
  statusOf: (r: ItemRecord | undefined) => ItemStatus = itemStatus
): StatusCounts {
  const counts: StatusCounts = { got: 0, missed: 0, new: 0 };
  for (const id of ids) counts[statusOf(items[id])]++;
  return counts;
}

/**
 * Parse a stored progress blob defensively — it comes from localStorage or a
 * jsonb column, so anything malformed is dropped rather than trusted.
 */
export function sanitizeProgress(raw: unknown): DrillProgress {
  if (!raw || typeof raw !== "object") return EMPTY_PROGRESS;
  const { items, rounds } = raw as { items?: unknown; rounds?: unknown };
  const clean: ItemMap = {};
  if (items && typeof items === "object") {
    let n = 0;
    for (const [id, r] of Object.entries(items as Record<string, unknown>)) {
      if (n >= MAX_ITEMS || id.length === 0 || id.length > MAX_ITEM_ID) continue;
      if (!r || typeof r !== "object") continue;
      const { a, c, s, t } = r as Record<string, unknown>;
      if (![a, c, s, t].every((v) => Number.isSafeInteger(v) && (v as number) >= 0)) continue;
      if ((c as number) > (a as number) || (s as number) > (a as number)) continue;
      clean[id] = { a: a as number, c: c as number, s: s as number, t: t as number };
      n++;
    }
  }
  return {
    items: clean,
    rounds: Number.isSafeInteger(rounds) && (rounds as number) >= 0 ? (rounds as number) : 0,
  };
}

/**
 * The skill a skill drill should open the next round on: the least accurate
 * one that's below the bar, else one not tried yet, else the least accurate.
 */
export function weakestSkill(ids: readonly string[], items: ItemMap): string | null {
  if (ids.length === 0) return null;
  const accuracy = (id: string) => items[id].c / items[id].a;
  const tried = ids.filter((id) => items[id]?.a > 0);
  const byAccuracy = [...tried].sort((x, y) => accuracy(x) - accuracy(y) || items[x].a - items[y].a);
  const struggling = byAccuracy.filter((id) => skillStatus(items[id]) === "missed");
  return struggling[0] ?? ids.find((id) => !tried.includes(id)) ?? byAccuracy[0];
}
