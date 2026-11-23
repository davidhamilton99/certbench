import { describe, expect, it } from "vitest";
import { CHECKPOINT_SIZE } from "../plan";
import { checkpointFromExam, EXAM_IMPORT_DAYS, examBelongsTo, examToImport, importExam } from "../exam-import";
import { finishStop } from "../progress";
import { EMPTY_PATH_PROGRESS, type ChoiceRep, type RehearsalResult } from "../types";

const NOW = Date.UTC(2026, 10, 21, 15);
const DAY = 86_400_000;

function rep(i: number, objective: string): ChoiceRep {
  return {
    id: `q|${objective}|0000000${i}-0000-4000-8000-000000000000`,
    type: "choice",
    label: "Exam style",
    tier: "exam",
    objective,
    prompt: `Question ${i}?`,
    options: ["A", "B", "C", "D"],
    answer: 0,
    takeaway: "",
  };
}

const result = (over: Partial<RehearsalResult> = {}): RehearsalResult => ({
  score: 64,
  at: NOW - 3_600_000,
  domains: [
    { number: "1.0", correct: 10, total: 16 },
    { number: "2.0", correct: 19, total: 29 },
  ],
  size: "half",
  answered: 45,
  total: 45,
  seconds: 2400,
  ...over,
});

const run = (picks: (number | null)[], res: RehearsalResult | null = result()) => ({
  reps: picks.map((_, i) => rep(i, i % 2 ? "2.1" : "1.1")),
  picks,
  done: res ? { result: res } : null,
});

describe("examToImport", () => {
  it("brings a recent exam with enough answered, and only the answers the path can place", () => {
    const r = run([0, 1, null, 0]);
    // A page's own question, not one the path knows: its answer stays behind.
    r.reps[3] = { ...r.reps[3], id: "sy0801-pt-04" };
    const exam = examToImport(r, NOW);
    expect(exam?.answers).toEqual([
      { repId: r.reps[0].id, correct: true },
      { repId: r.reps[1].id, correct: false },
    ]);
    expect(exam?.result.score).toBe(64);
  });

  it("leaves an exam too thin to read readiness from, too old, or not finished", () => {
    expect(examToImport(run([0, 0], result({ answered: CHECKPOINT_SIZE - 1 })), NOW)).toBeNull();
    expect(examToImport(run([0, 0], result({ at: NOW - (EXAM_IMPORT_DAYS + 1) * DAY })), NOW)).toBeNull();
    expect(examToImport(run([0, 0], null), NOW)).toBeNull();
  });

  it("on a shared computer, never brings one account's exam into another account", () => {
    const mine = { ...run([0, 1, 0, 0]), claimedBy: "account-a" };
    // The account its score was shown to may bring it over; the next person to sign in may not.
    expect(examToImport(mine, NOW, "account-a")?.result.score).toBe(64);
    expect(examToImport(mine, NOW, "account-b")).toBeNull();
    expect(examBelongsTo(mine, "account-a")).toBe(true);
    expect(examBelongsTo(mine, "account-b")).toBe(false);
    // An exam nobody has claimed yet (finished signed out, the score not yet shown) goes to whoever asks.
    const unclaimedRuns: Parameters<typeof examToImport>[0][] = [run([0, 1]), { ...run([0, 1]), claimedBy: null }];
    for (const unclaimed of unclaimedRuns) {
      expect(examBelongsTo(unclaimed, "account-b")).toBe(true);
      expect(examToImport(unclaimed, NOW, "account-b")).not.toBeNull();
    }
  });

  it("does not take a stored result on trust: one with a figure out of range is left behind", () => {
    const bad = [
      result({ score: 164 }),
      result({ answered: 46 }),
      result({ domains: [{ number: "1.0", correct: 17, total: 16 }] }),
      { ...result(), size: "double" },
      { ...result(), domains: undefined },
    ] as RehearsalResult[];
    for (const res of bad) expect(examToImport(run([0, 0], res), NOW)).toBeNull();
  });
});

describe("importExam", () => {
  it("makes the exam the checkpoint when there is none yet, and keeps it with the practice exams", () => {
    const res = result();
    const { progress, asCheckpoint } = importExam(EMPTY_PATH_PROGRESS, [{ repId: "q|1.1|x", correct: false }], res);
    expect(asCheckpoint).toBe(true);
    expect(progress.checkpoint).toEqual({ score: 64, at: res.at, domains: res.domains });
    expect(progress.stops.checkpoint).toMatchObject({ c: 29, t: 45 });
    expect(progress.rehearsals).toEqual([res]);
    // Its miss is on the path now, to come back in a later stop.
    expect(progress.items["q|1.1|x"]).toBeDefined();
    expect(checkpointFromExam(progress)).toBe(true);
  });

  it("never replaces a checkpoint already taken, and brings the same exam once", () => {
    const taken = {
      ...finishStop(EMPTY_PATH_PROGRESS, "checkpoint", 9, 12, 1),
      checkpoint: { score: 70, at: 1, domains: [] },
    };
    const once = importExam(taken, [], result());
    expect(once.asCheckpoint).toBe(false);
    expect(once.progress.checkpoint).toEqual(taken.checkpoint);
    expect(once.progress.rehearsals).toHaveLength(1);
    expect(checkpointFromExam(once.progress)).toBe(false);
    expect(importExam(once.progress, [], result()).progress).toBe(once.progress);
  });
});
