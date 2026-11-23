// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

const PORT: Record<string, string> = {
  HTTPS: "443",
  SSH: "22",
  DNS: "53",
  HTTP: "80",
  FTP: "20/21",
};
const PROTOCOL: Record<string, string> = Object.fromEntries(Object.entries(PORT).map(([name, port]) => [port, name]));

/** The fact being asked: the question card prints it as its heading. */
function cue(): string {
  return screen.getByRole("heading", { level: 2 }).textContent?.trim() ?? "";
}

/** A deck that asks both ways round: the answer to a protocol is its port, and the reverse. */
function answerTo(asked: string): string {
  return PORT[asked] ?? PROTOCOL[asked];
}

function wrongAnswerTo(asked: string): HTMLElement {
  const right = answerTo(asked);
  const wrong = screen.getAllByRole("button").find((b) => b.textContent && !b.textContent.endsWith(right));
  if (!wrong) throw new Error("no incorrect answer on the card");
  return wrong;
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("RecallPlayer, a typed answer", () => {
  it("shows a labelled field and no answers to choose from", () => {
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" typed />);
    expect(screen.getByLabelText("Type the port")).toBeInTheDocument();
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("marks a correct typed port, says so in a sentence and reports it", () => {
    const onAnswer = vi.fn();
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" typed onAnswer={onAnswer} />);
    const input = screen.getByLabelText("Type the port");
    // A typed answer is always asked the deck's own way round: the protocol is shown.
    const protocol = cue();
    expect(PORT[protocol]).toBeTruthy();

    fireEvent.change(input, { target: { value: PORT[protocol] } });
    fireEvent.submit(input.closest("form")!);

    expect(onAnswer).toHaveBeenCalledWith("ports-protocols", protocol, true);
    expect(screen.getByText("Correct.")).toBeInTheDocument();
  });

  it("marks an incorrect typed port and states the correct answer", () => {
    // A fixed draw: the first row, HTTPS, whose port is 443.
    vi.spyOn(Math, "random").mockReturnValue(0);
    const onAnswer = vi.fn();
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" typed onAnswer={onAnswer} />);
    expect(cue()).toBe("HTTPS");
    const input = screen.getByLabelText("Type the port");
    fireEvent.change(input, { target: { value: "8080" } });
    fireEvent.submit(input.closest("form")!);

    expect(onAnswer).toHaveBeenCalledWith("ports-protocols", "HTTPS", false);
    expect(screen.getByText("Incorrect. The correct answer is 443.")).toBeInTheDocument();
  });
});

describe("RecallPlayer, a fact with two rows", () => {
  // RADIUS has a row for its legacy ports and a row for its ports, as the
  // Security+ ports table has, and a question deals one of them.
  const radiusTable: ReferenceTable = {
    ...table,
    entries: [
      { columns: { protocol: "RADIUS", port: "1645/1646" } },
      { columns: { protocol: "RADIUS", port: "1812/1813" } },
      { columns: { protocol: "SSH", port: "22" } },
      { columns: { protocol: "HTTPS", port: "443" } },
      { columns: { protocol: "TACACS+", port: "49" } },
    ],
  };
  const LEGACY = "RADIUS uses ports 1645 and 1646. These are its legacy ports.";
  const CURRENT = "RADIUS uses ports 1812 and 1813. Port 1812 is for authentication and port 1813 is for accounting.";
  const radiusDeck = buildDeck(
    {
      id: "ports",
      label: "Ports",
      tableId: "ports-protocols",
      mode: "choice",
      ask: { key: "protocol", label: "protocol" },
      answer: { key: "port", label: "port" },
      bidirectional: true,
      accept: "numeric-parts",
      explain: {
        template: "{protocol} uses port {port}.",
        by: "port",
        rows: { "1645/1646": LEGACY, "1812/1813": CURRENT },
      },
    },
    radiusTable
  );

  /** The verdict and what follows it, as one line of text. */
  const verdict = () => screen.getByText(/^(?:Correct|Incorrect)\./).parentElement?.textContent;

  /** Deals RADIUS: the first row of the deck, then the row of RADIUS that `second` picks. */
  function dealRadius(second: number, typed: boolean) {
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    // The numbers are used in this order: the fact, (for a choice) the direction, then which of its rows.
    random.mockReturnValueOnce(0);
    if (!typed) random.mockReturnValueOnce(0.9);
    random.mockReturnValueOnce(second);
    const onAnswer = vi.fn();
    render(<RecallPlayer decks={[radiusDeck]} deckKey="ports-protocols" typed={typed} onAnswer={onAnswer} />);
    expect(cue()).toBe("RADIUS");
    return onAnswer;
  }

  function type(answer: string) {
    const input = screen.getByLabelText("Type the port");
    fireEvent.change(input, { target: { value: answer } });
    fireEvent.submit(input.closest("form")!);
  }

  it("marks the port of the other row correct, and says which row the question asked for", () => {
    // The legacy row is dealt; the learner types the port that every candidate learns.
    const onAnswer = dealRadius(0, true);
    type("1812");
    expect(onAnswer).toHaveBeenCalledWith("ports-protocols", "RADIUS", true);
    expect(verdict()).toBe(
      `Correct. ${LEGACY} This question asked for 1645/1646. Another correct answer for RADIUS is 1812/1813.`
    );
  });

  it("does the same when the other row is dealt and the legacy port is typed", () => {
    const onAnswer = dealRadius(0.9, true);
    type("1645");
    expect(onAnswer).toHaveBeenCalledWith("ports-protocols", "RADIUS", true);
    expect(verdict()).toBe(
      `Correct. ${CURRENT} This question asked for 1812/1813. Another correct answer for RADIUS is 1645/1646.`
    );
  });

  it("still marks a port that belongs to neither row incorrect, and names both answers", () => {
    const onAnswer = dealRadius(0, true);
    type("49");
    expect(onAnswer).toHaveBeenCalledWith("ports-protocols", "RADIUS", false);
    expect(verdict()).toBe(
      `Incorrect. The correct answer is 1645/1646. ${LEGACY} This question asked for 1645/1646. Another correct answer for RADIUS is 1812/1813.`
    );
  });

  it("says so after a choice of answers too, where only the dealt row's ports are offered", () => {
    dealRadius(0, false);
    const offered = screen.getAllByRole("button").map((b) => b.textContent ?? "");
    expect(offered.filter((text) => text.endsWith("1645/1646"))).toHaveLength(1);
    expect(offered.filter((text) => text.endsWith("1812/1813"))).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "1645/1646" }));
    expect(verdict()).toBe(
      `Correct. ${LEGACY} This question asked for 1645/1646. Another correct answer for RADIUS is 1812/1813.`
    );
  });

  it("adds nothing to a fact that has one row", () => {
    // The third row of the deck: SSH.
    vi.spyOn(Math, "random").mockReturnValue(0).mockReturnValueOnce(0.5);
    render(<RecallPlayer decks={[radiusDeck]} deckKey="ports-protocols" typed />);
    expect(cue()).toBe("SSH");
    type("22");
    expect(verdict()).toBe("Correct. SSH uses port 22.");
  });
});

