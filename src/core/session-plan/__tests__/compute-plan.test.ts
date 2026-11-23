import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DIAGNOSTIC_QUESTION_COUNT,
  DOMAIN_DRILL_QUESTION_COUNT,
  FULL_EXAM_QUESTION_COUNT,
  WEAK_POINTS_QUESTION_COUNT,
} from "@/core/constants";
import { computeSessionPlan, type SessionEngineInput } from "../compute-plan";

const NOW = new Date("2026-11-22T12:00:00Z");

const DOMAINS = [
  { id: "d1", domain_number: "1.0", title: "General security concepts", exam_weight: 12 },
  { id: "d2", domain_number: "2.0", title: "Threats, vulnerabilities and mitigations", exam_weight: 22 },
  { id: "d3", domain_number: "3.0", title: "Security architecture", exam_weight: 18 },
];

/** `count` answered questions in a domain, `correct` of them right every time. */
function performance(domain: string, count: number, correct: number, due = false) {
  return Array.from({ length: count }, (_, i) => ({
    question_id: `${domain}-${i}`,
    domain_id: domain,
    times_seen: 1,
    times_correct: i < correct ? 1 : 0,
    last_seen_at: "2026-11-20T00:00:00Z",
    srs_next_review_at: due && i < 3 ? "2026-11-21T00:00:00Z" : null,
  }));
}

function input(over: Partial<SessionEngineInput> = {}): SessionEngineInput {
  return {
    diagnosticComplete: true,
    examDate: null,
    domains: DOMAINS,
    questionPerformance: [
      ...performance("d1", 20, 18),
      ...performance("d2", 20, 6, true),
      ...performance("d3", 20, 12),
    ],
    totalQuestionCount: 800,
    lastFullExamDate: null,
    ...over,
  };
}

/** Title case: two or more capitalised words in a row after the first word. */
const TITLE_CASE = /^[A-Z][a-z]+ [A-Z][a-z]+/;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("computeSessionPlan, the words on the study plan", () => {
  it("offers the diagnostic alone until it is taken, with its real number of questions", () => {
    const plan = computeSessionPlan(input({ diagnosticComplete: false, questionPerformance: [] }));
    expect(plan.blocks).toHaveLength(1);
    const [block] = plan.blocks;
    expect(block.type).toBe("diagnostic");
    expect(block.title).toBe("Take the diagnostic");
    expect(block.description).toBe(
      `The diagnostic has ${DIAGNOSTIC_QUESTION_COUNT} questions and measures your starting point in every domain.`
    );
    expect(block.questionCount).toBe(DIAGNOSTIC_QUESTION_COUNT);
  });

  it("sets every title in sentence case and every description as a sentence", () => {
    const plan = computeSessionPlan(input({ examDate: "2026-12-10" }));
    expect(plan.blocks.length).toBeGreaterThanOrEqual(5);
    for (const block of plan.blocks) {
      // "Domain drill: General security concepts" keeps the domain's own name after the colon.
      expect(block.title.split(":")[0]).not.toMatch(TITLE_CASE);
      expect(block.description).toMatch(/^[A-Z0-9].*\.$/);
      expect(block.reason).toMatch(/^[A-Z].*\.$/);
      expect(`${block.title} ${block.description} ${block.reason}`).not.toMatch(/streak|gotten|you’ve|you've/i);
    }
  });

  it("names the kinds of work as the pages name them", () => {
    const plan = computeSessionPlan(input());
    expect(plan.blocks.map((b) => b.title)).toEqual([
      "Spaced repetition review",
      "Domain drill: Threats, vulnerabilities and mitigations",
      "Weak points review",
      "Practice exam",
      "New questions",
    ]);
  });

  it("counts in whole sentences, singular and plural", () => {
    const plan = computeSessionPlan(input());
    const byType = Object.fromEntries(plan.blocks.map((b) => [b.type, b]));
    expect(byType.srs_review.description).toBe("3 questions are due for review.");
    expect(byType.domain_drill.description).toBe("Your score in this domain is 30%. The domain is 22% of the exam.");
    expect(byType.weak_points.description).toBe("You have answered 24 questions incorrectly before.");
    expect(byType.practice_exam.description).toBe(
      `A practice exam has ${FULL_EXAM_QUESTION_COUNT} questions and covers every domain.`
    );
    expect(byType.new_content.description).toBe(
      "There are 740 questions that you have not seen yet. A practice exam asks new questions first."
    );

    const one = computeSessionPlan(
      input({
        questionPerformance: [
          { ...performance("d1", 1, 1, true)[0], srs_next_review_at: "2026-11-21T00:00:00Z" },
        ],
        totalQuestionCount: 2,
      })
    );
    const oneByType = Object.fromEntries(one.blocks.map((b) => [b.type, b]));
    expect(oneByType.srs_review.description).toBe("1 question is due for review.");
    expect(oneByType.new_content.description).toBe(
      "There is 1 question that you have not seen yet. A practice exam asks new questions first."
    );
  });

  it("says how long until the exam in a sentence, in the last week and in the last month", () => {
    const week = computeSessionPlan(input({ examDate: "2026-11-25" }));
    const exam = week.blocks.find((b) => b.type === "practice_exam" && b.priority === 3);
    expect(exam?.title).toBe("Full practice exam");
    expect(exam?.description).toBe("Your exam is in 3 days. Take a full practice exam under exam conditions.");

    const tomorrow = computeSessionPlan(input({ examDate: "2026-11-23" }));
    expect(tomorrow.blocks.find((b) => b.priority === 3)?.description).toMatch(/^Your exam is in 1 day\./);

    const month = computeSessionPlan(input({ examDate: "2026-12-10" }));
    const extra = month.blocks.filter((b) => b.type === "domain_drill" && b.priority === 3);
    expect(extra.map((b) => b.description)).toEqual(["Your exam is in 18 days. Your score in this domain is 60%."]);
    expect(extra[0].reason).toBe("Your exam is within a month, and this domain is below 70%.");
  });

  it("prints for each block the number of questions that its page starts", () => {
    // Each block is a link (blockHref in SessionBlockCard). The page it opens
    // starts a set of the server's standard size for that kind of work, so the
    // size on the card has to be that size: a card that said "15 questions"
    // used to open a practice exam of 90.
    const plan = computeSessionPlan(input({ examDate: "2026-12-10" }));
    for (const block of plan.blocks) {
      if (block.type === "domain_drill") expect(block.questionCount).toBe(DOMAIN_DRILL_QUESTION_COUNT);
      if (block.type === "practice_exam") expect(block.questionCount).toBe(FULL_EXAM_QUESTION_COUNT);
      // The "new questions" link opens a full practice exam, which asks unseen questions first.
      if (block.type === "new_content") expect(block.questionCount).toBe(FULL_EXAM_QUESTION_COUNT);
      if (block.type === "weak_points") expect(block.questionCount).toBe(WEAK_POINTS_QUESTION_COUNT);
      if (block.type === "srs_review") expect(block.questionCount).toBe(3);
    }
    expect(plan.blocks.filter((b) => b.type === "domain_drill")).toHaveLength(2);
  });

  it("orders the work by priority", () => {
    const plan = computeSessionPlan(input({ examDate: "2026-11-25" }));
    const priorities = plan.blocks.map((b) => b.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
  });
});
