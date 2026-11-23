// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRun,
  readRun,
  rehearsalQuestionsIdKey,
  rehearsalQuestionsKey,
  writeRun,
  type RehearsalRun,
} from "../rehearsal-run";
import { pathRehearsalKey } from "../storage-key";
import type { ChoiceRep, RehearsalResult } from "@/core/path/types";

// A plain in-memory Storage that counts what is written under each key, so the
// tests can tell a write of the questions from a write of the answers.
const store = new Map<string, string>();
const writes: string[] = [];
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      writes.push(k);
      store.set(k, String(v));
    },
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

const CERT = "security-plus-sy0-701";
const RUN_KEY = pathRehearsalKey(CERT);
const QUESTIONS_KEY = rehearsalQuestionsKey(CERT);
const ID_KEY = rehearsalQuestionsIdKey(CERT);

const rep = (n: number): ChoiceRep => ({
  id: `q|1.${n}|00000000-0000-4000-8000-00000000000${n}`,
  type: "choice",
  label: "Exam style",
  tier: "exam",
  objective: `1.${n}`,
  prompt: `Question text ${n}, with an explanation long enough to matter.`,
  options: ["Right answer", "Wrong one", "Wrong two", "Wrong three"],
  answer: 0,
  takeaway: `Takeaway ${n}`,
  explanation: `Explanation ${n}`,
  lettered: true,
});

const makeRun = (extra?: Partial<RehearsalRun>): RehearsalRun => ({
  v: 1,
  owner: "u1",
  claimedBy: null,
  size: "half",
  asStop: false,
  reps: [rep(1), rep(2), rep(3)],
  picks: [null, null, null],
  flagged: [],
  i: 0,
  spentMs: 0,
  limitMs: 45 * 60_000,
  startedAt: 1_700_000_000_000,
  done: null,
  ...extra,
});

const result = (extra?: Partial<RehearsalResult>): RehearsalResult => ({
  score: 67,
  at: 1_700_000_100_000,
  domains: [{ number: "1.0", correct: 2, total: 3 }],
  size: "half",
  answered: 3,
  total: 3,
  seconds: 600,
  ...extra,
});

/** Put a run into storage exactly as given, the way an older build or a hand edit would. */
function plant(run: unknown, questions?: unknown) {
  store.set(RUN_KEY, JSON.stringify(run));
  if (questions !== undefined) store.set(QUESTIONS_KEY, JSON.stringify(questions));
}

beforeEach(() => {
  clearRun(CERT);
  store.clear();
  writes.length = 0;
});