describe("RecallPlayer, a choice of answers", () => {
  it("draws the answers as buttons in a group named by the question", () => {
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" />);
    const group = screen.getByRole("group");
    expect(group).toHaveAccessibleName(cue());
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
    // Choosing is answering here, so these are not radio buttons.
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByLabelText(/type the/i)).toBeNull();
  });

  it("waits for Continue after a correct answer: nothing moves by itself", () => {
    vi.useFakeTimers();
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" />);
    const asked = cue();
    fireEvent.click(screen.getByRole("button", { name: answerTo(asked) }));

    expect(screen.getByText("Correct.")).toBeInTheDocument();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toHaveFocus();

    // A long wait changes nothing: the verdict stays until the learner moves on.
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Correct.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(cue()).toBe(asked);

    // Continue draws the next question, which takes the focus so that it is read.
    fireEvent.click(next);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    expect(screen.queryByText("Correct.")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
  });

  it("waits for Continue after an incorrect answer too, and states the correct answer", () => {
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" />);
    const asked = cue();
    fireEvent.click(wrongAnswerTo(asked));
    expect(screen.getByText(`Incorrect. The correct answer is ${answerTo(asked)}.`)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toHaveFocus();
  });

  it("answers with a number key only while the focus is inside the card", () => {
    render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" />);

    // A key pressed with the focus elsewhere on the page answers nothing.
    fireEvent.keyDown(document.body, { key: "1" });
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    // The same key pressed inside the card answers the question.
    fireEvent.keyDown(screen.getByRole("heading", { level: 2 }), { key: "1" });
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("counts correct answers in plain words, with no streak", () => {
    const onAnswer = vi.fn();
    const { container } = render(<RecallPlayer decks={[deck]} deckKey="ports-protocols" onAnswer={onAnswer} />);
    expect(container).not.toHaveTextContent(/correct/i);

    fireEvent.click(screen.getByRole("button", { name: answerTo(cue()) }));
    expect(screen.getByText("1 of 1 correct")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(wrongAnswerTo(cue()));
    expect(screen.getByText("1 of 2 correct")).toBeInTheDocument();

    expect(container).not.toHaveTextContent(/streak|best/i);
    expect(onAnswer).toHaveBeenCalledTimes(2);
  });
});
