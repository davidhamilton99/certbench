// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ExamQuestion } from "@/contracts/quiz";
import type { QuizConfig } from "@/core/quiz-engine/types";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import { QuizShell } from "@/components/quiz/QuizShell";

const QUESTIONS: ExamQuestion[] = [
  { id: "q1", question_text: "Which port does SSH use?", options: ["22", "23", "80", "443"], domain_id: "d1" },
  { id: "q2", question_text: "Which port does HTTPS use?", options: ["22", "23", "80", "443"], domain_id: "d1" },
  { id: "q3", question_text: "Which port does DNS use?", options: ["53", "67", "123", "161"], domain_id: "d2" },
];

const CONFIG: QuizConfig = {
  mode: "practice_exam",
  grading: "server_at_end",
  allowFlagging: true,
  allowReview: true,
};

const SEED = "attempt-1";

function shell(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(<QuizShell questions={QUESTIONS} config={CONFIG} seed={SEED} onSubmit={onSubmit} />);
  return onSubmit;
}

const prompt = () => screen.getByRole("heading", { level: 2 });
const answered = (n: number) => screen.getByText(`${n} of ${QUESTIONS.length} answered`);

describe("QuizShell", () => {
  it("draws the answers as one group of radio buttons, named by the question", () => {
    shell();
    const group = screen.getByRole("radiogroup", { name: QUESTIONS[0].question_text });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
  });

  it("takes no focus as the page loads", () => {
    shell();
    expect(document.body).toHaveFocus();
  });

  it("answers with a letter key only while the focus is inside the player", async () => {
    const onSubmit = shell();

    // With the focus elsewhere on the page (the header, a link) a key answers nothing.
    fireEvent.keyDown(document.body, { key: "a" });
    fireEvent.keyDown(document.body, { key: "1" });
    expect(answered(0)).toBeInTheDocument();

    // Inside the player the same key chooses the answer shown first.
    fireEvent.keyDown(prompt(), { key: "a" });
    expect(answered(1)).toBeInTheDocument();
    expect(screen.getAllByRole("radio")[0]).toBeChecked();

    // The answer recorded is the stored one at that place, not the place on screen.
    fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit your answers" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const first = seededPermutation(SEED, "q1", 4)[0];
    expect(onSubmit.mock.calls[0][0]).toEqual([{ questionId: "q1", selectedIndex: first }]);
  });

  it("changes the question with the arrow keys from the player, and gives the new question the focus", () => {
    shell();
    fireEvent.keyDown(document.body, { key: "ArrowRight" });
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();

    fireEvent.keyDown(prompt(), { key: "ArrowRight" });
    expect(screen.getByText("Question 2 of 3")).toBeInTheDocument();
    expect(prompt()).toHaveTextContent(QUESTIONS[1].question_text);
    expect(prompt()).toHaveFocus();

    fireEvent.keyDown(prompt(), { key: "ArrowLeft" });
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
  });

  it("leaves the arrow keys to the answers while an answer has the focus", () => {
    shell();
    const first = screen.getAllByRole("radio")[0];
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    // Still the first question: the key moved between the answers, as in any radio group.
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
  });

  it("gives the review its heading and the focus, and names each cell by its number and state", () => {
    shell();
    fireEvent.keyDown(prompt(), { key: "b" });
    fireEvent.click(screen.getByRole("button", { name: "Flag for review" }));
    fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));

    const heading = screen.getByRole("heading", { name: "Review your answers before you submit" });
    expect(heading).toHaveFocus();
    expect(
      screen.getByText(
        /You have answered 1 of 3 questions\. 2 questions are not answered\. 1 question is flagged for review\./
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1: answered, flagged" })).toBeInTheDocument();

    // A cell returns to its question, which takes the focus.
    fireEvent.click(screen.getByRole("button", { name: "3: not answered" }));
    expect(screen.getByText("Question 3 of 3")).toBeInTheDocument();
    expect(prompt()).toHaveFocus();
  });

  it("counts a set of one question as one question", () => {
    render(<QuizShell questions={QUESTIONS.slice(0, 1)} config={CONFIG} seed={SEED} onSubmit={vi.fn()} />);
    fireEvent.keyDown(prompt(), { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));
    expect(screen.getByText(/You have answered 1 of 1 question\. Choose a question number to return to it\./)).toBeInTheDocument();
  });

  it("keeps one name on the flag button and says its state", () => {
    shell();
    const flag = screen.getByRole("button", { name: "Flag for review" });
    expect(flag).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(flag);
    expect(screen.getByRole("button", { name: "Flag for review" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says a failed submit in a sentence, keeps the answers and offers to try again", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Request failed (502)"));
    shell(onSubmit);
    fireEvent.keyDown(prompt(), { key: "a" });
    fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit your answers" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Your answers could not be submitted. They are kept on this page. Please try again."
    );
    // The machine's own text is never shown.
    expect(alert).not.toHaveTextContent("502");
    const retry = screen.getByRole("button", { name: "Try again" });
    await waitFor(() => expect(retry).toHaveFocus());

    fireEvent.click(retry);
    expect(answered(1)).toBeInTheDocument();
  });
});

describe("QuizShell, a question whose explanation names an answer by its letter", () => {
  // The explanation of the first question says "Nessus (option C)". It is printed
  // with the result, so the question is shown in its stored order here.
  const KEPT: ExamQuestion[] = [
    {
      id: "q1",
      question_text: "Which tool scans a host for known vulnerabilities?",
      options: ["Wireshark", "Nmap", "Nessus", "Netcat"],
      domain_id: "d1",
      keepOrder: true,
    },
    { id: "q2", question_text: "Which port does HTTPS use?", options: ["22", "23", "80", "443"], domain_id: "d1" },
  ];

  it("shows it in its stored order, and a letter key records the answer under that letter", async () => {
    // Shuffled with this seed, neither question would be in its stored order.
    expect(seededPermutation(SEED, "q1", 4)).not.toEqual([0, 1, 2, 3]);
    expect(seededPermutation(SEED, "q2", 4)).not.toEqual([0, 1, 2, 3]);
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<QuizShell questions={KEPT} config={CONFIG} seed={SEED} onSubmit={onSubmit} />);

    const answers = screen.getAllByRole("radio");
    expect(answers.map((a) => a.querySelector("[aria-hidden]")?.textContent)).toEqual(["A", "B", "C", "D"]);
    // (The test's DOM library drops the space at the edge of an inline span; a browser keeps it.)
    expect(answers[2]).toHaveAccessibleName(/^C\. ?Nessus$/);

    fireEvent.keyDown(prompt(), { key: "c" });
    expect(screen.getAllByRole("radio")[2]).toBeChecked();

    // The next question is shuffled as before: the same key records the stored answer at that place.
    fireEvent.keyDown(prompt(), { key: "ArrowRight" });
    expect(screen.getAllByRole("radio")[0]).toHaveAccessibleName(KEPT[1].options[seededPermutation(SEED, "q2", 4)[0]]);
    fireEvent.keyDown(prompt(), { key: "c" });

    fireEvent.click(screen.getByRole("button", { name: "Review your answers" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit your answers" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual([
      { questionId: "q1", selectedIndex: 2 },
      { questionId: "q2", selectedIndex: seededPermutation(SEED, "q2", 4)[2] },
    ]);
  });
});
