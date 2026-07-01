import { describe, it, expect } from "vitest";
import {
  computeTargetDifficulty,
  selectPracticeQuestions,
} from "../select-questions";
import type {
  CertQuestion,
  DomainWeight,
  QuestionPerformanceRecord,
} from "../types";

function q(
  id: string,
  difficulty: number = 2,
  domain_id: string = "d1"
): CertQuestion {
  return {
    id,
    certification_id: "sec-plus",
    domain_id,
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
    difficulty,
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

const SINGLE_DOMAIN: DomainWeight[] = [
  { id: "d1", domain_number: "1.0", title: "Domain 1", exam_weight: 100 },
];

describe("computeTargetDifficulty", () => {
  it("defaults to 2 when there is no performance data", () => {
    expect(computeTargetDifficulty([])).toBe(2);
  });

  it("defaults to 2 when rows exist but nothing has been seen", () => {
    // All zeros — e.g. rows created but never answered. Divide-by-zero guard.
    expect(computeTargetDifficulty([perf("a", 0, 0)])).toBe(2);
  });

  it("returns 1 for accuracy below 50%", () => {
    // 3/10 = 30%
    const p = [perf("a", 10, 3)];
    expect(computeTargetDifficulty(p)).toBe(1);
  });

  it("returns 2 for accuracy in the 50–75% stretch zone", () => {
    // 6/10 = 60%
    const p = [perf("a", 10, 6)];
    expect(computeTargetDifficulty(p)).toBe(2);
  });

  it("returns 3 for accuracy above 75%", () => {
    // 9/10 = 90%
    const p = [perf("a", 10, 9)];
    expect(computeTargetDifficulty(p)).toBe(3);
  });

  it("treats exactly 50% and exactly 75% as stretch-zone (target 2)", () => {
    // Boundary inclusive on both ends of the middle band.
    expect(computeTargetDifficulty([perf("a", 10, 5)])).toBe(2); // 50%
    expect(computeTargetDifficulty([perf("b", 4, 3)])).toBe(2); // 75%
  });

  it("aggregates across multiple performance rows", () => {
    // 2/4 + 6/6 = 8/10 = 80% — overall high accuracy → target 3
    const p = [perf("a", 4, 2), perf("b", 6, 6)];
    expect(computeTargetDifficulty(p)).toBe(3);
  });
});

describe("selectPracticeQuestions — adaptive difficulty", () => {
  it("prefers target-matched unseen questions when user is high-skill", () => {
    // High-skill user — 90% accuracy → target difficulty 3
    const history = [perf("seen1", 10, 9)];

    // 5 unseen questions across difficulties; we only ask for 3.
    const unseen = [
      q("easy1", 1),
      q("easy2", 1),
      q("med1", 2),
      q("hard1", 3),
      q("hard2", 3),
    ];

    // Include the seen question so history has somewhere to apply.
    const pool = [...unseen, q("seen1", 2)];
    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 3);

    // All 3 hard candidates should be picked before any easy/medium unseen.
    // (We only have 2 hard unseen + 1 medium — so the pick is hard1, hard2,
    // and med1 beats easy* because distance 1 < distance 2.)
    const ids = new Set(result.map((r) => r.id));
    expect(ids).toContain("hard1");
    expect(ids).toContain("hard2");
    expect(ids).toContain("med1");
    expect(ids.has("easy1") || ids.has("easy2")).toBe(false);
  });

  it("prefers target-matched unseen questions when user is low-skill", () => {
    // Low-skill user — 20% accuracy → target difficulty 1
    const history = [perf("seen1", 10, 2)];

    const unseen = [
      q("easy1", 1),
      q("easy2", 1),
      q("med1", 2),
      q("hard1", 3),
      q("hard2", 3),
    ];

    const pool = [...unseen, q("seen1", 2)];
    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 3);

    // Both easy candidates first, then the medium (distance 1 < distance 2).
    const ids = new Set(result.map((r) => r.id));
    expect(ids).toContain("easy1");
    expect(ids).toContain("easy2");
    expect(ids).toContain("med1");
    expect(ids.has("hard1") || ids.has("hard2")).toBe(false);
  });

  it("softly prefers — still returns off-target questions when pool is thin", () => {
    // High-skill user — target 3. But only 1 hard question exists.
    const history = [perf("seen1", 10, 9)];

    const pool = [
      q("hard1", 3),
      q("easy1", 1),
      q("easy2", 1),
      q("easy3", 1),
      q("seen1", 2),
    ];

    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 4);

    // Requested 4, must return 4 even though only 1 matches target.
    expect(result).toHaveLength(4);
    const ids = new Set(result.map((r) => r.id));
    expect(ids).toContain("hard1");
    // The other 3 slots fill from the available easy questions.
    expect([...ids].filter((id) => id.startsWith("easy"))).toHaveLength(3);
  });

  it("uses difficulty as a tie-breaker in the incorrect bucket without disturbing accuracy priority", () => {
    // Two incorrect-bucket questions with DIFFERENT accuracies:
    //   - `bad-hard` at 0/4 = 0% (worst)
    //   - `ok-easy`  at 2/4 = 50% (better)
    // Accuracy must win over difficulty distance: worst must be picked first
    // even though `ok-easy` is closer to the target difficulty (target=1).
    //
    // The `history-pad` entry references a question NOT in the pool — it
    // steers computeTargetDifficulty() without entering bucket competition.
    const pool = [q("bad-hard", 3), q("ok-easy", 1)];
    const history = [
      perf("bad-hard", 4, 0),
      perf("ok-easy", 4, 2),
      perf("history-pad", 10, 0), // 0/10 drags overall accuracy → target 1
    ];

    // Ask for only 1 — forces a choice between the two incorrect-bucket items.
    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("bad-hard");
  });

  it("uses difficulty as a tie-breaker in the incorrect bucket when accuracies match", () => {
    // Low-skill user → target 1. Two incorrect questions at the SAME 50%
    // accuracy, one easy one hard. Difficulty distance should pick easy.
    const pool = [q("hard", 3), q("easy", 1)];
    const history = [
      perf("hard", 4, 2), // 50%
      perf("easy", 4, 2), // 50%
      perf("history-pad", 10, 1), // 10% — orphan row to drag target to 1
    ];

    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("easy");
  });

  it("uses difficulty as a tie-breaker in the correct bucket when staleness matches", () => {
    // High-skill user → target 3. Two correct questions with IDENTICAL
    // last_seen_at — difficulty distance should break the tie toward "hard".
    const pool = [q("easy-correct", 1), q("hard-correct", 3)];
    const history = [
      perf("easy-correct", 3, 3, "2026-01-01T00:00:00Z"),
      perf("hard-correct", 3, 3, "2026-01-01T00:00:00Z"),
      // Orphan row with overwhelming correct history → overall accuracy > 75%.
      perf("history-pad", 20, 19, "2026-01-02T00:00:00Z"),
    ];

    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("hard-correct");
  });

  it("is a no-op when all questions share the default difficulty", () => {
    // With the current seeded data (every question at difficulty=2), adaptive
    // sort collapses to zero-distance for everyone. Selection must still fill
    // the requested count and respect the unseen → incorrect → correct priority.
    const pool = [
      q("unseen1"),
      q("unseen2"),
      q("wrong1"),
      q("right1"),
    ];
    const history = [
      perf("wrong1", 2, 0),
      perf("right1", 2, 2),
    ];

    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, history, 3);

    // Must pick both unseen + the wrong one before the right one.
    const ids = new Set(result.map((r) => r.id));
    expect(ids).toContain("unseen1");
    expect(ids).toContain("unseen2");
    expect(ids).toContain("wrong1");
    expect(ids.has("right1")).toBe(false);
  });

  it("honors the requested count even with no performance data (cold start)", () => {
    // Cold start — target = 2 (default). Make sure nothing blows up and we
    // still return `count` questions.
    const pool = Array.from({ length: 20 }, (_, i) =>
      q(`q${i}`, ((i % 3) + 1) as 1 | 2 | 3)
    );
    const result = selectPracticeQuestions(pool, SINGLE_DOMAIN, [], 10);
    expect(result).toHaveLength(10);
  });
});
