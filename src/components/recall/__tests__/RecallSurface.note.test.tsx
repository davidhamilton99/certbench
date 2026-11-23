// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getRecallDecks } from "@/data/recall";

// The drill has its own tests. Here it is a stand-in that answers one question per press.
vi.mock("@/components/recall/RecallPlayer", () => ({
  MIXED_DECK_KEY: "__mixed__",
  RecallPlayer: ({
    deckKey,
    onAnswer,
  }: {
    deckKey: string;
    onAnswer?: (tableId: string, itemId: string, correct: boolean) => void;
  }) => (
    <button type="button" onClick={() => onAnswer?.(deckKey, "item", true)}>
      Answer one question
    </button>
  ),
}));
vi.mock("@/components/marketing/SubnettingDrillLazy", () => ({
  SubnettingDrillLazy: () => <div>subnetting</div>,
}));

import { RecallSurface } from "@/components/recall/RecallSurface";

const HEADING = "Recall is one part of studying on CertBench.";

describe("Recall's note about the rest of CertBench", () => {
  // CompTIA does not publish what its exams are made of, so the note says what CertBench offers beside Recall.
  it("says what the study path and the study plan offer, and nothing about what the exam is made of", async () => {
    const user = userEvent.setup();
    const cert = "security-plus-sy0-701";
    render(<RecallSurface decks={getRecallDecks(cert)} certSlug={cert} />);
    const answer = screen.getByRole("button", { name: "Answer one question" });
    for (let i = 0; i < 20; i++) await user.click(answer);
    const note = screen.getByRole("heading", { name: HEADING }).closest("div.glass")!;
    const words = (note.textContent ?? "").replace(/\s+/g, " ");
    expect(words).toContain(
      "You have answered 20 recall questions in this session, 100% of them correctly. Your study path also has exam-style questions and a hands-on lab for each domain, and your study plan shows where you stand in each one."
    );
    expect(words).not.toMatch(/of the exam|the exam also|scenario questions/i);
    expect(screen.getByRole("link", { name: "See your study plan" })).toHaveAttribute("href", `/dashboard?cert=${cert}`);
  });

  it("hands the focus to the drill when it is dismissed, so the keyboard does not start again at the top", async () => {
    const user = userEvent.setup();
    const cert = "security-plus-sy0-701";
    render(<RecallSurface decks={getRecallDecks(cert)} certSlug={cert} />);
    const answer = screen.getByRole("button", { name: "Answer one question" });
    for (let i = 0; i < 20; i++) await user.click(answer);
    expect(screen.getByRole("heading", { name: HEADING })).toBeInTheDocument();

    screen.getByRole("button", { name: "Dismiss this note" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("heading", { name: HEADING })).toBeNull();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
    expect(document.body).not.toHaveFocus();
    // The next stop for the Tab key is inside the drill.
    await user.tab();
    expect(screen.getByRole("button", { name: "Answer one question" })).toHaveFocus();
  });
});
