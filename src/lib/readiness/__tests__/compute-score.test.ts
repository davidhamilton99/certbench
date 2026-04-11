import { describe, it, expect } from "vitest";
import {
  computeReadinessScore,
  getScoreColor,
  type DomainPerformance,
} from "../compute-score";
import { MIN_SAMPLE_SIZE } from "@/constants/exam-config";

function makeDomain(
  overrides: Partial<DomainPerformance> & { domain_id: string }
): DomainPerformance {
  return {
    domain_number: "1.0",
    title: "Test Domain",
    exam_weight: 20,
    attempted: 20,
    correct: 20,
    total_questions: 50,
    ...overrides,
  };
}

describe("computeReadinessScore", () => {
  it("returns 100 for perfect scores across all domains", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 50, attempted: 20, correct: 20 }),
      makeDomain({ domain_id: "d2", exam_weight: 50, attempted: 20, correct: 20 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.overall_score).toBe(100);
  });

  it("returns 0 when zero questions answered correctly", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 50, attempted: 20, correct: 0 }),
      makeDomain({ domain_id: "d2", exam_weight: 50, attempted: 20, correct: 0 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.overall_score).toBe(0);
  });

  it("returns 0 when no questions attempted", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 50, attempted: 0, correct: 0 }),
      makeDomain({ domain_id: "d2", exam_weight: 50, attempted: 0, correct: 0 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.overall_score).toBe(0);
    expect(result.is_preliminary).toBe(true);
  });

  it("applies confidence penalty for low sample sizes", () => {
    // With attempted < MIN_SAMPLE_SIZE, confidence factor < 1.0
    const lowSample: DomainPerformance[] = [
      makeDomain({
        domain_id: "d1",
        exam_weight: 100,
        attempted: 5,
        correct: 5,
      }),
    ];

    const fullSample: DomainPerformance[] = [
      makeDomain({
        domain_id: "d1",
        exam_weight: 100,
        attempted: MIN_SAMPLE_SIZE,
        correct: MIN_SAMPLE_SIZE,
      }),
    ];

    const lowResult = computeReadinessScore(lowSample);
    const fullResult = computeReadinessScore(fullSample);

    // Both have 100% accuracy, but low sample should score less
    expect(lowResult.overall_score).toBeLessThan(fullResult.overall_score);
    expect(fullResult.overall_score).toBe(100);

    // Confidence factor = attempted / MIN_SAMPLE_SIZE = 5/15 ≈ 0.33
    const expectedConfidence = Math.round((5 / MIN_SAMPLE_SIZE) * 100) / 100;
    expect(lowResult.domain_scores[0].confidence_factor).toBe(expectedConfidence);
  });

  it("weights domains by exam_weight", () => {
    // Domain 1: 80% weight, 100% accuracy
    // Domain 2: 20% weight, 0% accuracy
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 80, attempted: 20, correct: 20 }),
      makeDomain({ domain_id: "d2", exam_weight: 20, attempted: 20, correct: 0 }),
    ];

    const result = computeReadinessScore(domains);
    // Weighted score should be 80 (not 50 as a simple average would give)
    expect(result.overall_score).toBe(80);
  });

  it("marks result as preliminary when any domain is under MIN_SAMPLE_SIZE", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 50, attempted: MIN_SAMPLE_SIZE, correct: 10 }),
      makeDomain({ domain_id: "d2", exam_weight: 50, attempted: 3, correct: 2 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.is_preliminary).toBe(true);
  });

  it("marks result as not preliminary when all domains meet MIN_SAMPLE_SIZE", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 50, attempted: MIN_SAMPLE_SIZE, correct: 10 }),
      makeDomain({ domain_id: "d2", exam_weight: 50, attempted: MIN_SAMPLE_SIZE, correct: 10 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.is_preliminary).toBe(false);
  });

  it("handles empty domains array", () => {
    const result = computeReadinessScore([]);
    expect(result.overall_score).toBe(0);
    expect(result.domain_scores).toEqual([]);
    expect(result.total_questions_seen).toBe(0);
    expect(result.is_preliminary).toBe(false);
  });

  it("handles a single domain", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 100, attempted: 20, correct: 15 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.overall_score).toBe(75);
    expect(result.domain_scores).toHaveLength(1);
    expect(result.total_questions_seen).toBe(20);
  });

  it("tracks total_questions_seen across all domains", () => {
    const domains: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", attempted: 10 }),
      makeDomain({ domain_id: "d2", attempted: 25 }),
      makeDomain({ domain_id: "d3", attempted: 5 }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.total_questions_seen).toBe(40);
  });

  it("does not inflate score when student studies only a subset of domains", () => {
    // A student who only studied one 25-weight domain should NOT score 100%
    // even with perfect accuracy — they should score at most 25%.
    const partial: DomainPerformance[] = [
      makeDomain({ domain_id: "d1", exam_weight: 25, attempted: 20, correct: 20 }),
      makeDomain({ domain_id: "d2", exam_weight: 25, attempted: 0, correct: 0 }),
      makeDomain({ domain_id: "d3", exam_weight: 25, attempted: 0, correct: 0 }),
      makeDomain({ domain_id: "d4", exam_weight: 25, attempted: 0, correct: 0 }),
    ];

    const result = computeReadinessScore(partial);
    expect(result.overall_score).toBe(25);
  });

  it("caps confidence factor at 1.0 when attempted exceeds MIN_SAMPLE_SIZE", () => {
    const domains: DomainPerformance[] = [
      makeDomain({
        domain_id: "d1",
        exam_weight: 100,
        attempted: MIN_SAMPLE_SIZE * 3,
        correct: MIN_SAMPLE_SIZE * 3,
      }),
    ];

    const result = computeReadinessScore(domains);
    expect(result.domain_scores[0].confidence_factor).toBe(1);
  });
});

describe("getScoreColor", () => {
  it("returns success for scores >= 75", () => {
    expect(getScoreColor(75)).toBe("success");
    expect(getScoreColor(100)).toBe("success");
  });

  it("returns warning for scores >= 40 and < 75", () => {
    expect(getScoreColor(40)).toBe("warning");
    expect(getScoreColor(74)).toBe("warning");
  });

  it("returns danger for scores < 40", () => {
    expect(getScoreColor(0)).toBe("danger");
    expect(getScoreColor(39)).toBe("danger");
  });
});
