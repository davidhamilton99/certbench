import { describe, expect, it } from "vitest";
import { buildPlan, isFreeStop, stopAt } from "../plan";
import { finishStop, mergePathProgress, nextStopIndex, sanitizePathProgress } from "../progress";
import {
  addRehearsal,
  clock,
  keepRehearsals,
  latestReading,
  MAX_REHEARSALS,
  REHEARSAL_FORMATS,
  scoreRehearsal,
} from "../rehearsal";
import { pathProgressSchema } from "@/contracts/path";
import { EMPTY_PATH_PROGRESS, type PathStructure, type RehearsalResult } from "../types";

const structure = (sizes: number[], weights?: number[]): PathStructure => ({
  certSlug: "test-exam",
  examName: "Test+",
  examCode: "T0-001",
  domains: sizes.map((n, d) => ({
    number: `${d + 1}.0`,
    title: `Domain ${d + 1}`,
    weight: weights?.[d] ?? 20,
    objectives: Array.from({ length: n }, (_, i) => ({ code: `${d + 1}.${i + 1}`, title: `Obj ${d + 1}.${i + 1}` })),
    lab: { id: `lab-${d + 1}`, title: `Lab ${d + 1}`, minutes: 6 },
  })),
});

const result = (score: number, at: number, extra?: Partial<RehearsalResult>): RehearsalResult => ({
  score,
  at,
  domains: [{ number: "1.0", correct: 5, total: 9 }],
  size: "full",
  answered: 88,
  total: 90,
  seconds: 4200,
  ...extra,
});

describe("the rehearsal on the plan", () => {
  it("ends every path, after the last domain's lab, and never in the free stretch", () => {
    const s = structure([4, 5, 4, 9, 6]);
    const plan = buildPlan(s);
    const last = plan.stops.at(-1)!;
    expect(last).toMatchObject({ id: "rehearsal", kind: "rehearsal", title: "Exam rehearsal", domain: null });
    expect(plan.stops.at(-2)?.id).toBe("lab5");
    expect(last.objectives).toHaveLength(28);
    expect(isFreeStop(plan, last.index)).toBe(false);
    // Past it, review rounds as before.
    expect(stopAt(plan, s, plan.stops.length)?.kind).toBe("review");
  });

  it("comes up once every other stop is done, and the path goes on to review after it", () => {
    const plan = buildPlan(structure([4, 5]));
    let progress = EMPTY_PATH_PROGRESS;
    for (const stop of plan.stops.slice(0, -1)) progress = finishStop(progress, stop.id, 3, 3, 1);
    expect(plan.stops[nextStopIndex(plan, progress)].kind).toBe("rehearsal");
    progress = finishStop(progress, "rehearsal", 70, 90, 2);
    expect(nextStopIndex(plan, progress)).toBe(plan.stops.length);
  });
});

describe("scoring a rehearsal", () => {
  const domains = structure([2, 2], [25, 75]).domains;

  it("counts a blank as wrong and weights domains like the exam", () => {
    const answers = [
      { domain: "1.0", correct: true },
      { domain: "1.0", correct: true },
      { domain: "2.0", correct: true },
      { domain: "2.0", correct: false }, // answered wrong
      { domain: "2.0", correct: false }, // left blank
      { domain: "2.0", correct: true },
    ];
    const r = scoreRehearsal(answers, domains, { size: "half", answered: 5, seconds: 1500, at: 9 });
    // Domain 1 at 100% (25% of the exam), domain 2 at 50% (75%): 62.5, rounded.
    expect(r.score).toBe(63);
    expect(r).toMatchObject({ size: "half", answered: 5, total: 6, seconds: 1500, at: 9 });
    expect(r.domains).toEqual([
      { number: "1.0", correct: 2, total: 2 },
      { number: "2.0", correct: 2, total: 4 },
    ]);
  });

  it("is the real exam's length at full size, and half of it at half", () => {
    expect(REHEARSAL_FORMATS.full).toEqual({ questions: 90, minutes: 90 });
    expect(REHEARSAL_FORMATS.half).toEqual({ questions: 45, minutes: 45 });
  });
});

describe("rehearsals kept with progress", () => {
  it("reads the latest of the checkpoint and the rehearsals", () => {
    const checkpoint = { score: 58, at: 10, domains: [] };
    expect(latestReading(EMPTY_PATH_PROGRESS)).toBeNull();
    expect(latestReading({ checkpoint, rehearsals: [] })).toEqual({ score: 58, at: 10, source: "checkpoint" });
    expect(latestReading({ checkpoint, rehearsals: [result(71, 20)] })).toEqual({
      score: 71,
      at: 20,
      source: "rehearsal",
    });
    // A checkpoint retaken after the rehearsal is the newer reading.
    expect(latestReading({ checkpoint: { ...checkpoint, at: 30 }, rehearsals: [result(71, 20)] })?.source).toBe(
      "checkpoint"
    );
  });

  it("keeps each run once, oldest first, and only the newest few", () => {
    const many = Array.from({ length: MAX_REHEARSALS + 5 }, (_, i) => result(50 + i, 100 - i));
    const kept = keepRehearsals([...many, many[0]]);
    expect(kept).toHaveLength(MAX_REHEARSALS);
    expect(kept.map((r) => r.at)).toEqual([...kept.map((r) => r.at)].sort((a, b) => a - b));
    expect(kept.at(-1)?.at).toBe(100);
    expect(addRehearsal(EMPTY_PATH_PROGRESS, result(66, 5)).rehearsals).toEqual([result(66, 5)]);
  });

  it("merges every run from two devices", () => {
    const a = addRehearsal(EMPTY_PATH_PROGRESS, result(60, 1));
    const b = addRehearsal(addRehearsal(EMPTY_PATH_PROGRESS, result(60, 1)), result(72, 2));
    expect(mergePathProgress(a, b).rehearsals.map((r) => r.score)).toEqual([60, 72]);
    expect(mergePathProgress(b, a).rehearsals.map((r) => r.score)).toEqual([60, 72]);
  });

  it("sanitizes stored rehearsals, and reads progress saved before they existed", () => {
    const clean = sanitizePathProgress({
      items: {},
      stops: {},
      rehearsals: [
        result(70, 3),
        { ...result(70, 4), size: "quarter" },
        { ...result(70, 5), answered: 91 },
        { ...result(170, 6) },
        "junk",
      ],
    });
    expect(clean.rehearsals).toEqual([result(70, 3)]);
    expect(sanitizePathProgress({ items: {}, stops: {}, checkpoint: null, goal: null }).rehearsals).toEqual([]);
    // The API takes an older client's save, with no rehearsals at all.
    const parsed = pathProgressSchema.parse({ items: {}, stops: {}, checkpoint: null, goal: null });
    expect(parsed.rehearsals).toEqual([]);
  });
});

describe("the clock", () => {
  it("shows hours only when there are some, and rounds up to the second", () => {
    expect(clock(90 * 60_000)).toBe("1:30:00");
    expect(clock(9 * 60_000 + 3_000)).toBe("9:03");
    expect(clock(6_200)).toBe("0:07");
    expect(clock(-5)).toBe("0:00");
  });
});
