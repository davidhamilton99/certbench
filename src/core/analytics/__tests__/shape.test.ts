import { describe, it, expect } from "vitest";
import {
  shapeReadinessSeries,
  shapeActivityByDay,
  shapeWeakestSubObjectives,
} from "../shape";

describe("shapeReadinessSeries", () => {
  it("returns empty for no snapshots", () => {
    expect(shapeReadinessSeries([])).toEqual([]);
  });

  it("collapses multiple snapshots from the same day to the newest", () => {
    const out = shapeReadinessSeries([
      { overall_score: 40, computed_at: "2026-04-10T08:00:00Z" },
      { overall_score: 55, computed_at: "2026-04-10T20:00:00Z" },
      { overall_score: 45, computed_at: "2026-04-10T13:00:00Z" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ day: "2026-04-10", score: 55 });
  });

  it("sorts oldest-first regardless of input order", () => {
    const out = shapeReadinessSeries([
      { overall_score: 70, computed_at: "2026-04-12T10:00:00Z" },
      { overall_score: 40, computed_at: "2026-04-10T10:00:00Z" },
      { overall_score: 55, computed_at: "2026-04-11T10:00:00Z" },
    ]);
    expect(out.map((p) => p.day)).toEqual([
      "2026-04-10",
      "2026-04-11",
      "2026-04-12",
    ]);
  });

  it("handles Postgres decimal strings", () => {
    const out = shapeReadinessSeries([
      { overall_score: "67.50" as unknown as string, computed_at: "2026-04-10T10:00:00Z" },
    ]);
    expect(out[0].score).toBe(67.5);
  });

  it("skips snapshots with non-numeric score", () => {
    const out = shapeReadinessSeries([
      { overall_score: "garbage" as unknown as string, computed_at: "2026-04-10T10:00:00Z" },
      { overall_score: 42, computed_at: "2026-04-11T10:00:00Z" },
    ]);
    expect(out).toEqual([{ day: "2026-04-11", score: 42 }]);
  });
});

describe("shapeActivityByDay", () => {
  const now = new Date("2026-04-16T12:00:00Z");

  it("produces one row per day across the window", () => {
    const out = shapeActivityByDay([], 7, now);
    expect(out).toHaveLength(7);
    expect(out[0].day).toBe("2026-04-10");
    expect(out[6].day).toBe("2026-04-16");
  });

  it("bins completed attempts into the right day with correct and total counts", () => {
    const out = shapeActivityByDay(
      [
        {
          is_complete: true,
          completed_at: "2026-04-15T08:00:00Z",
          total_questions: 10,
          correct_count: 7,
        },
        {
          is_complete: true,
          completed_at: "2026-04-15T20:00:00Z",
          total_questions: 20,
          correct_count: 12,
        },
        // Out-of-range, ignored
        {
          is_complete: true,
          completed_at: "2026-01-01T00:00:00Z",
          total_questions: 90,
          correct_count: 90,
        },
      ],
      7,
      now
    );
    const apr15 = out.find((d) => d.day === "2026-04-15")!;
    expect(apr15.attempts).toBe(2);
    expect(apr15.questions).toBe(30);
    expect(apr15.correct).toBe(19);
  });

  it("skips incomplete attempts", () => {
    const out = shapeActivityByDay(
      [
        {
          is_complete: false,
          completed_at: null,
          total_questions: 10,
          correct_count: null,
        },
      ],
      7,
      now
    );
    expect(out.every((d) => d.attempts === 0)).toBe(true);
  });
});

describe("shapeWeakestSubObjectives", () => {
  it("returns sub-objectives sorted by accuracy ascending", () => {
    const performance = [
      { question_id: "q1", times_seen: 5, times_correct: 1 },
      { question_id: "q2", times_seen: 4, times_correct: 3 },
      { question_id: "q3", times_seen: 6, times_correct: 2 },
    ];
    const questionToSub = new Map([
      ["q1", "s1"],
      ["q2", "s2"],
      ["q3", "s3"],
    ]);
    const subs = [
      { id: "s1", code: "1.1", title: "A", domain_id: "d1" },
      { id: "s2", code: "1.2", title: "B", domain_id: "d1" },
      { id: "s3", code: "2.1", title: "C", domain_id: "d2" },
    ];
    const domainNumbers = new Map([
      ["d1", "1.0"],
      ["d2", "2.0"],
    ]);

    const out = shapeWeakestSubObjectives(
      performance,
      questionToSub,
      subs,
      domainNumbers,
      { minAttempted: 3, limit: 5 }
    );
    expect(out.map((r) => r.code)).toEqual(["1.1", "2.1", "1.2"]);
    expect(out[0].accuracy).toBeCloseTo(20);
  });

  it("excludes sub-objectives below minAttempted threshold", () => {
    const out = shapeWeakestSubObjectives(
      [
        { question_id: "q1", times_seen: 1, times_correct: 0 },
        { question_id: "q2", times_seen: 5, times_correct: 3 },
      ],
      new Map([
        ["q1", "s1"],
        ["q2", "s2"],
      ]),
      [
        { id: "s1", code: "1.1", title: "A", domain_id: "d1" },
        { id: "s2", code: "1.2", title: "B", domain_id: "d1" },
      ],
      new Map([["d1", "1.0"]]),
      { minAttempted: 3, limit: 5 }
    );
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe("1.2");
  });

  it("respects the limit", () => {
    const performance = Array.from({ length: 10 }, (_, i) => ({
      question_id: `q${i}`,
      times_seen: 5,
      times_correct: i,
    }));
    const questionToSub = new Map(
      performance.map((p) => [p.question_id, `s${p.question_id.slice(1)}`])
    );
    const subs = performance.map((p, i) => ({
      id: `s${i}`,
      code: `1.${i}`,
      title: `T${i}`,
      domain_id: "d1",
    }));
    const out = shapeWeakestSubObjectives(
      performance,
      questionToSub,
      subs,
      new Map([["d1", "1.0"]]),
      { minAttempted: 1, limit: 3 }
    );
    expect(out).toHaveLength(3);
  });

  it("aggregates multiple questions under the same sub-objective", () => {
    const out = shapeWeakestSubObjectives(
      [
        { question_id: "q1", times_seen: 3, times_correct: 1 },
        { question_id: "q2", times_seen: 2, times_correct: 0 },
      ],
      new Map([
        ["q1", "s1"],
        ["q2", "s1"],
      ]),
      [{ id: "s1", code: "1.1", title: "A", domain_id: "d1" }],
      new Map([["d1", "1.0"]]),
      { minAttempted: 3, limit: 5 }
    );
    expect(out).toHaveLength(1);
    expect(out[0].attempted).toBe(5);
    expect(out[0].correct).toBe(1);
    expect(out[0].accuracy).toBeCloseTo(20);
  });
});
