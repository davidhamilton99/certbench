// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

const server = vi.hoisted(() => ({
  cards: [] as { questionId: string; questionText: string; options: string[]; domainId: string; overdueDays: number }[],
  correctIndex: 0,
  failStart: false,
}));

vi.mock("@/lib/api-client", () => ({
  api: async (contract: { path: string }, input: { selectedIndex?: number }) => {
    if (contract.path === "/api/srs-review/start") {
      if (server.failStart) throw new Error("fetch failed");
      return { cards: server.cards, totalDue: server.cards.length };
    }
    if (contract.path === "/api/srs-review/submit") {
      return {
        isCorrect: input.selectedIndex === server.correctIndex,
        correctIndex: server.correctIndex,
        explanation: "SSH replaced Telnet for remote administration.",
        nextReviewAt: "2026-11-25T00:00:00Z",
        intervalDays: 3,
        streak: 4,
      };
    }
    return { suspended: true };
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { SrsReviewClient } from "@/components/quiz/SrsReviewClient";

const CARDS = [
  { questionId: "q1", questionText: "Which port does SSH use?", options: ["22", "23", "80", "443"], domainId: "d1", overdueDays: 2 },
  { questionId: "q2", questionText: "Which port does HTTPS use?", options: ["22", "23", "80", "443"], domainId: "d1", overdueDays: 0 },
];

/** Lets the mocked requests settle. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

const prompt = () => screen.getByRole("heading", { level: 2 });

beforeEach(() => {
  server.cards = CARDS;
  server.correctIndex = 0;
  server.failStart = false;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("SrsReviewClient", () => {
  it("shows the first question with its answers as buttons in a group named by the question", async () => {
    render(<SrsReviewClient certId="cert" />);
    expect(screen.getByRole("status")).toHaveTextContent("Your review is being prepared.");
    await settle();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Due 2 days ago")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: CARDS[0].questionText })).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("waits for Continue after a correct answer: nothing moves by itself, and no streak is shown", async () => {
    vi.useFakeTimers();
    const { container } = render(<SrsReviewClient certId="cert" />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "22" }));
    await settle();

    expect(screen.getByText("Correct.")).toBeInTheDocument();
    expect(screen.getByText("This question will be shown again in 3 days.")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();
    expect(next).toHaveAccessibleDescription(/Correct\. SSH replaced Telnet/);
    expect(container).not.toHaveTextContent(/streak/i);

    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Correct.")).toBeInTheDocument();

    // Continue brings the next question, which takes the focus so that it is read.
    fireEvent.click(next);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(prompt()).toHaveTextContent(CARDS[1].questionText);
    expect(prompt()).toHaveFocus();
  });

  it("states the correct answer after an incorrect one, and ends on a sentence that takes the focus", async () => {
    render(<SrsReviewClient certId="cert" />);
    await settle();

    fireEvent.click(screen.getByRole("button", { name: "80" }));
    await settle();
    expect(screen.getByText("Incorrect. The correct answer is 22.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: "22" }));
    await settle();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const done = screen.getByRole("heading", { name: "You answered 1 of 2 questions correctly." });
    expect(done).toHaveFocus();
  });

  it("answers with a letter key only while the focus is inside the card", async () => {
    render(<SrsReviewClient certId="cert" />);
    await settle();

    fireEvent.keyDown(document.body, { key: "a" });
    await settle();
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    fireEvent.keyDown(prompt(), { key: "a" });
    await settle();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("says a failed start in a sentence, never the machine's own text", async () => {
    server.failStart = true;
    render(<SrsReviewClient certId="cert" />);
    await settle();
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Your review could not be loaded. Please try again.");
    expect(alert).not.toHaveTextContent(/fetch/i);
  });

  it("says so when nothing is due", async () => {
    server.cards = [];
    render(<SrsReviewClient certId="cert" />);
    await settle();
    expect(screen.getByText(/No questions are due for review\./)).toBeInTheDocument();
  });
});
