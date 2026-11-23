// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

/** The one tab that is selected. */
function selectedTab(): HTMLElement {
  const selected = screen.getAllByRole("tab", { selected: true });
  expect(selected).toHaveLength(1);
  return selected[0];
}

/**
 * A Pro member opening Recall must get a working drill on every deck of their
 * exam: one broken deck takes the whole page down to the error screen.
 */
describe.each(CERTS)("Recall for %s", (cert) => {
  const decks = getRecallDecks(cert);

  it("has decks to drill", () => {
    expect(decks.length).toBeGreaterThan(0);
  });

  it.each(decks.map((d) => [d.config.label, d.config.tableId] as const))(
    "opens the %s deck on a question",
    (label, tableId) => {
      render(<RecallSurface decks={decks} certSlug={cert} initialDeckKey={tableId} />);
      // The tab prints the deck's name as the data has it, and the data writes "and" out.
      expect(selectedTab()).toHaveTextContent(label);
      expect(selectedTab()).not.toHaveTextContent("&");
      // The first question of the deck is on its card.
      expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    }
  );

  it("opens the mixed deck on a question", () => {
    render(<RecallSurface decks={decks} certSlug={cert} />);
    const mixed = screen.queryByRole("tab", { name: "Mixed" });
    // An exam with one deck has nothing to mix.
    if (!mixed) {
      expect(decks).toHaveLength(1);
      return;
    }
    fireEvent.mouseDown(mixed, { button: 0 });
    expect(selectedTab()).toBe(mixed);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });
});

describe("Recall's tabs", () => {
  const cert = "security-plus-sy0-701";
  const decks = getRecallDecks(cert);

  it("are real tabs: one stop for the Tab key, the arrow keys move between them, and the drill is their panel", async () => {
    render(<RecallSurface decks={decks} certSlug={cert} />);
    const tabs = screen.getAllByRole("tab");
    // One stop for the Tab key: the row of tabs, which hands the focus to the selected tab.
    expect(screen.getByRole("tablist", { name: "Drill" })).toHaveAttribute("tabindex", "0");
    expect(tabs.slice(1).map((t) => t.getAttribute("tabindex"))).toEqual(tabs.slice(1).map(() => "-1"));
    expect(tabs[tabs.length - 1]).toHaveTextContent("Subnetting");

    act(() => tabs[0].focus());
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(tabs[0], { key: "ArrowRight" });
    await waitFor(() => expect(tabs[1]).toHaveFocus());
    expect(selectedTab()).toBe(tabs[1]);
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName(tabs[1].textContent ?? "");
  });

  it("opens the subnetting drill from the last tab", () => {
    render(<RecallSurface decks={decks} certSlug={cert} />);
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Subnetting" }), { button: 0 });
    expect(screen.getByText("subnetting")).toBeInTheDocument();
  });

  it("offers a typed answer only for a deck with short answers, as a pair of pressed buttons", () => {
    const typeable = decks.find((d) => d.typeable);
    if (!typeable) return;
    render(<RecallSurface decks={decks} certSlug={cert} initialDeckKey={typeable.config.tableId} />);
    const group = screen.getByRole("group", { name: "Answer with" });
    expect(group).toBeInTheDocument();
    const typed = screen.getByRole("button", { name: "A typed answer" });
    expect(typed).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(typed);
    expect(typed).toHaveAttribute("aria-pressed", "true");
    // The card now asks for a typed answer, in a labelled field.
    expect(screen.getByRole("textbox")).toHaveAccessibleName(/^Type the /);
  });
});
