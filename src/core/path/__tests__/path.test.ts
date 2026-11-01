import { describe, expect, it } from "vitest";
import { buildPlan, isFreeStop, LEARN_BEFORE_CHECKPOINT, stopAt } from "../plan";
import {
  finishStop,
  mergePathProgress,
  missedIds,
  nextStopIndex,
  objectiveStatuses,
  recordRep,
  retireReps,
  sanitizePathProgress,
  seenIds,
  stopsDone,
} from "../progress";
import { allocate, composeStop, seededRng, shuffleOptions } from "../compose";
import { authoredRepId, bankRepId, parseRepId, questionIdOf, recallRepId } from "../rep-id";
import { repairText, splitExplanation } from "../text";
import { biggestOpportunity, daysUntil, projectFinish, scoreCheckpoint, stopsPerDay } from "../checkpoint";
import { EMPTY_PATH_PROGRESS, type ChoiceRep, type PathStructure, type Rep } from "../types";

const structure = (sizes: number[]): PathStructure => ({
  certSlug: "test-exam",
  examName: "Test+",
  examCode: "T0-001",
  domains: sizes.map((n, d) => ({
    number: `${d + 1}.0`,
    title: `Domain ${d + 1}`,
    weight: 20,
    objectives: Array.from({ length: n }, (_, i) => ({ code: `${d + 1}.${i + 1}`, title: `Obj ${d + 1}.${i + 1}` })),
  })),
});

const rep = (id: string, objective = "1.1"): ChoiceRep => ({
  id,
  type: "choice",
  label: "Quick scenario",
  tier: "quick",
  objective,
  prompt: id,
  options: ["a", "b", "c", "d"],
  answer: 0,
  takeaway: "t",
});

describe("buildPlan", () => {
  it("puts the checkpoint after the warm-up and four learn stops, before the domain's practice stop", () => {
    // Security+ shape: domain 1 has exactly four objectives.
    const plan = buildPlan(structure([4, 5, 4, 9, 6]));
    expect(plan.stops.slice(0, 7).map((s) => s.id)).toEqual([
      "warmup", "1.1", "1.2", "1.3", "1.4", "checkpoint", "d1",
    ]);
    expect(plan.freeThrough).toBe(1 + LEARN_BEFORE_CHECKPOINT);
    expect(plan.stops[plan.freeThrough].kind).toBe("checkpoint");
  });

  it("splits a long first domain around the checkpoint", () => {
    // Network+ shape: domain 1 has eight objectives.
    const plan = buildPlan(structure([8, 4]));
    const ids = plan.stops.map((s) => s.id);
    expect(ids.indexOf("checkpoint")).toBe(5);
    expect(ids.indexOf("1.5")).toBe(6);
    expect(ids.indexOf("d1")).toBe(ids.indexOf("1.8") + 1);
    expect(ids.at(-1)).toBe("d2");
  });

  it("gives every stop a unique id and its own index", () => {
    const plan = buildPlan(structure([4, 5, 4, 9, 6]));
    expect(new Set(plan.stops.map((s) => s.id)).size).toBe(plan.stops.length);
    plan.stops.forEach((s, i) => expect(s.index).toBe(i));
    // 1 warm-up + 28 learn + 5 practice + 1 checkpoint.
    expect(plan.stops).toHaveLength(35);
  });

  it("still has a checkpoint when the exam has very few objectives", () => {
    const plan = buildPlan(structure([2]));
    expect(plan.stops.map((s) => s.id)).toEqual(["warmup", "1.1", "1.2", "d1", "checkpoint"]);
    expect(plan.freeThrough).toBe(4);
  });

  it("keeps going past the end with review rounds", () => {
    const s = structure([4, 5]);
    const plan = buildPlan(s);
    const beyond = stopAt(plan, s, plan.stops.length + 3);
    expect(beyond?.kind).toBe("review");
    expect(stopAt(plan, s, -1)).toBeNull();
    expect(isFreeStop(plan, plan.freeThrough)).toBe(true);
    expect(isFreeStop(plan, plan.freeThrough + 1)).toBe(false);
  });
});

describe("rep ids", () => {
  it("round-trips every source and stays within the stored id limit", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    expect(parseRepId(authoredRepId("1.1", "1.1a"))).toEqual({ source: "a", objective: "1.1", key: "1.1a" });
    expect(questionIdOf(bankRepId("2.4", uuid))).toBe(uuid);
    expect(bankRepId("1.10", uuid).length).toBeLessThanOrEqual(64);
    const recall = recallRepId("1.5", "net-ports", "A very long description of an attack that goes on and on");
    expect(recall.length).toBeLessThanOrEqual(64);
    expect(parseRepId(recall)?.objective).toBe("1.5");
    expect(parseRepId("nonsense")).toBeNull();
    expect(parseRepId("x|1.1|k")).toBeNull();
  });
});

