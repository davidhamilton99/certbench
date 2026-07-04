import { describe, it, expect } from "vitest";
import {
  selectWeakPointsQuestions,
  countWeakPointsQuestions,
} from "../select-questions";
import type { CertQuestion, QuestionPerformanceRecord } from "../types";

function q(id: string): CertQuestion {
  return {
    id,
    certification_id: "sec-plus",
    domain_id: "d1",
    sub_objective_id: null,
    question_text: `Q ${id}`,
    options: [
      { text: "A", is_correct: true },
      { text: "B", is_correct: false },
      { text: "C", is_correct: false },
      { text: "D", is_correct: false },
    ],
    correct_index: 0,
    explanation: "",
    difficulty: 2,
  };
}

function perf(
  question_id: string,
  times_seen: number,
  times_correct: number,
  last_seen_at: string | null = "2026-01-01T00:00:00Z"
): QuestionPerformanceRecord {
  return { question_id, times_seen, times_correct, last_seen_at };
}

describe("selectWeakPointsQuestions", () => {
  it("returns only questions the user has gotten wrong at least once", () => {
    const questions = [q("a"), q("b"), q("c"), q("d")];
    const performance = [
      perf("a", 3, 3), // perfect — excluded
      perf("b", 3, 1), // weak — included
      perf("c", 2, 0), // weak — included
      // d: unseen — excluded
    ];

    const result = selectWeakPointsQuestions(questions, performance, 10);
    const ids = result.map((q) => q.id).sort();
    expect(ids).toEqual(["b", "c"]);
  });

  it("never returns unseen questions", () => {
    const questions = [q("unseen1"), q("unseen2")];
    const result = selectWeakPointsQuestions(questions, [], 10);
    expect(result).toHaveLength(0);
  });

  it("respects the requested count", () => {
    const questions = Array.from({ length: 20 }, (_, i) => q(`q${i}`));
    const performance = questions.map((qq) => perf(qq.id, 2, 0));
    const result = selectWeakPointsQuestions(questions, performance, 5);
    expect(result).toHaveLength(5);
  });

  it("prioritises lowest accuracy first before shuffling within the slice", () => {
    // 20 weak questions — 5 terrible (0%), 15 mediocre (50%). Selecting 5
    // must always take the terrible ones first regardless of shuffle order.
    const terrible = Array.from({ length: 5 }, (_, i) => q(`bad${i}`));
    const mediocre = Array.from({ length: 15 }, (_, i) => q(`ok${i}`));
    const performance = [
      ...terrible.map((qq) => perf(qq.id, 4, 0)),
      ...mediocre.map((qq) => perf(qq.id, 4, 2)),
    ];

    const result = selectWeakPointsQuestions(
      [...terrible, ...mediocre],
      performance,
      5
    );
    expect(result).toHaveLength(5);
    expect(new Set(result.map((r) => r.id))).toEqual(
      new Set(terrible.map((t) => t.id))
    );
  });
});

describe("countWeakPointsQuestions", () => {
  it("counts only seen questions with imperfect accuracy", () => {
    const performance = [
      perf("a", 3, 3), // perfect
      perf("b", 3, 0), // weak
      perf("c", 2, 1), // weak
      perf("d", 0, 0), // unseen
    ];
    expect(countWeakPointsQuestions(performance)).toBe(2);
  });
});
