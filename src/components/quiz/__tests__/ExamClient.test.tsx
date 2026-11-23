// @vitest-environment jsdom
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AnswerInput, ExamQuestion, ExamResult } from "@/contracts/quiz";
import type { QuizConfig } from "@/core/quiz-engine/types";
import { seededPermutation } from "@/core/quiz-engine/shuffle";

// The result screens hold two small forms that call the server (a report on a
// question, the exam date). Neither is used here.
vi.mock("@/lib/api-client", () => ({ api: vi.fn() }));

import { ExamClient } from "@/components/quiz/ExamClient";

/**
 * A practice exam and the diagnostic are the same client: the questions, then
 * the result with every question reviewed. An explanation is printed only in
 * that review, beside the answers. Where it names an answer by its letter, the
 * letter has to name the answer that the attempt showed under it, and the
 * review has to show it under that letter again.
 */

/** The attempt's shuffle seed. With it neither question below is shuffled into its stored order. */
const SEED = "attempt-7";

const QUESTIONS: ExamQuestion[] = [
  {
    id: "q1",
    question_text: "Which tool scans a host for known vulnerabilities?",
    options: ["Wireshark", "Nmap", "Nessus", "Netcat"],
    domain_id: "d1",
    // The server sends this with a question whose explanation names a letter.
    keepOrder: true,
  },
  { id: "q2", question_text: "Which port does HTTPS use?", options: ["22", "23", "80", "443"], domain_id: "d1" },
];

/** What the server holds until the attempt is submitted. */
const KEY: Record<string, { correctIndex: number; explanation: string }> = {
  q1: {
    correctIndex: 2,
    explanation:
      "A vulnerability scanner compares a host with a list of known weaknesses. Nessus (option C) is one, and Wireshark (option A) captures packets.",
  },
  q2: { correctIndex: 3, explanation: "HTTPS uses port 443." },
};

const CONFIG: QuizConfig = { mode: "practice_exam", grading: "server_at_end", allowFlagging: true, allowReview: true };

function grade(answers: AnswerInput[]): ExamResult {
  const responses = answers.map((a) => {
    const q = QUESTIONS.find((item) => item.id === a.questionId)!;
    const key = KEY[q.id];
    return {
      questionId: q.id,
      selectedIndex: a.selectedIndex,
      correctIndex: key.correctIndex,
      isCorrect: a.selectedIndex === key.correctIndex,
      explanation: key.explanation,
      questionText: q.question_text,
      options: q.options,
      domainId: q.domain_id,
    };
  });
  const correct = responses.filter((r) => r.isCorrect).length;
  return {
    attemptId: "a1",
    totalQuestions: responses.length,
    correctCount: correct,
    scorePercent: Math.round((correct / responses.length) * 100),
    domainBreakdown: [
      { domainId: "d1", domainNumber: "1.0", title: "General security concepts", total: responses.length, correct },
    ],
    responses,
    readiness: null,
  };
}

function client(extra: Partial<ComponentProps<typeof ExamClient>> = {}) {
  const submit = vi.fn(async (_attemptId: string, answers: AnswerInput[]) => grade(answers));
  render(
    <ExamClient
      config={CONFIG}
      start={async () => ({
        attemptId: "a1",
        questions: QUESTIONS,
        resume: {
          index: 0,
          responses: {},
          flagged: [],
          revealed: [],
          startedAt: "2026-11-22T12:00:00.000Z",
          seed: SEED,
          questionIds: QUESTIONS.map((q) => q.id),
        },
      })}
      saveProgress={async () => undefined}
      submit={submit}
      submitLabel="Submit your answers"
      resultsTitle="You have completed the practice exam."
      backHref="/dashboard"
      backLabel="Return to your study plan"
      {...extra}
    />
  );
  return submit;
}

const prompt = () => screen.getByRole("heading", { level: 2 });
const keyBox = (answer: HTMLElement) => answer.querySelector("[aria-hidden]")?.textContent;

