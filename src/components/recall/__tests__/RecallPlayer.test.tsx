// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReferenceTable } from "@/data/reference/types";
import { buildDeck } from "@/lib/recall/recall-deck";
import { RecallPlayer } from "@/components/recall/RecallPlayer";

const table: ReferenceTable = {
  id: "ports-protocols",
  title: "Ports",
  description: "",
  columnHeaders: [
    { key: "protocol", label: "Protocol" },
    { key: "port", label: "Port", mono: true },
  ],
  entries: [
    { columns: { protocol: "HTTPS", port: "443" } },
    { columns: { protocol: "SSH", port: "22" } },
    { columns: { protocol: "DNS", port: "53" } },
    { columns: { protocol: "HTTP", port: "80" } },
    { columns: { protocol: "FTP", port: "20/21" } },
  ],
};

const deck = buildDeck(
  {
    id: "ports",
    label: "Ports",
    tableId: "ports-protocols",
    mode: "choice",
    ask: { key: "protocol", label: "protocol" },
    answer: { key: "port", label: "port" },
    bidirectional: true,
    accept: "numeric-parts",
  },
  table
);

const ANSWER: Record<string, string> = {
  HTTPS: "443",
  SSH: "22",
  DNS: "53",
  HTTP: "80",
  FTP: "20/21",
};

/** The cue (protocol) shown big — noSwap makes it always the protocol. */
function cueProtocol(): string {
  return document.querySelector(".text-2xl")?.textContent?.trim() ?? "";
}

describe("RecallPlayer typed mode", () => {
  it("renders a typed input (no choice options) when typed", async () => {
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" typed />);
    expect(
      await screen.findByPlaceholderText(/type the port/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("grades a correct typed port and reports it", async () => {
    const onAnswer = vi.fn();
    render(
      <RecallPlayer
        decks={[deck]}
        deckKey="ports-protocols"
        typed
        onAnswer={onAnswer}
      />
    );
    const input = await screen.findByPlaceholderText(/type the port/i);
    const cue = cueProtocol();
    expect(ANSWER[cue]).toBeTruthy();

    fireEvent.change(input, { target: { value: ANSWER[cue] } });
    fireEvent.submit(input.closest("form")!);

    // The item is reported correct (itemId is the protocol cue).
    expect(onAnswer).toHaveBeenCalledWith("ports-protocols", cue, true);
    // Reveal surfaces the answer.
    expect(screen.getByText(ANSWER[cue])).toBeInTheDocument();
  });

  it("grades a typed answer deterministically", async () => {
    // Math.random()->0 always selects the first row (HTTPS → 443).
    const rng = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" typed />);
      const input = await screen.findByPlaceholderText(/type the port/i);
      expect(cueProtocol()).toBe("HTTPS");
      fireEvent.change(input, { target: { value: "443" } });
      fireEvent.submit(input.closest("form")!);
      expect(screen.getByText("443")).toBeInTheDocument();
    } finally {
      rng.mockRestore();
    }
  });

  it("renders multiple-choice options when not typed", async () => {
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" />);
    const radios = await screen.findAllByRole("radio");
    expect(radios.length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByPlaceholderText(/type the/i)).toBeNull();
  });
});
