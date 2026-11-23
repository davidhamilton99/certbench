// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { StudyQuestion } from "@/contracts/study-sets";

vi.mock("@/lib/api-client", () => ({ api: async () => ({ saved: true }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { StudySetPlayer } from "@/components/quiz/StudySetPlayer";

const QUESTIONS: StudyQuestion[] = [
  {
    id: "q1",
    question_type: "multiple_choice",
    question_text: "Which protocol encrypts a remote shell?",
    options: [
      { text: "Telnet", is_correct: false },
      { text: "SSH", is_correct: true },
      { text: "FTP", is_correct: false },
    ],
    correct_index: 1,
    explanation: "SSH encrypts the whole session.",
    sort_order: 0,
  },
  {
    id: "q2",
    question_type: "true_false",
    question_text: "HTTPS uses port 443.",
    options: [
      { text: "True", is_correct: true },
      { text: "False", is_correct: false },
    ],
    correct_index: 0,
    explanation: null,
    sort_order: 1,
  },
];

const prompt = () => screen.getByRole("heading", { level: 2 });

describe("StudySetPlayer", () => {
  it("marks an answer in a sentence, waits for Continue and gives the next question the focus", () => {
    render(<StudySetPlayer setId="set" questions={QUESTIONS} seed="seed" persistProgress={false} />);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(document.body).toHaveFocus();

    // The answers can still be changed until "Check answer", so they are radio buttons.
    fireEvent.click(screen.getByRole("radio", { name: "Telnet" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));

    expect(screen.getByText("Incorrect. The correct answer is SSH.")).toBeInTheDocument();
    expect(screen.getByText(/SSH encrypts the whole session\./)).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();

    fireEvent.click(next);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(prompt()).toHaveFocus();
  });

  it("ends on the result as a sentence, which takes the focus", () => {
    render(<StudySetPlayer setId="set" questions={QUESTIONS} seed="seed" persistProgress={false} />);
    fireEvent.click(screen.getByRole("radio", { name: "SSH" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("radio", { name: "False" }));
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const result = screen.getByRole("heading", { name: "You answered 1 of 2 questions correctly (50%)." });
    expect(result).toHaveFocus();
    expect(screen.getByRole("link", { name: "Return to your study sets" })).toHaveAttribute("href", "/study-materials");
  });

  it("says so when a study set has no questions", () => {
    render(<StudySetPlayer setId="set" questions={[]} seed="seed" />);
    expect(screen.getByText("This study set has no questions.")).toBeInTheDocument();
  });
});
