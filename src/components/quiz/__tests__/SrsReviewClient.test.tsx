// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";

const DEFAULT_EXPLANATION = "SSH replaced Telnet for remote administration.";

const server = vi.hoisted(() => ({
  cards: [] as {
    questionId: string;
    questionText: string;
    options: string[];
    domainId: string;
    overdueDays: number;
    keepOrder?: boolean;
  }[],
  correctIndex: 0,
  explanation: "",
  /** The stored index of each answer that was sent to be marked. */
  submitted: [] as (number | undefined)[],
  failStart: false,
}));

vi.mock("@/lib/api-client", () => ({
  api: async (contract: { path: string }, input: { selectedIndex?: number }) => {
    if (contract.path === "/api/srs-review/start") {
      if (server.failStart) throw new Error("fetch failed");
      return { cards: server.cards, totalDue: server.cards.length };
    }
    if (contract.path === "/api/srs-review/submit") {
      server.submitted.push(input.selectedIndex);
      return {
        isCorrect: input.selectedIndex === server.correctIndex,
        correctIndex: server.correctIndex,
        explanation: server.explanation,
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
  server.explanation = DEFAULT_EXPLANATION;
  server.submitted = [];
  server.failStart = false;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
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

describe("SrsReviewClient, a card whose explanation names an answer by its letter", () => {
  /** The session's shuffle seed, fixed. With it the card below would be shuffled out of its stored order. */
  const SEED = "00000000-0000-4000-8000-00000000cafe";
  const KEPT = {
    questionId: "q1",
    questionText: "Which tool scans a host for known vulnerabilities?",
    options: ["Wireshark", "Nmap", "Nessus", "Netcat"],
    domainId: "d1",
    overdueDays: 0,
    keepOrder: true,
  };
  const EXPLANATION =
    "A vulnerability scanner compares a host with a list of known weaknesses. Nessus (option C) is one, and Wireshark (option A) captures packets.";
  const shuffled = seededPermutation(SEED, KEPT.questionId, KEPT.options.length);

  const answers = () => within(screen.getByRole("group", { name: KEPT.questionText })).getAllByRole("button");
  const keyBox = (answer: HTMLElement) => answer.querySelector("[aria-hidden]")?.textContent;

  beforeEach(() => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue(SEED);
    server.explanation = EXPLANATION;
    server.correctIndex = 2;
  });

  it("would not be in its stored order if it were shuffled", () => {
    expect(shuffled).not.toEqual([0, 1, 2, 3]);
    expect(shuffled[2]).not.toBe(2);
  });

  it("shows the card in its stored order, so that the letter in the explanation names the answer under that letter", async () => {
    server.cards = [KEPT];
    render(<SrsReviewClient certId="cert" />);
    await settle();

    expect(answers().map(keyBox)).toEqual(["A", "B", "C", "D"]);
    // The letter is in each answer's name too. (The test's DOM library drops the space at the edge of an inline span.)
    expect(answers()[0]).toHaveAccessibleName(/^A\. ?Wireshark$/);
    expect(answers()[2]).toHaveAccessibleName(/^C\. ?Nessus$/);

    // The key C answers with the answer lettered C.
    fireEvent.keyDown(prompt(), { key: "c" });
    await settle();
    expect(server.submitted).toEqual([2]);
    expect(screen.getByText("Correct.")).toBeInTheDocument();

    // The explanation is printed under answers that have not moved: "option C" is Nessus and "option A" is Wireshark.
    expect(screen.getByText(/Nessus \(option C\) is one, and Wireshark \(option A\) captures packets\./)).toBeInTheDocument();
    expect(answers()[2]).toHaveAccessibleName(/^Your answer, which is correct: ?C\. ?Nessus$/);
    expect(answers()[0]).toHaveAccessibleName(/^A\. ?Wireshark$/);
    expect([answers()[1], answers()[3]].map(keyBox)).toEqual(["B", "D"]);
  });

  it("answers with the stored answer when the answer lettered A is pressed", async () => {
    server.cards = [KEPT];
    render(<SrsReviewClient certId="cert" />);
    await settle();
    fireEvent.click(answers()[0]);
    await settle();
    expect(server.submitted).toEqual([0]);
    expect(screen.getByText("Incorrect. The correct answer is Nessus.")).toBeInTheDocument();
  });

  it("still shuffles a card whose explanation names no letter", async () => {
    server.cards = [{ ...KEPT, keepOrder: undefined }];
    server.explanation = DEFAULT_EXPLANATION;
    render(<SrsReviewClient certId="cert" />);
    await settle();

    expect(answers().map((a) => a.textContent?.slice(1))).toEqual(shuffled.map((i) => KEPT.options[i]));
    fireEvent.keyDown(prompt(), { key: "c" });
    await settle();
    expect(server.submitted).toEqual([shuffled[2]]);
  });
});
