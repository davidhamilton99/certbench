// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { getRecallDecks } from "@/data/recall";
import { RecallSurface } from "@/components/recall/RecallSurface";

// The subnetting drill is its own surface, covered elsewhere.
vi.mock("@/components/marketing/SubnettingDrillLazy", () => ({
  SubnettingDrillLazy: () => <div>subnetting</div>,
}));

const CERTS = [
  "security-plus-sy0-701",
  "network-plus-n10-009",
  "a-plus-core1-220-1201",
  "a-plus-core2-220-1202",
] as const;

/**
 * A Pro member opening Recall must get a working drill on every deck of their
 * exam: one broken deck takes the whole page down to "Something went wrong".
 */
describe.each(CERTS)("Recall for %s", (cert) => {
  const decks = getRecallDecks(cert);

  it("has decks to drill", () => {
    expect(decks.length).toBeGreaterThan(0);
  });

  it.each(decks.map((d) => [d.config.label, d.config.tableId] as const))(
    "opens the %s deck",
    (_label, tableId) => {
      render(<RecallSurface decks={decks} certSlug={cert} initialDeckKey={tableId} />);
      expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
    }
  );

  it("opens the mixed deck", () => {
    render(<RecallSurface decks={decks} certSlug={cert} />);
    const mixed = screen.queryByRole("tab", { name: "Mixed" });
    if (mixed) fireEvent.click(mixed);
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });
});
