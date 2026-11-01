import { describe, expect, it } from "vitest";
import { buildPlan } from "../plan";
import { finishStop, recordRep } from "../progress";
import { checkpointFollowUp, FOLLOW_UP_MAX_HOURS, FOLLOW_UP_MIN_HOURS } from "../follow-up";
import { EMPTY_PATH_PROGRESS, type CheckpointResult, type PathProgress, type PathStructure } from "../types";

const structure: PathStructure = {
  certSlug: "test-exam",
  examName: "Test+",
  examCode: "T0-001",
  domains: [4, 5, 4].map((n, d) => ({
    number: `${d + 1}.0`,
    title: `Domain ${d + 1}`,
    weight: [30, 50, 20][d],
    objectives: Array.from({ length: n }, (_, i) => ({ code: `${d + 1}.${i + 1}`, title: `Obj ${d + 1}.${i + 1}` })),
  })),
};
const plan = buildPlan(structure);
const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 2, 14);

/** Played through the checkpoint, taken `hoursAgo`. */
function tookCheckpoint(hoursAgo: number, domains: CheckpointResult["domains"]): PathProgress {
  const free = plan.stops.slice(0, plan.freeThrough + 1).map((s) => s.id);
  const played = free.reduce(
    (p, id) => finishStop(recordRep(p, `a|x|${id}`, true, 0), id, 7, 8, 0),
    EMPTY_PATH_PROGRESS
  );
  return { ...played, checkpoint: { score: 64, at: NOW - hoursAgo * HOUR, domains } };
}

const mixed = [
  { number: "1.0", correct: 3, total: 3 },
  { number: "2.0", correct: 2, total: 5 },
  { number: "3.0", correct: 1, total: 2 },
];

describe("checkpointFollowUp", () => {
  it("follows up a day after the checkpoint with the result, what's left, and the biggest gain", () => {
    const progress = tookCheckpoint(30, mixed);
    const followUp = checkpointFollowUp(plan, structure.domains, progress, NOW - 30 * HOUR, NOW);
    expect(followUp).toEqual({
      result: progress.checkpoint,
      remaining: plan.stops.length - (plan.freeThrough + 1),
      // 2/5 is the lowest accuracy.
      opportunity: structure.domains[1],
    });
  });

  it("waits until they've had a day with it, and gives up after a week", () => {
    const at = (h: number) => checkpointFollowUp(plan, structure.domains, tookCheckpoint(h, mixed), NOW - h * HOUR, NOW);
    expect(at(FOLLOW_UP_MIN_HOURS - 1)).toBeNull();
    expect(at(FOLLOW_UP_MIN_HOURS)).not.toBeNull();
    expect(at(FOLLOW_UP_MAX_HOURS)).not.toBeNull();
    expect(at(FOLLOW_UP_MAX_HOURS + 1)).toBeNull();
  });

  it("holds off while they're still active on the path", () => {
    expect(checkpointFollowUp(plan, structure.domains, tookCheckpoint(48, mixed), NOW - 3 * HOUR, NOW)).toBeNull();
  });

  it("needs a checkpoint result", () => {
    const free = plan.stops.slice(0, plan.freeThrough).map((s) => s.id);
    const before = free.reduce((p, id) => finishStop(p, id, 7, 8, 0), EMPTY_PATH_PROGRESS);
    expect(checkpointFollowUp(plan, structure.domains, before, NOW - 48 * HOUR, NOW)).toBeNull();
  });

  it("names no opportunity after a perfect checkpoint", () => {
    const perfect = mixed.map((d) => ({ ...d, correct: d.total }));
    const followUp = checkpointFollowUp(plan, structure.domains, tookCheckpoint(30, perfect), NOW - 30 * HOUR, NOW);
    expect(followUp?.opportunity).toBeNull();
  });
});
