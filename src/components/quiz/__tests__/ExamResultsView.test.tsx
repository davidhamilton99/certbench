// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ExamResult } from "@/contracts/quiz";
import { FULL_EXAM_QUESTION_COUNT } from "@/core/constants";
import { seededPermutation } from "@/core/quiz-engine/shuffle";

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

  it("counts a set of one question as one question", () => {
    const { container } = view({ ...result(1, 1), readiness: null }, false, "You have completed the domain drill.");
    expect(container).toHaveTextContent("You answered 1 of 1 question correctly.");
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

describe("ExamResultsView, the answers of each reviewed question", () => {
  /** The attempt's shuffle seed. With it neither question below is shuffled into its stored order. */
  const SEED = "attempt-7";
  const EXPLANATION =
    "A vulnerability scanner compares a host with a list of known weaknesses. Nessus (option C) is one, and Wireshark (option A) captures packets.";

  function reviewed(): ExamResult {
    return {
      ...result(1, 2),
      responses: [
        {
          questionId: "q1",
          selectedIndex: 0,
          correctIndex: 2,
          isCorrect: false,
          explanation: EXPLANATION,
          questionText: "Which tool scans a host for known vulnerabilities?",
          options: ["Wireshark", "Nmap", "Nessus", "Netcat"],
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
    };
  }

  /** The lettered answers of each reviewed question, as they are read. */
  function answers(): string[][] {
    const review = screen.getByRole("heading", { level: 2, name: "Question review" }).parentElement!;
    return [...review.querySelectorAll("details")].map((question) =>
      [...question.querySelectorAll("p")].map((p) => p.textContent ?? "").filter((text) => /^[A-F]\. /.test(text))
    );
  }

  it("would show neither question in its stored order if both were shuffled", () => {
    expect(seededPermutation(SEED, "q1", 4)).not.toEqual([0, 1, 2, 3]);
    expect(seededPermutation(SEED, "q2", 4)).not.toEqual([0, 1, 2, 3]);
  });

  it("lists a question whose explanation names a letter in its stored order, so that the letter names the answer under it", () => {
    render(
      <ExamResultsView
        title="You have completed the practice exam."
        result={reviewed()}
        backHref="/dashboard"
        backLabel="Return to your study plan"
        seed={SEED}
        keepOrder={["q1"]}
      />
    );
    const [first] = answers();
    // The explanation says "Nessus (option C)" and "Wireshark (option A)".
    expect(first).toEqual(["A. Your answer: Wireshark", "B. Nmap", "C. Correct answer: Nessus", "D. Netcat"]);
    expect(screen.getByText(EXPLANATION)).toBeInTheDocument();
  });

  it("lists every other question in the order, and under the letters, that the attempt showed it", () => {
    render(
      <ExamResultsView
        title="You have completed the practice exam."
        result={reviewed()}
        backHref="/dashboard"
        backLabel="Return to your study plan"
        seed={SEED}
        keepOrder={["q1"]}
      />
    );
    const order = seededPermutation(SEED, "q2", 4);
    const options = ["22", "23", "80", "443"];
    const [, second] = answers();
    expect(second).toEqual(
      order.map((stored, place) => `${"ABCD"[place]}. ${stored === 3 ? "Correct answer: " : ""}${options[stored]}`)
    );
  });

  it("lists the stored order where the attempt's seed is not known", () => {
    view(reviewed(), false);
    expect(answers()).toEqual([
      ["A. Your answer: Wireshark", "B. Nmap", "C. Correct answer: Nessus", "D. Netcat"],
      ["A. 22", "B. 23", "C. 80", "D. Correct answer: 443"],
    ]);
  });
});
