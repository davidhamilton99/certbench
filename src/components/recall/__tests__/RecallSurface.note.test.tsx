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

describe("Recall's note about the rest of the exam", () => {
  it("hands the focus to the drill when it is dismissed, so the keyboard does not start again at the top", async () => {
    const user = userEvent.setup();
    const cert = "security-plus-sy0-701";
    render(<RecallSurface decks={getRecallDecks(cert)} certSlug={cert} />);
    const answer = screen.getByRole("button", { name: "Answer one question" });
    for (let i = 0; i < 20; i++) await user.click(answer);
    expect(screen.getByRole("heading", { name: "Recall is one part of the exam." })).toBeInTheDocument();

    screen.getByRole("button", { name: "Dismiss this note" }).focus();
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("heading", { name: "Recall is one part of the exam." })).toBeNull();
    expect(screen.getByRole("tabpanel")).toHaveFocus();
    expect(document.body).not.toHaveFocus();
    // The next stop for the Tab key is inside the drill.
    await user.tab();
    expect(screen.getByRole("button", { name: "Answer one question" })).toHaveFocus();
  });
});