describe("a practice exam kept on the device", () => {
  it("writes the questions once and the answers often", () => {
    const run = makeRun();
    writeRun(CERT, run);
    expect(writes.filter((k) => k === QUESTIONS_KEY)).toHaveLength(1);
    // The answers are kept apart from the questions: the frequent write is small.
    const state = JSON.parse(store.get(RUN_KEY)!);
    expect(state.reps).toBeUndefined();
    expect(store.get(RUN_KEY)!.length).toBeLessThan(400);
    expect(JSON.parse(store.get(QUESTIONS_KEY)!)).toEqual({ id: run.startedAt, reps: run.reps });
    expect(store.get(ID_KEY)).toBe(String(run.startedAt));

    // Every answer, every flag and every save of the clock after that: the answers alone.
    writes.length = 0;
    writeRun(CERT, { ...run, picks: [1, null, null] });
    writeRun(CERT, { ...run, picks: [1, null, null], flagged: [0] });
    writeRun(CERT, { ...run, picks: [1, null, null], flagged: [0], spentMs: 10_000 });
    expect(writes).toEqual([RUN_KEY, RUN_KEY, RUN_KEY]);
    expect(JSON.parse(store.get(RUN_KEY)!)).toMatchObject({ picks: [1, null, null], flagged: [0], spentMs: 10_000 });
  });

  it("reads a run back whole, and goes on writing only its answers", () => {
    const run = makeRun({ picks: [0, 2, null], flagged: [1], i: 1, spentMs: 61_000, claimedBy: "u7" });
    writeRun(CERT, run);
    const back = readRun(CERT, "u1");
    expect(back).toEqual(run);

    // After a reload the questions come from storage: a change to that run writes its answers only.
    writes.length = 0;
    writeRun(CERT, { ...back!, picks: [0, 2, 3] });
    expect(writes).toEqual([RUN_KEY]);
    expect(readRun(CERT, "u1")?.picks).toEqual([0, 2, 3]);
  });

  it("writes the questions again when another tab has started a sitting of its own", () => {
    const run = makeRun();
    writeRun(CERT, run);
    // Another tab starts a new sitting: its questions replace this one's.
    store.set(QUESTIONS_KEY, JSON.stringify({ id: 42, reps: [rep(9)] }));
    store.set(ID_KEY, "42");
    writes.length = 0;
    writeRun(CERT, { ...run, picks: [1, null, null] });
    expect(writes).toEqual([QUESTIONS_KEY, ID_KEY, RUN_KEY]);
    expect(readRun(CERT, "u1")?.reps).toEqual(run.reps);
  });

  it("still reads a run written before the questions were kept apart, and writes it back in two parts", () => {
    const old = makeRun({ picks: [0, null, null] });
    plant(old);
    const back = readRun(CERT, "u1");
    expect(back).toEqual(old);
    writeRun(CERT, back!);
    expect(JSON.parse(store.get(RUN_KEY)!).reps).toBeUndefined();
    expect(JSON.parse(store.get(QUESTIONS_KEY)!).reps).toEqual(old.reps);
    expect(readRun(CERT, "u1")).toEqual(old);
  });

  it("is never read for another account, and is gone once cleared", () => {
    writeRun(CERT, makeRun());
    expect(readRun(CERT, "u2")).toBeNull();
    expect(readRun(CERT, "u1")).not.toBeNull();
    clearRun(CERT);
    expect(store.size).toBe(0);
    expect(readRun(CERT, "u1")).toBeNull();
  });

  it("drops a run whose questions are missing or belong to another sitting", () => {
    const { reps, ...state } = makeRun();
    plant(state);
    expect(readRun(CERT, "u1")).toBeNull();
    plant(state, { id: state.startedAt + 1, reps });
    expect(readRun(CERT, "u1")).toBeNull();
    plant(state, { id: state.startedAt, reps });
    expect(readRun(CERT, "u1")?.reps).toEqual(reps);
  });

  it("drops a run whose questions or answers are not what the player can show", () => {
    const run = makeRun();
    // The answer is not one of the options.
    plant({ ...run, reps: [{ ...rep(1), answer: 4 }, rep(2), rep(3)] });
    expect(readRun(CERT, "u1")).toBeNull();
    // A question with no takeaway to explain it.
    plant({ ...run, reps: [{ ...rep(1), takeaway: undefined }, rep(2), rep(3)] });
    expect(readRun(CERT, "u1")).toBeNull();
    // A pick that is not one of its question's options, and a list of picks of the wrong length.
    plant({ ...run, picks: [9, null, null] });
    expect(readRun(CERT, "u1")).toBeNull();
    plant({ ...run, picks: [0, null] });
    expect(readRun(CERT, "u1")).toBeNull();
    // A time limit nobody could have set.
    plant({ ...run, limitMs: 10 * 86_400_000 });
    expect(readRun(CERT, "u1")).toBeNull();
    // Flags outside the questions are dropped; the rest of the run is kept.
    plant({ ...run, flagged: [2, 2, 7, -1, 0] });
    expect(readRun(CERT, "u1")?.flagged).toEqual([0, 2]);
  });

  it("keeps a stored result only when every figure is in range and it is the result of these questions", () => {
    const run = makeRun({ picks: [0, 0, 1] });
    const done = (res: unknown, more?: object) => ({ ...run, done: { result: res, before: null, timedOut: false, ...more } });

    plant(done(result()));
    expect(readRun(CERT, "u1")?.done).toEqual({ result: result(), before: null, timedOut: false });

    // Out of range, or the wrong shape: the sitting counts as not yet scored.
    for (const bad of [
      result({ score: 170 }),
      { ...result(), size: "quarter" },
      result({ answered: 4 }),
      { ...result(), domains: "none" },
      result({ domains: [{ number: "1.0", correct: 5, total: 3 }] }),
      // The result of some other set of questions.
      result({ total: 90, answered: 90 }),
      result({ size: "full" }),
      "junk",
      null,
    ]) {
      plant(done(bad));
      const back = readRun(CERT, "u1");
      expect(back).not.toBeNull();
      expect(back?.done).toBeNull();
    }

    // The reading it was set against is checked in the same way.
    plant(done(result(), { before: { score: 58, at: 5, source: "checkpoint" }, timedOut: true }));
    expect(readRun(CERT, "u1")?.done).toEqual({
      result: result(),
      before: { score: 58, at: 5, source: "checkpoint" },
      timedOut: true,
    });
    plant(done(result(), { before: { score: 580, at: 5, source: "checkpoint" }, timedOut: "yes" }));
    expect(readRun(CERT, "u1")?.done).toEqual({ result: result(), before: null, timedOut: false });
  });

  it("keeps the account a finished exam was shown to, and nothing else in its place", () => {
    writeRun(CERT, makeRun({ owner: "public", claimedBy: "account-1" }));
    expect(readRun(CERT, "public")?.claimedBy).toBe("account-1");
    // Never claimed, or a value that is not an account id: nobody has claimed it.
    writeRun(CERT, makeRun({ owner: "public" }));
    expect(readRun(CERT, "public")?.claimedBy).toBeNull();
    plant({ ...makeRun({ owner: "public" }), claimedBy: { id: 1 } });
    expect(readRun(CERT, "public")?.claimedBy).toBeNull();
  });
});