describe("progress", () => {
  it("finds the next stop and counts what's done", () => {
    const plan = buildPlan(structure([4, 5]));
    let p = EMPTY_PATH_PROGRESS;
    expect(nextStopIndex(plan, p)).toBe(0);
    p = finishStop(p, "warmup", 7, 8, 1000);
    p = finishStop(p, "1.1", 6, 8, 2000);
    expect(nextStopIndex(plan, p)).toBe(2);
    expect(stopsDone(plan, p)).toBe(2);
    for (const s of plan.stops) p = finishStop(p, s.id, 8, 8, 3000);
    expect(nextStopIndex(plan, p)).toBe(plan.stops.length);
  });

  it("rolls answers up into objective statuses", () => {
    let p = EMPTY_PATH_PROGRESS;
    p = recordRep(p, authoredRepId("1.1", "a"), true, 1);
    p = recordRep(p, authoredRepId("1.1", "b"), true, 2);
    p = recordRep(p, authoredRepId("1.2", "c"), false, 3);
    p = recordRep(p, bankRepId("1.2", "q1"), true, 4);
    const status = objectiveStatuses(p.items);
    expect(status.get("1.1")).toBe("got");
    expect(status.get("1.2")).toBe("missed");
    expect(status.has("1.3")).toBe(false);
    // Answering the miss correctly later clears it.
    p = recordRep(p, authoredRepId("1.2", "c"), true, 5);
    expect(objectiveStatuses(p.items).get("1.2")).toBe("got");
  });

  it("clears a withdrawn miss so it stops marking its objective, even across a merge", () => {
    const gone = recallRepId("1.3", "net-cables", "T568B wiring");
    const missed = recordRep(EMPTY_PATH_PROGRESS, gone, false, 1);
    expect(objectiveStatuses(missed.items).get("1.3")).toBe("missed");
    const cleared = retireReps(missed, [gone, "a|9.9|never-seen"], 2);
    expect(objectiveStatuses(cleared.items).get("1.3")).toBe("got");
    expect(missedIds(cleared.items)).toEqual([]);
    expect(cleared.items["a|9.9|never-seen"]).toBeUndefined();
    // Another device's copy, saved before the clear, doesn't bring it back.
    expect(objectiveStatuses(mergePathProgress(missed, cleared).items).get("1.3")).toBe("got");
    // Nothing left to clear: the same progress comes back.
    expect(retireReps(cleared, [gone], 3)).toBe(cleared);
  });

  it("lists misses oldest first and seen reps newest first", () => {
    let p = EMPTY_PATH_PROGRESS;
    p = recordRep(p, "a|1.1|x", false, 10);
    p = recordRep(p, "a|1.1|y", true, 20);
    p = recordRep(p, "a|1.1|z", false, 5);
    expect(missedIds(p.items)).toEqual(["a|1.1|z", "a|1.1|x"]);
    expect(seenIds(p.items)).toEqual(["a|1.1|y", "a|1.1|x", "a|1.1|z"]);
  });

  it("merges two devices without losing newer work", () => {
    const a = finishStop(recordRep(EMPTY_PATH_PROGRESS, "a|1.1|x", true, 10), "warmup", 8, 8, 10);
    const b = {
      ...finishStop(finishStop(EMPTY_PATH_PROGRESS, "warmup", 5, 8, 20), "warmup", 6, 8, 30),
      checkpoint: { score: 64, at: 40, domains: [] },
      goal: { examDate: "2026-12-01", target: null, minutes: 20, at: 50 },
    };
    const merged = mergePathProgress(a, b);
    expect(merged.items["a|1.1|x"]).toBeDefined();
    expect(merged.stops.warmup.n).toBe(2);
    expect(merged.checkpoint?.score).toBe(64);
    expect(merged.goal?.examDate).toBe("2026-12-01");
    expect(mergePathProgress(b, a).stops.warmup.n).toBe(2);
  });

  it("sanitizes stored blobs, keeping good data and dropping junk", () => {
    const clean = sanitizePathProgress({
      items: { "a|1.1|x": { a: 2, c: 1, s: 0, t: 5 }, bad: { a: 1, c: 5, s: 0, t: 1 } },
      stops: { warmup: { n: 1, c: 7, t: 8, at: 9 }, broken: { n: 1, c: 9, t: 8, at: 9 } },
      checkpoint: { score: 140, at: 1, domains: [] },
      goal: { examDate: "not a date", target: "2026-12-01", minutes: 20, at: 3 },
    });
    expect(Object.keys(clean.items)).toEqual(["a|1.1|x"]);
    expect(Object.keys(clean.stops)).toEqual(["warmup"]);
    expect(clean.checkpoint).toBeNull();
    expect(clean.goal).toEqual({ examDate: null, target: "2026-12-01", minutes: 20, at: 3 });
    expect(sanitizePathProgress("garbage")).toEqual(EMPTY_PATH_PROGRESS);
  });

  it("keeps more items than the drills' cap", () => {
    const items: Record<string, unknown> = {};
    for (let i = 0; i < 1500; i++) items[`a|1.1|k${i}`] = { a: 1, c: 1, s: 1, t: i };
    expect(Object.keys(sanitizePathProgress({ items }).items)).toHaveLength(1500);
  });
});

