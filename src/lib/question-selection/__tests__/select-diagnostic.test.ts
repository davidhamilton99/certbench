import { describe, it, expect } from "vitest";
import { selectDiagnosticQuestions } from "../select-diagnostic";
import { DIAGNOSTIC_QUESTION_COUNT } from "@/constants/exam-config";
import type { CertQuestion, DomainWeight } from "../types";

function makeQuestion(
  id: string,
  domain_id: string,
  difficulty: number = 3
): CertQuestion {
  return {
    id,
    certification_id: "sec-plus",
    domain_id,
    sub_objective_id: null,
    question_text: `Question ${id}`,
    options: [
      { text: "A", is_correct: true },
      { text: "B", is_correct: false },
      { text: "C", is_correct: false },
      { text: "D", is_correct: false },
    ],
    correct_index: 0,
    explanation: "Explanation",
    difficulty,
  };
}

function makeDomains(): DomainWeight[] {
  return [
    { id: "d1", domain_number: "1.0", title: "Attacks", exam_weight: 24 },
    { id: "d2", domain_number: "2.0", title: "Architecture", exam_weight: 21 },
    { id: "d3", domain_number: "3.0", title: "Implementation", exam_weight: 25 },
    { id: "d4", domain_number: "4.0", title: "Operations", exam_weight: 22 },
    { id: "d5", domain_number: "5.0", title: "Governance", exam_weight: 8 },
  ];
}

function makeQuestionPool(perDomain: number = 20): CertQuestion[] {
  const domains = makeDomains();
  const questions: CertQuestion[] = [];
  for (const d of domains) {
    for (let i = 0; i < perDomain; i++) {
      questions.push(makeQuestion(`${d.id}-q${i}`, d.id, (i % 5) + 1));
    }
  }
  return questions;
}

describe("selectDiagnosticQuestions", () => {
  it("returns exactly DIAGNOSTIC_QUESTION_COUNT questions", () => {
    const questions = makeQuestionPool();
    const domains = makeDomains();

    const selected = selectDiagnosticQuestions(questions, domains);
    expect(selected).toHaveLength(DIAGNOSTIC_QUESTION_COUNT);
  });

  it("selects questions proportional to domain weights", () => {
    const questions = makeQuestionPool(50);
    const domains = makeDomains();

    // Run multiple times to account for rounding
    const domainCounts = new Map<string, number[]>();
    for (const d of domains) {
      domainCounts.set(d.id, []);
    }

    for (let run = 0; run < 20; run++) {
      const selected = selectDiagnosticQuestions(questions, domains);
      const counts = new Map<string, number>();
      for (const q of selected) {
        counts.set(q.domain_id, (counts.get(q.domain_id) || 0) + 1);
      }
      for (const d of domains) {
        domainCounts.get(d.id)!.push(counts.get(d.id) || 0);
      }
    }

    // The highest-weight domain (Implementation, 25%) should on average get
    // more questions than the lowest-weight (Governance, 8%)
    const implAvg =
      domainCounts.get("d3")!.reduce((a, b) => a + b, 0) / 20;
    const govAvg =
      domainCounts.get("d5")!.reduce((a, b) => a + b, 0) / 20;

    expect(implAvg).toBeGreaterThan(govAvg);
  });

  it("returns only questions from the provided pool", () => {
    const questions = makeQuestionPool();
    const domains = makeDomains();
    const questionIds = new Set(questions.map((q) => q.id));

    const selected = selectDiagnosticQuestions(questions, domains);
    for (const q of selected) {
      expect(questionIds.has(q.id)).toBe(true);
    }
  });

  it("returns no duplicates", () => {
    const questions = makeQuestionPool();
    const domains = makeDomains();

    const selected = selectDiagnosticQuestions(questions, domains);
    const ids = selected.map((q) => q.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("handles a small question pool gracefully", () => {
    // Only 2 questions per domain = 10 total, less than DIAGNOSTIC_QUESTION_COUNT
    const questions = makeQuestionPool(2);
    const domains = makeDomains();

    const selected = selectDiagnosticQuestions(questions, domains);
    // Should return at most what's available
    expect(selected.length).toBeLessThanOrEqual(10);
    expect(selected.length).toBeGreaterThan(0);
  });

  it("returns questions from all domains when pool is large enough", () => {
    const questions = makeQuestionPool(20);
    const domains = makeDomains();

    const selected = selectDiagnosticQuestions(questions, domains);
    const domainIds = new Set(selected.map((q) => q.domain_id));

    for (const d of domains) {
      expect(domainIds.has(d.id)).toBe(true);
    }
  });
});
