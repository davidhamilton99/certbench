import { describe, expect, it } from "vitest";
import {
  answeredCount,
  initQuizState,
  isComplete,
  quizReducer,
  restoreQuizState,
  toSnapshot,
  unansweredIndexes,
} from "../machine";
import { seededPermutation } from "../shuffle";
import type { QuizConfig, QuizEvent, QuizState, ResponseValue } from "../types";

const examConfig: QuizConfig = {
  mode: "practice_exam",
  grading: "server_at_end",
  allowFlagging: true,
  allowReview: true,
};

const studySetConfig: QuizConfig = {
  mode: "study_set",
  grading: "client_immediate",
  allowFlagging: false,
  allowReview: false,
};

const single = (i: number): ResponseValue => ({
  kind: "single",
  selectedIndex: i,
});

const NOW = "2026-06-09T12:00:00.000Z";

function run(
  config: QuizConfig,
  total: number,
  events: QuizEvent[],
  from: QuizState = initQuizState(NOW)
): QuizState {
  return events.reduce(
    (state, event) => quizReducer(config, total, state, event),
    from
  );
}

describe("quizReducer — exam mode (server_at_end)", () => {
  it("records answers and navigates", () => {
    const state = run(examConfig, 3, [
      { type: "ANSWER", questionId: "q1", value: single(2) },
      { type: "NEXT" },
      { type: "ANSWER", questionId: "q2", value: single(0) },
    ]);
    expect(state.status).toBe("active");
    if (state.status !== "active") return;
    expect(state.index).toBe(1);
    expect(answeredCount(state)).toBe(2);
    expect(state.responses.q1.value).toEqual(single(2));
  });

  it("allows changing an answer before submit", () => {
    const state = run(examConfig, 3, [
      { type: "ANSWER", questionId: "q1", value: single(0) },
      { type: "ANSWER", questionId: "q1", value: single(3) },
    ]);
    if (state.status !== "active") throw new Error("expected active");
    expect(state.responses.q1.value).toEqual(single(3));
    expect(answeredCount(state)).toBe(1);
  });

  it("clamps navigation to bounds", () => {
    const state = run(examConfig, 3, [
      { type: "PREV" },
      { type: "NAVIGATE", to: 99 },
    ]);
    if (state.status !== "active") throw new Error("expected active");
    expect(state.index).toBe(2);
  });

  it("toggles flags and reports unanswered questions", () => {
    const state = run(examConfig, 3, [
      { type: "TOGGLE_FLAG", questionId: "q2" },
      { type: "ANSWER", questionId: "q1", value: single(1) },
    ]);
    if (state.status !== "active") throw new Error("expected active");
    expect(state.flagged).toEqual(["q2"]);
    expect(unansweredIndexes(state, ["q1", "q2", "q3"])).toEqual([1, 2]);

    const unflagged = quizReducer(examConfig, 3, state, {
      type: "TOGGLE_FLAG",
      questionId: "q2",
    });
    if (unflagged.status !== "active") throw new Error("expected active");
    expect(unflagged.flagged).toEqual([]);
  });

  it("ignores REVEAL in server-graded mode", () => {
    const state = run(examConfig, 3, [
      { type: "ANSWER", questionId: "q1", value: single(1) },
      { type: "REVEAL", questionId: "q1" },
    ]);
    if (state.status !== "active") throw new Error("expected active");
    expect(state.revealed).toEqual([]);
  });

  it("enters review, exits review, then submits", () => {
    const reviewing = run(examConfig, 2, [
      { type: "ANSWER", questionId: "q1", value: single(0) },
      { type: "ANSWER", questionId: "q2", value: single(1) },
      { type: "ENTER_REVIEW" },
    ]);
    expect(reviewing.status).toBe("review");

    const back = quizReducer(examConfig, 2, reviewing, { type: "EXIT_REVIEW" });
    expect(back.status).toBe("active");

    const results = run(examConfig, 2, [
      { type: "SUBMIT_START" },
      { type: "SUBMIT_SUCCESS" },
    ], reviewing);
    expect(results.status).toBe("results");
    expect(isComplete(reviewing, 2)).toBe(true);
  });

  it("submit failure preserves state for retry", () => {
    const errored = run(examConfig, 2, [
      { type: "ANSWER", questionId: "q1", value: single(0) },
      { type: "SUBMIT_START" },
      { type: "SUBMIT_FAILURE", message: "network down" },
    ]);
    expect(errored.status).toBe("error");
    if (errored.status !== "error") return;
    expect(errored.message).toBe("network down");
    expect(answeredCount(errored)).toBe(1);

    const resumed = quizReducer(examConfig, 2, errored, { type: "RETRY" });
    expect(resumed.status).toBe("active");
    if (resumed.status !== "active") return;
    expect(resumed.responses.q1.value).toEqual(single(0));
  });

  it("results state is terminal", () => {
    const results = run(examConfig, 1, [
      { type: "ANSWER", questionId: "q1", value: single(0) },
      { type: "SUBMIT_START" },
      { type: "SUBMIT_SUCCESS" },
    ]);
    const after = quizReducer(examConfig, 1, results, {
      type: "ANSWER",
      questionId: "q1",
      value: single(1),
    });
    expect(after).toBe(results);
  });
});

