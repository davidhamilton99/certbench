// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { getRecallDecks } from "@/data/recall";
import { RecallSurface } from "@/components/recall/RecallSurface";

// The subnetting drill is its own surface, covered elsewhere.
vi.mock("@/components/marketing/SubnettingDrillLazy", () => ({
  SubnettingDrillLazy: () => null,
}));

// The drill is the real one, except where a test needs an answer of a known
// fact: then it is a stand-in that answers its deck's fact "item-x" correctly.
const player = vi.hoisted(() => ({ standIn: false }));
vi.mock("@/components/recall/RecallPlayer", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/components/recall/RecallPlayer")>();
  return {
    ...real,
    RecallPlayer: (props: Parameters<typeof real.RecallPlayer>[0]) =>
      player.standIn ? (
        <button type="button" onClick={() => props.onAnswer?.(props.deckKey, "item-x", true)}>
          Answer one question
        </button>
      ) : (
        <real.RecallPlayer {...props} />
      ),
  };
});

// Node's own experimental `localStorage` global shadows jsdom's.
const store = new Map<string, string>();
Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  },
});

afterEach(() => {
  store.clear();
  player.standIn = false;
  vi.restoreAllMocks();
});

const SECURITY = "security-plus-sy0-701";
const NETWORK = "network-plus-n10-009";

/** This device's record for an exam: the first `n` facts of its first deck were last answered correctly. */
function keep(cert: string, n: number) {
  const deck = getRecallDecks(cert)[0];
  const ids = deck.rows.slice(0, n).map((row) => row[deck.config.ask.key]);
  expect(new Set(ids).size).toBe(n);
  store.set(`recall-mastery:v1:${cert}`, JSON.stringify({ [deck.config.tableId]: ids }));
}

/** The count printed beside "Facts last answered correctly", as "3 of 120 (3%)". */
function count(scope: HTMLElement = document.body): string {
  return within(scope).getByText("Facts last answered correctly").nextElementSibling?.textContent ?? "";
}

describe("Recall's count of the facts last answered correctly", () => {
  it("is empty in the server's HTML, and shows what this device keeps once the page is hydrated, with nothing mismatched", async () => {
    keep(SECURITY, 3);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const recovered = vi.fn();
    const page = <RecallSurface decks={getRecallDecks(SECURITY)} certSlug={SECURITY} />;

    const container = document.createElement("div");
    container.innerHTML = renderToString(page);
    document.body.appendChild(container);
    let root: ReturnType<typeof hydrateRoot> | undefined;
    try {
      // The server cannot read the device: it counts nothing, and the drill's
      // first question, which is drawn at random, is not in its HTML either.
      expect(count(container)).toMatch(/^0 of /);
      expect(within(container).getByRole("status")).toHaveTextContent("The drill is loading.");

      root = await act(async () => hydrateRoot(container, page, { onRecoverableError: recovered }));
      expect(recovered).not.toHaveBeenCalled();
      expect(errors).not.toHaveBeenCalled();
      expect(count(container)).toMatch(/^3 of /);
      expect(within(container).queryByText("The drill is loading.")).toBeNull();
      expect(within(container).getByRole("heading", { level: 2 })).toBeInTheDocument();
    } finally {
      await act(async () => root?.unmount());
      container.remove();
    }
  });

  it("is read again from the device when the exam changes", () => {
    keep(SECURITY, 2);
    keep(NETWORK, 5);
    const { rerender } = render(<RecallSurface decks={getRecallDecks(SECURITY)} certSlug={SECURITY} />);
    expect(count()).toMatch(/^2 of /);
    rerender(<RecallSurface decks={getRecallDecks(NETWORK)} certSlug={NETWORK} />);
    expect(count()).toMatch(/^5 of /);
  });

  it("counts an answer at once and keeps it on the device, under the exam it was given in", () => {
    keep(SECURITY, 2);
    player.standIn = true;
    const deck = getRecallDecks(SECURITY)[0];
    render(<RecallSurface decks={getRecallDecks(SECURITY)} certSlug={SECURITY} initialDeckKey={deck.config.tableId} />);
    expect(count()).toMatch(/^2 of /);
    act(() => screen.getByRole("button", { name: "Answer one question" }).click());
    expect(count()).toMatch(/^3 of /);
    const kept = JSON.parse(store.get(`recall-mastery:v1:${SECURITY}`) ?? "{}") as Record<string, string[]>;
    expect(kept[deck.config.tableId]).toHaveLength(3);
    expect(kept[deck.config.tableId]).toContain("item-x");
    expect(store.has(`recall-mastery:v1:${NETWORK}`)).toBe(false);
  });
});
