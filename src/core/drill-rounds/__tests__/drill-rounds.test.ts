import { describe, expect, it } from "vitest";
import {
  countStatuses,
  EMPTY_PROGRESS,
  itemStatus,
  mergeProgress,
  planRound,
  recordAnswer,
  sanitizeProgress,
  skillStatus,
  weakestSkill,
  type ItemMap,
} from "@/core/drill-rounds/drill-rounds";

/** Deterministic rng so shuffles are reproducible. */
function seeded(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe("recordAnswer", () => {
  it("counts attempts, correct and the running streak", () => {
    let items: ItemMap = {};
    items = recordAnswer(items, "443", true, 1);
    items = recordAnswer(items, "443", true, 2);
    expect(items["443"]).toEqual({ a: 2, c: 2, s: 2, t: 2 });
    items = recordAnswer(items, "443", false, 3);
    expect(items["443"]).toEqual({ a: 3, c: 2, s: 0, t: 3 });
  });

  it("does not mutate the input map", () => {
    const items: ItemMap = {};
    recordAnswer(items, "22", true, 1);
    expect(items).toEqual({});
  });
});

describe("statuses", () => {
  it("reads a fact by its last answer", () => {
    expect(itemStatus(undefined)).toBe("new");
    expect(itemStatus({ a: 3, c: 2, s: 0, t: 1 })).toBe("missed");
    expect(itemStatus({ a: 3, c: 1, s: 1, t: 1 })).toBe("got");
  });

  it("reads a skill by overall accuracy, so one slip doesn't flip it", () => {
    expect(skillStatus({ a: 10, c: 9, s: 0, t: 1 })).toBe("got");
    expect(skillStatus({ a: 10, c: 7, s: 3, t: 1 })).toBe("missed");
    expect(skillStatus(undefined)).toBe("new");
  });

  it("counts every id, including ones never answered", () => {
    const items: ItemMap = {
      a: { a: 1, c: 1, s: 1, t: 1 },
      b: { a: 1, c: 0, s: 0, t: 1 },
    };
    expect(countStatuses(["a", "b", "c", "d"], items)).toEqual({ got: 1, missed: 1, new: 2 });
  });
});

describe("mergeProgress", () => {
  it("keeps the record with more attempts, the later one on a tie", () => {
    const device = {
      items: {
        x: { a: 5, c: 4, s: 2, t: 10 },
        y: { a: 1, c: 1, s: 1, t: 50 },
        z: { a: 2, c: 0, s: 0, t: 5 },
      },
      rounds: 1,
    };
    const account = {
      items: {
        x: { a: 2, c: 2, s: 2, t: 99 },
        y: { a: 1, c: 0, s: 0, t: 60 },
        w: { a: 3, c: 3, s: 3, t: 7 },
      },
      rounds: 4,
    };
    const merged = mergeProgress(device, account);
    expect(merged.items.x).toEqual(device.items.x);
    expect(merged.items.y).toEqual(account.items.y);
    expect(merged.items.z).toEqual(device.items.z);
    expect(merged.items.w).toEqual(account.items.w);
    expect(merged.rounds).toBe(4);
  });

  it("is a no-op against empty progress", () => {
    const p = { items: { a: { a: 1, c: 1, s: 1, t: 1 } }, rounds: 2 };
    expect(mergeProgress(p, EMPTY_PROGRESS)).toEqual(p);
    expect(mergeProgress(EMPTY_PROGRESS, p)).toEqual(p);
  });
});

describe("planRound", () => {
  const ids = Array.from({ length: 35 }, (_, i) => String(i));

  it("fills a first round with distinct, unseen items", () => {
    const q = planRound(ids, {}, 20, seeded());
    expect(q).toHaveLength(20);
    expect(new Set(q).size).toBe(20);
  });

  it("asks misses first (oldest first), then unseen, then known items", () => {
    const items: ItemMap = {
      "3": { a: 1, c: 0, s: 0, t: 30 },
      "1": { a: 1, c: 0, s: 0, t: 10 },
      "2": { a: 2, c: 2, s: 2, t: 5 },
    };
    const q = planRound(["1", "2", "3", "4", "5"], items, 5, seeded());
    expect(q.slice(0, 2)).toEqual(["1", "3"]);
    expect(new Set(q.slice(2, 4))).toEqual(new Set(["4", "5"]));
    expect(q[4]).toBe("2");
  });

  it("puts the weakest known items before the strongest", () => {
    const items: ItemMap = {
      a: { a: 4, c: 4, s: 4, t: 1 },
      b: { a: 1, c: 1, s: 1, t: 9 },
    };
    expect(planRound(["a", "b"], items, 2, seeded())).toEqual(["b", "a"]);
  });

  it("wraps around a deck smaller than the round", () => {
    const q = planRound(["a", "b", "c"], {}, 7, seeded());
    expect(q).toHaveLength(7);
    expect(q.slice(3, 6)).toEqual(q.slice(0, 3));
  });

  it("returns nothing for an empty deck", () => {
    expect(planRound([], {}, 20)).toEqual([]);
  });
});

describe("sanitizeProgress", () => {
  it("keeps well-formed records and drops the rest", () => {
    const out = sanitizeProgress({
      items: {
        good: { a: 2, c: 1, s: 1, t: 5 },
        negative: { a: -1, c: 0, s: 0, t: 0 },
        moreCorrectThanAsked: { a: 1, c: 2, s: 0, t: 0 },
        fractional: { a: 1.5, c: 1, s: 1, t: 0 },
        notAnObject: 7,
        ["x".repeat(65)]: { a: 1, c: 1, s: 1, t: 1 },
      },
      rounds: 3,
    });
    expect(out).toEqual({ items: { good: { a: 2, c: 1, s: 1, t: 5 } }, rounds: 3 });
  });

  it("returns empty progress for junk", () => {
    expect(sanitizeProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(sanitizeProgress("nope")).toEqual(EMPTY_PROGRESS);
    expect(sanitizeProgress({ items: [], rounds: -2 })).toEqual(EMPTY_PROGRESS);
  });
});

describe("weakestSkill", () => {
  const ids = ["binary", "network-id", "host-math"];

  it("picks the least accurate skill below the bar", () => {
    const items: ItemMap = {
      binary: { a: 10, c: 6, s: 0, t: 1 },
      "network-id": { a: 10, c: 3, s: 1, t: 1 },
      "host-math": { a: 10, c: 10, s: 10, t: 1 },
    };
    expect(weakestSkill(ids, items)).toBe("network-id");
  });

  it("moves on to an untried skill once the tried ones are solid", () => {
    const items: ItemMap = { binary: { a: 5, c: 5, s: 5, t: 1 } };
    expect(weakestSkill(ids, items)).toBe("network-id");
  });

  it("falls back to the least accurate when every skill is solid", () => {
    const items: ItemMap = {
      binary: { a: 10, c: 10, s: 10, t: 1 },
      "network-id": { a: 10, c: 8, s: 2, t: 1 },
      "host-math": { a: 10, c: 9, s: 3, t: 1 },
    };
    expect(weakestSkill(ids, items)).toBe("network-id");
  });

  it("returns null with no skills", () => {
    expect(weakestSkill([], {})).toBeNull();
  });
});
