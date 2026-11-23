// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ExamResult } from "@/contracts/quiz";
import { FULL_EXAM_QUESTION_COUNT } from "@/core/constants";

vi.mock("@/lib/api-client", () => ({ api: vi.fn() }));

import { ExamResultsView } from "@/components/quiz/ExamResultsView";

function result(correct: number, total: number): ExamResult {
  return {
    attemptId: "a1",
    totalQuestions: total,
    correctCount: correct,
    scorePercent: Math.round((correct / total) * 100),
    domainBreakdown: [
      { domainId: "d1", domainNumber: "1.0", title: "General security concepts", total, correct },
    ],
    responses: [
      {
        questionId: "q1",
        selectedIndex: 2,
        correctIndex: 0,
        isCorrect: false,
        explanation: "SSH uses port 22.",
        questionText: "Which port does SSH use?",
        options: ["22", "23", "80", "443"],
        domainId: "d1",
      },
      {
        questionId: "q2",
        selectedIndex: 3,
        correctIndex: 3,
        isCorrect: true,
        explanation: "HTTPS uses port 443.",
        questionText: "Which port does HTTPS use?",
        options: ["22", "23", "80", "443"],
        domainId: "d1",
      },
    ],
    readiness: { overallScore: 58.4, isPreliminary: false },
  };
}

function view(r: ExamResult, fullExam: boolean, title = "You have completed the practice exam.") {
  return render(
    <ExamResultsView title={title} result={r} backHref="/dashboard" backLabel="Return to your study plan" fullExam={fullExam} />
  );
}

describe("ExamResultsView", () => {
  it("opens on the result as a sentence, which takes the focus, with the score in words", () => {
    const { container } = view(result(70, FULL_EXAM_QUESTION_COUNT), true);
    expect(screen.getByRole("heading", { level: 2, name: "You have completed the practice exam." })).toHaveFocus();
    expect(container).toHaveTextContent(
      `You answered 70 of ${FULL_EXAM_QUESTION_COUNT} questions correctly. Your readiness score is now 58%.`
    );
    expect(screen.getByRole("link", { name: "Return to your study plan" })).toHaveAttribute("href", "/dashboard");
  });

  it("draws a full practice exam against the readiness target", () => {
    const { container } = view(result(70, FULL_EXAM_QUESTION_COUNT), true);
    expect(container).toHaveTextContent("The readiness target is 75%.");
    expect(screen.getByText("Target met")).toBeInTheDocument();
  });

  it("does not call a drill of ten questions a measure of readiness", () => {
    const { container } = view(result(9, 10), false, "You have completed the domain drill.");
    expect(container).not.toHaveTextContent("The readiness target is");
    expect(screen.queryByText("Target met")).toBeNull();
    expect(screen.getByText("Strong result")).toBeInTheDocument();
  });

  it("does not draw a practice exam that was served short against the target either", () => {
    const { container } = view(result(18, 20), true);
    expect(container).not.toHaveTextContent("The readiness target is");
    expect(screen.getByText("Strong result")).toBeInTheDocument();
  });

  it("marks each reviewed question in words, not by colour alone", () => {
    view(result(70, FULL_EXAM_QUESTION_COUNT), true);
    const review = screen.getByRole("heading", { level: 2, name: "Question review" }).parentElement!;
    const [first, second] = [...review.querySelectorAll("details")];
    expect(within(first).getByText("Incorrect:")).toHaveClass("sr-only");
    expect(within(second).getByText("Correct:")).toHaveClass("sr-only");
    expect(first).toHaveTextContent("Correct answer: 22");
    expect(first).toHaveTextContent("Your answer: 80");
    expect(first).toHaveTextContent("SSH uses port 22.");
  });
});