/** Answers both questions with the key C, then submits. Returns the answers as the attempt showed them. */
async function sit() {
  await screen.findByText("Question 1 of 2");
  const first = screen.getAllByRole("radio").map((a) => `${keyBox(a)}. ${a.textContent?.replace(/^[A-D][A-D]\. /, "")}`);
  fireEvent.keyDown(prompt(), { key: "c" });
  fireEvent.keyDown(prompt(), { key: "ArrowRight" });
  const second = screen.getAllByRole("radio").map((a) => `${keyBox(a)}. ${a.textContent?.slice(1)}`);
  fireEvent.keyDown(prompt(), { key: "c" });
  fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Submit your answers" }));
  });
  return { first, second };
}

/** The lettered answers of each reviewed question, as they are read. */
function reviewed(): string[][] {
  const review = screen.getByRole("heading", { level: 2, name: "Question review" }).parentElement!;
  return [...review.querySelectorAll("details")].map((question) =>
    [...question.querySelectorAll("p")].map((p) => p.textContent ?? "").filter((text) => /^[A-F]\. /.test(text))
  );
}

/** The same answers with the marks taken off, to set beside what the attempt showed. */
const unmarked = (answers: string[]) => answers.map((text) => text.replace(/(?:Correct answer|Your answer): /, ""));

describe("ExamClient, from the questions to their review", () => {
  it("would show neither question in its stored order if both were shuffled", () => {
    expect(seededPermutation(SEED, "q1", 4)).not.toEqual([0, 1, 2, 3]);
    expect(seededPermutation(SEED, "q2", 4)).not.toEqual([0, 1, 2, 3]);
  });

  it("shows a practice exam's result with each answer under the letter the attempt showed it under", async () => {
    const submit = client({ fullExam: true });
    const shown = await sit();

    // The question whose explanation names letters was shown in its stored order, and C recorded the third answer.
    expect(shown.first).toEqual(["A. Wireshark", "B. Nmap", "C. Nessus", "D. Netcat"]);
    const order = seededPermutation(SEED, "q2", 4);
    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(submit.mock.calls[0][1]).toEqual([
      { questionId: "q1", selectedIndex: 2 },
      { questionId: "q2", selectedIndex: order[2] },
    ]);

    // The result: the explanation's "option C" is the answer lettered C, which is the correct one.
    await screen.findByRole("heading", { level: 2, name: "You have completed the practice exam." });
    expect(screen.getByText(KEY.q1.explanation)).toBeInTheDocument();
    const [first, second] = reviewed();
    expect(first).toEqual(["A. Wireshark", "B. Nmap", "C. Correct answer: Nessus", "D. Netcat"]);
    expect(unmarked(first)).toEqual(shown.first);
    // The other question is reviewed in the order it was shown in, not in its stored order.
    expect(unmarked(second)).toEqual(shown.second);
    expect(unmarked(second)).toEqual(order.map((stored, place) => `${"ABCD"[place]}. ${QUESTIONS[1].options[stored]}`));
  });

  it("shows the diagnostic's result the same way", async () => {
    client({
      config: { mode: "diagnostic", grading: "server_at_end", allowFlagging: false, allowReview: true },
      submitLabel: "Finish the diagnostic",
      resultsTitle: "You have completed the diagnostic.",
      diagnosticCertId: "cert",
      certName: "Security+",
      examCode: "SY0-701",
      domainWeights: { d1: 100 },
    });
    await screen.findByText("Question 1 of 2");
    const first = screen.getAllByRole("radio").map(keyBox);
    expect(first).toEqual(["A", "B", "C", "D"]);
    expect(screen.getAllByRole("radio")[2]).toHaveAccessibleName(/^C\. ?Nessus$/);
    fireEvent.keyDown(prompt(), { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Finish the diagnostic" }));
    });

    await screen.findByRole("heading", { name: "You have completed the Security+ SY0-701 diagnostic." });
    const review = screen.getByRole("heading", { level: 2, name: "Question review" }).parentElement!;
    const rows = [...review.querySelectorAll("details p")].map((p) => p.textContent);
    // The member chose A, which the explanation calls "Wireshark (option A)"; the correct answer is C.
    expect(rows.slice(0, 4)).toEqual(["A. Your answer: Wireshark", "B. Nmap", "C. Correct answer: Nessus", "D. Netcat"]);
    expect(rows[4]).toBe(KEY.q1.explanation);
  });
});