describe("quizReducer — immediate-feedback mode (client_immediate)", () => {
  it("reveals after grading and locks the answer", () => {
    const state = run(studySetConfig, 2, [
      { type: "ANSWER", questionId: "q1", value: single(1) },
      { type: "GRADE", questionId: "q1", grade: { isCorrect: true, score: 100 } },
      { type: "REVEAL", questionId: "q1" },
      // Attempt to change a revealed answer must be ignored:
      { type: "ANSWER", questionId: "q1", value: single(0) },
    ]);
    if (state.status !== "active") throw new Error("expected active");
    expect(state.revealed).toEqual(["q1"]);
    expect(state.responses.q1.value).toEqual(single(1));
    expect(state.responses.q1.grade).toEqual({ isCorrect: true, score: 100 });
  });

  it("ignores flag and review events when disabled", () => {
    const state = run(studySetConfig, 2, [
      { type: "TOGGLE_FLAG", questionId: "q1" },
      { type: "ENTER_REVIEW" },
    ]);
    expect(state.status).toBe("active");
    if (state.status !== "active") return;
    expect(state.flagged).toEqual([]);
  });
});

describe("snapshot persistence", () => {
  it("round-trips through toSnapshot/restoreQuizState", () => {
    const state = run(examConfig, 3, [
      { type: "ANSWER", questionId: "q1", value: single(2) },
      { type: "TOGGLE_FLAG", questionId: "q3" },
      { type: "NEXT" },
    ]);
    const snapshot = toSnapshot(state, "attempt-123");
    expect(snapshot).not.toBeNull();
    expect(snapshot!.seed).toBe("attempt-123");

    const restored = restoreQuizState(snapshot!);
    expect(restored.index).toBe(1);
    expect(restored.responses.q1.value).toEqual(single(2));
    expect(restored.flagged).toEqual(["q3"]);
    expect(restored.startedAt).toBe(NOW);
  });

  it("returns null snapshot for non-resumable states", () => {
    const results = run(examConfig, 1, [
      { type: "SUBMIT_START" },
      { type: "SUBMIT_SUCCESS" },
    ]);
    expect(toSnapshot(results, "x")).toBeNull();
  });
});

describe("seededPermutation", () => {
  it("is deterministic for the same seed and scope", () => {
    const a = seededPermutation("attempt-1", "q1", 5);
    const b = seededPermutation("attempt-1", "q1", 5);
    expect(a).toEqual(b);
  });

  it("differs across scopes and seeds (overwhelmingly)", () => {
    const base = seededPermutation("attempt-1", "q1", 8);
    const otherScope = seededPermutation("attempt-1", "q2", 8);
    const otherSeed = seededPermutation("attempt-2", "q1", 8);
    expect(otherScope).not.toEqual(base);
    expect(otherSeed).not.toEqual(base);
  });

  it("is a valid permutation", () => {
    const p = seededPermutation("seed", "scope", 10);
    expect([...p].sort((x, y) => x - y)).toEqual(
      Array.from({ length: 10 }, (_, i) => i)
    );
  });

  it("handles edge lengths", () => {
    expect(seededPermutation("s", "q", 0)).toEqual([]);
    expect(seededPermutation("s", "q", 1)).toEqual([0]);
  });
});
