// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

vi.mock("@/lib/supabase-browser", () => ({
  createClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: (cb: (event: string, s: unknown) => void) => {
        queueMicrotask(() => cb("INITIAL_SESSION", null));
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  }),
}));
vi.mock("@/lib/api-client", () => ({
  api: async (contract: { method: string }) =>
    contract.method === "GET" ? { progress: { items: {}, rounds: 0 } } : { ok: true },
}));
vi.mock("@/lib/analytics", () => ({ track: vi.fn(), identifyUser: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/tools/security-plus-acronyms-quiz",
  useRouter: () => ({ push: vi.fn() }),
}));

import { getRecallDecks } from "@/data/recall";
import { AcronymDrill } from "../AcronymDrill";

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

/** The deck the page hands the quiz: the Security+ acronyms, as the server builds it. */
const deck = getRecallDecks("security-plus-sy0-701").find((d) => d.config.tableId === "acronyms")!;

/** The card's answers: a group named by the question, each answer a plain button. */
const answerGroup = () => screen.getByRole("group");

/** The acronym on the card on screen and its right answer, read off the cue the way a visitor would. */
function shown() {
  const asksExpansion = screen.queryByText("Which expansion?") !== null;
  // Asked the other way round, the card says so.
  if (!asksExpansion) expect(screen.getByText("Which acronym?")).toBeInTheDocument();
  const prompt = document.getElementById(answerGroup().getAttribute("aria-labelledby")!)!.textContent!;
  const row = deck.rows.find((r) => (asksExpansion ? r.acronym : r.expansion) === prompt)!;
  return { row, right: asksExpansion ? row.expansion : row.acronym };
}

/** Presses the right answer, or one of the others. An answer's text is its key (one character) and then the answer. */
function answer(right: string, correctly: boolean) {
  const tile = within(answerGroup())
    .getAllByRole("button")
    .find((t) => (t.textContent!.endsWith(right) && t.textContent!.length === right.length + 1) === correctly)!;
  fireEvent.click(tile);
}

beforeEach(() => {
  store.clear();
});

describe("AcronymDrill", () => {
  it("explains every answer in one sentence, whichever way round the acronym was asked", async () => {
    expect(deck.config.explain?.template).toBe("{acronym} stands for {expansion}.");
    render(<AcronymDrill deck={deck} />);
    await waitFor(() => expect(screen.getByText("Acronyms, round 1")).toBeInTheDocument());
    expect(screen.getByText("Question 1 of 20")).toBeInTheDocument();

    // Questions are dealt at random, either way round: each is read as it comes.
    // (Both directions are held, with a fixed order, in fact-reps.test.ts.)
    for (let i = 0; i < 8; i++) {
      const miss = i % 2 === 1;
      const { row, right } = shown();
      const sentence = `${row.acronym} stands for ${row.expansion}.`;
      answer(right, !miss);
      // The verdict and the sentence are read with the button that takes the focus.
      const next = screen.getByRole("button", { name: /^Continue/ });
      expect(next).toHaveFocus();
      expect(next).toHaveAccessibleDescription(miss ? `Incorrect. The correct answer is ${right}. ${sentence}` : `Correct. ${sentence}`);
      // The note it used to print: the pairing with a colon, and the study grouping in a parenthesis.
      const verdict = document.getElementById(next.getAttribute("aria-describedby")!)!.textContent!;
      expect(verdict).not.toContain(`${row.acronym}: `);
      expect(verdict).not.toContain(`(${row.category})`);
      fireEvent.click(next);
      expect(screen.getByText(`Question ${i + 2} of 20`)).toBeInTheDocument();
    }
  });
});