describe("composeStop", () => {
  it("opens with misses, prefers unseen reps, and closes with an exam-style rep", () => {
    const fresh = ["f1", "f2", "f3", "f4"].map((id) => rep(id));
    const reps = composeStop(
      {
        misses: [rep("m1"), rep("m2"), rep("m3")],
        fresh,
        closers: [rep("c1"), rep("c2")],
      },
      { size: 3, maxMisses: 2, seen: new Set(["f1", "c1"]) }
    );
    expect(reps.map((r) => r.id)).toEqual(["m1", "m2", "f2", "f3", "f4", "c2"]);
  });

  it("never repeats a rep, even when a miss is also in the pool", () => {
    const reps = composeStop(
      { misses: [rep("x")], fresh: [rep("x"), rep("y")], closers: [rep("y")] },
      { size: 5, maxMisses: 2, seen: new Set() }
    );
    expect(reps.map((r) => r.id)).toEqual(["x", "y"]);
  });

  it("falls back to seen reps when the pool runs out", () => {
    const reps = composeStop(
      { misses: [], fresh: [rep("a"), rep("b")] },
      { size: 2, maxMisses: 2, seen: new Set(["a", "b"]) }
    );
    expect(reps).toHaveLength(2);
  });
});

describe("shuffleOptions", () => {
  it("keeps the answer pointing at the right option", () => {
    const original: ChoiceRep = { ...rep("s"), options: ["right", "w1", "w2", "w3"], answer: 0 };
    for (let seed = 1; seed < 30; seed++) {
      const shuffled = shuffleOptions(original, seededRng(seed));
      expect(shuffled.options[shuffled.answer]).toBe("right");
      expect([...shuffled.options].sort()).toEqual([...original.options].sort());
    }
  });

  it("is deterministic for a seed", () => {
    const a = shuffleOptions({ ...rep("s"), options: ["1", "2", "3", "4"] }, seededRng(7));
    const b = shuffleOptions({ ...rep("s"), options: ["1", "2", "3", "4"] }, seededRng(7));
    expect(a.options).toEqual(b.options);
  });
});

describe("allocate", () => {
  it("spreads slots by weight with at least one each", () => {
    const slots = allocate([12, 22, 18, 28, 20], 12);
    expect(slots.reduce((a, b) => a + b, 0)).toBe(12);
    expect(Math.min(...slots)).toBeGreaterThanOrEqual(1);
    expect(slots[3]).toBeGreaterThanOrEqual(slots[0]);
  });
});

describe("explanations", () => {
  it("drops the option-letter lead and splits off the first sentence", () => {
    const { takeaway, rest } = splitExplanation(
      "Why B is correct: A hot site is fully operational. It has current data. Failover takes minutes."
    );
    expect(takeaway).toBe("A hot site is fully operational.");
    expect(rest).toBe("It has current data. Failover takes minutes.");
  });

  it("repairs lost dashes and apostrophes", () => {
    expect(repairText("physical layer � it has")).toBe("physical layer — it has");
    expect(repairText("the user�s account")).toBe("the user’s account");
  });

  it("copes with an empty explanation", () => {
    expect(splitExplanation("")).toEqual({ takeaway: "", rest: "" });
  });
});

describe("checkpoint", () => {
  const domains = structure([2, 2]).domains.map((d, i) => ({ ...d, weight: i === 0 ? 25 : 75 }));

  it("weights accuracy by exam weight across the domains sampled", () => {
    const result = scoreCheckpoint(
      [
        { domain: "1.0", correct: true },
        { domain: "1.0", correct: true },
        { domain: "2.0", correct: false },
        { domain: "2.0", correct: true },
      ],
      domains,
      99
    );
    // 100% × 25 + 50% × 75 = 62.5 → 63
    expect(result.score).toBe(63);
    expect(result.domains).toEqual([
      { number: "1.0", correct: 2, total: 2 },
      { number: "2.0", correct: 1, total: 2 },
    ]);
    expect(biggestOpportunity(result, domains)?.number).toBe("2.0");
  });

  it("has no opportunity to point at after a perfect run", () => {
    const result = scoreCheckpoint([{ domain: "1.0", correct: true }], domains, 1);
    expect(biggestOpportunity(result, domains)).toBeNull();
  });

  it("projects a finish date from the daily time budget", () => {
    const now = Date.UTC(2026, 9, 31);
    expect(stopsPerDay(20)).toBe(5);
    expect(stopsPerDay(null)).toBe(5);
    expect(stopsPerDay(2)).toBe(1);
    expect(projectFinish(10, 20, now).toISOString().slice(0, 10)).toBe("2026-11-01");
    expect(projectFinish(1, 20, now).toISOString().slice(0, 10)).toBe("2026-10-31");
    expect(daysUntil("2026-11-10", now)).toBe(10);
  });
});

// Keep the Rep union exhaustive in one place the compiler checks.
export const _repTypes: Rep["type"][] = ["choice", "typed"];
