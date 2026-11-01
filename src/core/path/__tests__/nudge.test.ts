import { describe, expect, it } from "vitest";
import { buildPlan } from "../plan";
import { finishStop, recordRep } from "../progress";
import { NUDGE_MAX_HOURS, NUDGE_MIN_HOURS, pathNudge, pathStanding } from "../nudge";
import { EMPTY_PATH_PROGRESS, type PathProgress, type PathStructure } from "../types";

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

// Security+ shape: warm-up, 1.1–1.4, checkpoint (index 5), d1, 2.1, ...
const plan = buildPlan(structure([4, 5, 4, 9, 6]));
const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 2, 14);
const DAYS_AGO_3 = NOW - 72 * HOUR;

const played = (...stops: string[]): PathProgress =>
  stops.reduce(
    (p, id) => finishStop(recordRep(p, `a|x|${id}`, true, 0), id, 7, 8, 0),
    EMPTY_PATH_PROGRESS
  );

describe("pathNudge", () => {
  it("names the next stop and how far away the checkpoint is", () => {
    expect(pathNudge(plan, played("warmup", "1.1"), DAYS_AGO_3, NOW)).toEqual({
      done: 2,
      total: plan.stops.length,
      freeLeft: 4,
      next: { title: "Obj 1.2", kind: "learn" },
      toCheckpoint: 3,
      stretch: [
        { kind: "warmup", done: true },
        { kind: "learn", done: true },
        { kind: "learn", done: false },
        { kind: "learn", done: false },
        { kind: "learn", done: false },
        { kind: "checkpoint", done: false },
      ],
    });
  });

  it("points at the checkpoint itself once every stop before it is done", () => {
    const nudge = pathNudge(plan, played("warmup", "1.1", "1.2", "1.3", "1.4"), DAYS_AGO_3, NOW);
    expect(nudge?.next).toEqual({ title: "Readiness checkpoint", kind: "checkpoint" });
    expect(nudge?.toCheckpoint).toBe(0);
  });

  it("starts from the first stop not played, even when a later one was", () => {
    const nudge = pathNudge(plan, played("warmup", "1.1", "1.3"), DAYS_AGO_3, NOW);
    expect(nudge?.next.title).toBe("Obj 1.2");
    expect(nudge?.toCheckpoint).toBe(2);
  });

  it("waits two days, and lets it go after a week", () => {
    const progress = played("warmup", "1.1");
    const at = (hours: number) => pathNudge(plan, progress, NOW - hours * HOUR, NOW);
    expect(at(NUDGE_MIN_HOURS - 1)).toBeNull();
    expect(at(NUDGE_MIN_HOURS)).not.toBeNull();
    expect(at(NUDGE_MAX_HOURS)).not.toBeNull();
    expect(at(NUDGE_MAX_HOURS + 1)).toBeNull();
  });

  it("is never for someone who hasn't started, or who has reached the checkpoint", () => {
    expect(pathNudge(plan, EMPTY_PATH_PROGRESS, DAYS_AGO_3, NOW)).toBeNull();
    const reached = played("warmup", "1.1", "1.2", "1.3", "1.4", "checkpoint");
    expect(pathNudge(plan, reached, DAYS_AGO_3, NOW)).toBeNull();
  });

  it("counts a half-played warm-up as started", () => {
    const progress = recordRep(EMPTY_PATH_PROGRESS, "a|4.5|w1", true, 0);
    expect(pathNudge(plan, progress, DAYS_AGO_3, NOW)).toMatchObject({
      done: 0,
      next: { title: "Warm-up", kind: "warmup" },
      toCheckpoint: 5,
    });
  });
});

describe("pathStanding", () => {
  it("counts the free stops left, the checkpoint included", () => {
    expect(pathStanding(plan, EMPTY_PATH_PROGRESS)).toEqual({
      done: 0,
      total: plan.stops.length,
      freeLeft: plan.freeThrough + 1,
    });
    const free = played("warmup", "1.1", "1.2", "1.3", "1.4", "checkpoint");
    expect(pathStanding(plan, free)).toMatchObject({ done: 6, freeLeft: 0 });
  });
});
