// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { QuestionDeck, type DeckQuestion } from "../QuestionDeck";

const track = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => track(...args), identifyUser: vi.fn() }));

let signedInAs: string | null = null;
vi.mock("@/components/auth/useSignedIn", () => ({ useSessionUserId: () => signedInAs }));

const QUESTIONS: DeckQuestion[] = [
  {
    questionText: "Which port does SSH use by default?",
    options: ["21", "22", "23", "25"],
    correctIndex: 1,
    explanation: "SSH listens on port 22. Telnet uses 23 and sends everything in clear text.",
  },
  {
    questionText: "Which control category does a security awareness course belong to?",
    options: ["Technical", "Physical", "Managerial", "Operational"],
    correctIndex: 3,
    explanation: "Training people is an operational control. Managerial controls are policies and risk decisions.",
  },
  {
    questionText: "Which record tells receivers what to do when SPF and DKIM fail?",
    options: ["DMARC", "MX", "PTR", "CNAME"],
    correctIndex: 0,
    explanation: "DMARC publishes the policy for failing mail. MX, PTR and CNAME records don't.",
  },
];

function deck(extra: Partial<Parameters<typeof QuestionDeck>[0]> = {}) {
  return (
    <QuestionDeck
      questions={QUESTIONS}
      label="Security+ · exam style"
      surface="practice_test_page"
      path="/path/security-plus-sy0-701"
      examName="Security+"
      {...extra}
    />
  );
}

/** The answer tiles of the card on screen (the folded list has none). */
function tiles(root: HTMLElement = document.body) {
  return within(within(root).getByRole("radiogroup", { name: "Answers" })).getAllByRole("radio");
}

beforeEach(() => {
  track.mockClear();
  signedInAs = null;
});

afterEach(() => {
  cleanup();
});

describe("QuestionDeck", () => {
  it("serves the first question on its card, with every question and answer in the folded list", () => {
    const html = renderToString(deck());
    expect(html).toContain("Which port does SSH use by default?");
    expect(html).toMatch(/1\s*(<!-- -->)?\s*\/\s*(<!-- -->)?\s*3/);
    // The list: every question, its options and its answer, from the start.
    for (const q of QUESTIONS) {
      expect(html).toContain(q.questionText.replace(/'/g, "&#x27;"));
      expect(html).toContain(q.explanation.replace(/'/g, "&#x27;"));
    }
    expect(html).toContain("Answer: <!-- -->B<!-- -->. <!-- -->22<!-- -->.");
    expect(html).toContain("Answer: <!-- -->D<!-- -->. <!-- -->Operational<!-- -->.");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
  });

  it("plays to a score that leads to the path", () => {
    render(deck());
    // 1: right.
    fireEvent.click(tiles()[1]);
    expect(screen.getByRole("status")).toHaveTextContent(/^Right\./);
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    // 2: wrong, so the right answer is named.
    expect(screen.getByText("2 / 3")).toBeTruthy();
    fireEvent.click(tiles()[0]);
    expect(screen.getByRole("status")).toHaveTextContent("It's Operational.");
    fireEvent.click(screen.getByRole("button", { name: /^Got it/ }));
    // 3: the last answer says where it leads.
    fireEvent.click(tiles()[0]);
    fireEvent.click(screen.getByRole("button", { name: /^See my score/ }));

    const score = screen.getByRole("group", { name: "Security+ · exam style: your score" });
    expect(score).toHaveTextContent("2 of 3");
    expect(score).toHaveTextContent("1 to look at again.");
    const start = within(score).getByRole("link", { name: /Start my path/ });
    expect(start.getAttribute("href")).toBe("/path/security-plus-sy0-701");
    expect(score).toHaveTextContent("Free, no account needed to start.");

    expect(track.mock.calls.filter(([e]) => e === "sample_question_answered")).toEqual([
      ["sample_question_answered", { correct: true, surface: "practice_test_page" }],
      ["sample_question_answered", { correct: false, surface: "practice_test_page" }],
      ["sample_question_answered", { correct: true, surface: "practice_test_page" }],
    ]);
    expect(track).toHaveBeenCalledWith("question_deck_completed", {
      surface: "practice_test_page",
      correct: 2,
      total: 3,
    });

    start.addEventListener("click", (e) => e.preventDefault());
    fireEvent.click(start);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "practice_test_page_deck",
      href: "/path/security-plus-sy0-701",
    });
  });

  it("starts over from the first question", () => {
    render(deck({ questions: QUESTIONS.slice(0, 1) }));
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^See my score/ }));
    expect(screen.getByText("Every one right.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Play again/ }));
    expect(screen.getByText("1 / 1")).toBeTruthy();
    expect(screen.queryByRole("status")).toBeNull();
    expect(tiles().every((t) => !(t as HTMLButtonElement).disabled)).toBe(true);
  });

  it("offers a signed-in visitor the way back to their path", () => {
    signedInAs = "user-1";
    render(deck({ questions: QUESTIONS.slice(0, 1) }));
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^See my score/ }));
    expect(screen.getByRole("link", { name: /Continue my path/ })).toBeTruthy();
    expect(screen.queryByText("Free, no account needed to start.")).toBeNull();
  });

  it("leads somewhere else when the path isn't the next step", () => {
    render(
      deck({
        questions: QUESTIONS.slice(0, 1),
        next: { title: "The whole SY0-801 exam", body: "45 questions.", href: "/sy0-801-test", label: "Take the test" },
      })
    );
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^See my score/ }));
    expect(screen.getByText("The whole SY0-801 exam")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Take the test/ }).getAttribute("href")).toBe("/sy0-801-test");
  });

  it("takes turns with another player on the page for the number keys", () => {
    render(
      <>
        <div data-testid="first">{deck({ label: "First" })}</div>
        <div data-testid="second">{deck({ label: "Second" })}</div>
      </>
    );
    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");

    // The first player on the page holds the keys: one press answers one card.
    fireEvent.keyDown(document, { key: "2" });
    expect(within(first).getByRole("status")).toHaveTextContent(/^Right\./);
    expect(within(second).queryByRole("status")).toBeNull();

    // Playing the second hands the keys over.
    fireEvent.pointerDown(tiles(second)[0]);
    fireEvent.keyDown(document, { key: "1" });
    expect(within(second).getByRole("status")).toHaveTextContent("It's 22.");
    expect(within(first).getAllByRole("status")).toHaveLength(1);
  });
});
