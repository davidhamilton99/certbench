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
    explanation: "DMARC publishes the policy for failing mail. MX, PTR and CNAME records do not.",
  },
];

const LABEL = "Security+ sample questions";

function deck(extra: Partial<Parameters<typeof QuestionDeck>[0]> = {}) {
  return (
    <QuestionDeck
      questions={QUESTIONS}
      label={LABEL}
      surface="practice_test_page"
      path="/path/security-plus-sy0-701"
      examName="Security+"
      {...extra}
    />
  );
}

/** The answers of the card on screen: plain buttons in a group named by the question (the folded list has none). */
function tiles(root: HTMLElement = document.body) {
  const group = within(root)
    .getAllByRole("group")
    .find((g) => g.hasAttribute("aria-labelledby"))!;
  return within(group).getAllByRole("button");
}

/** The button that moves on once a question is answered. */
const onward = (root: HTMLElement = document.body) =>
  within(root).queryByRole("button", { name: /^(Continue|View my score)/ });

/** The verdict on the answer: the sentence that the button to move on is described by. */
function verdict(root: HTMLElement = document.body): HTMLElement | null {
  const id = onward(root)?.getAttribute("aria-describedby");
  return id ? document.getElementById(id) : null;
}

/** The question on the card (the same words are in the folded list, which cannot take the focus). */
const prompt = (text: string) => screen.getByText(text, { selector: '[tabindex="-1"]' });

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
    expect(html).toMatch(/Question\s*(<!-- -->)?\s*1\s*(<!-- -->)?\s*of\s*(<!-- -->)?\s*3/);
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

  it("plays to a score that leads to the study path", () => {
    render(deck());
    // The answers are a group named by the question they belong to.
    expect(screen.getByRole("group", { name: QUESTIONS[0].questionText })).toBeInTheDocument();
    // 1: right. Every answer waits for Continue.
    fireEvent.click(tiles()[1]);
    expect(verdict()).toHaveTextContent(/^Correct\./);
    fireEvent.click(onward()!);
    // 2: wrong, so the right answer is named.
    expect(screen.getByText("Question 2 of 3")).toBeTruthy();
    fireEvent.click(tiles()[0]);
    expect(verdict()).toHaveTextContent("Incorrect. The correct answer is Operational.");
    fireEvent.click(onward()!);
    // 3: the last answer says where it leads.
    fireEvent.click(tiles()[0]);
    fireEvent.click(screen.getByRole("button", { name: /^View my score/ }));

    const score = screen.getByRole("group", { name: `${LABEL}: your score` });
    expect(score).toHaveFocus();
    expect(score).toHaveTextContent("2 of 3");
    expect(score).toHaveTextContent("1 question was answered incorrectly.");
    const start = within(score).getByRole("link", { name: /Start the study path/ });
    expect(start.getAttribute("href")).toBe("/path/security-plus-sy0-701");
    expect(score).toHaveTextContent("It is free, and you do not need an account to start.");

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

  it("leaves the focus alone as the page loads, and puts it on each question that follows a press", () => {
    render(deck());
    // The first card is there when the page arrives: nothing takes the focus.
    expect(document.body).toHaveFocus();
    fireEvent.click(tiles()[1]);
    // Answered: the button to move on has the focus, so Enter or one tap continues.
    expect(onward()).toHaveFocus();
    fireEvent.click(onward()!);
    // The next question is read: its words have the focus, not the page.
    expect(prompt(QUESTIONS[1].questionText)).toHaveFocus();
    fireEvent.click(tiles()[3]);
    fireEvent.click(onward()!);
    expect(prompt(QUESTIONS[2].questionText)).toHaveFocus();
  });

  it("starts over from the first question", () => {
    render(deck({ questions: QUESTIONS.slice(0, 1) }));
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^View my score/ }));
    expect(screen.getByText("You answered every question correctly.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Answer the questions again/ }));
    expect(screen.getByText("Question 1 of 1")).toBeTruthy();
    expect(verdict()).toBeNull();
    expect(tiles().every((t) => !(t as HTMLButtonElement).disabled)).toBe(true);
    // The question came back in answer to a press, so it takes the focus.
    expect(prompt(QUESTIONS[0].questionText)).toHaveFocus();
  });

  it("offers a signed-in visitor the way back to their study path", () => {
    signedInAs = "user-1";
    render(deck({ questions: QUESTIONS.slice(0, 1) }));
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^View my score/ }));
    expect(screen.getByRole("link", { name: /Continue the study path/ })).toBeTruthy();
    expect(screen.queryByText("It is free, and you do not need an account to start.")).toBeNull();
  });

  it("leads somewhere else when the study path is not the next step", () => {
    render(
      deck({
        questions: QUESTIONS.slice(0, 1),
        next: { title: "The whole SY0-801 exam", body: "45 questions.", href: "/sy0-801-test", label: "Take the exam" },
      })
    );
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^View my score/ }));
    expect(screen.getByText("The whole SY0-801 exam")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Take the exam/ }).getAttribute("href")).toBe("/sy0-801-test");
  });

  // The Security+ and A+ steps follow CompTIA's objectives. The Network+ steps
  // follow CertBench's own topics, and a deck that leads to the list of exams
  // could be followed by any of them.
  it.each([
    ["/path/security-plus-sy0-701", "The study path covers every objective in short steps like these, up to a readiness checkpoint that shows where you stand."],
    ["/path/a-plus-core2-220-1202", "The study path covers every objective in short steps like these, up to a readiness checkpoint that shows where you stand."],
    ["/path/network-plus-n10-009", "The study path covers every topic in short steps like these, up to a readiness checkpoint that shows where you stand."],
    ["/start", "The study path works through your exam topic by topic, in short steps like these, up to a readiness checkpoint that shows where you stand."],
  ])("says what the study path covers in words that are true of the exam it leads to: %s", (path, sentence) => {
    render(deck({ questions: QUESTIONS.slice(0, 1), path }));
    fireEvent.click(tiles()[1]);
    fireEvent.click(screen.getByRole("button", { name: /^View my score/ }));
    const score = screen.getByRole("group", { name: `${LABEL}: your score` });
    expect(within(score).getByText(sentence)).toBeInTheDocument();
    if (!sentence.includes("every objective")) expect(score).not.toHaveTextContent(/every (?:exam )?objective/i);
  });

  // A link to the list of exams has one name on every page: "Choose your exam".
  it("names its link to the list of exams as every page does, signed in or not", () => {
    for (const who of [null, "user-1"]) {
      signedInAs = who;
      const { unmount } = render(deck({ questions: QUESTIONS.slice(0, 1), path: "/start" }));
      fireEvent.click(tiles()[1]);
      fireEvent.click(screen.getByRole("button", { name: /^View my score/ }));
      const link = screen.getByRole("link", { name: /^Choose your exam/ });
      expect(link).toHaveAttribute("href", "/start");
      expect(screen.queryByRole("link", { name: /study path/ })).toBeNull();
      unmount();
    }
  });

  it("says above a question what it belongs to, where the page tags it", () => {
    render(deck({ questions: [{ ...QUESTIONS[0], tag: "2.6 Threats of AI" }, QUESTIONS[1]] }));
    const card = screen.getByRole("group", { name: QUESTIONS[0].questionText }).parentElement!;
    expect(within(card).getByText("2.6 Threats of AI")).toBeInTheDocument();
    fireEvent.click(tiles()[1]);
    fireEvent.click(onward()!);
    // A question with no tag has no line of its own.
    expect(screen.getAllByText("2.6 Threats of AI")).toHaveLength(1);
  });

  it("answers from the keyboard only the card that holds the focus, and nothing from elsewhere on the page", () => {
    render(
      <>
        <div data-testid="first">{deck({ label: "First" })}</div>
        <div data-testid="second">{deck({ label: "Second" })}</div>
      </>
    );
    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");

    // A key pressed with the focus on the page, or on a control outside the cards, answers nothing.
    fireEvent.keyDown(document.body, { key: "2" });
    fireEvent.keyDown(document, { key: "2" });
    fireEvent.keyDown(within(first).getByText(/^All 3 questions/), { key: "2" });
    expect(verdict(first)).toBeNull();
    expect(verdict(second)).toBeNull();

    // With the focus inside the second card, a key answers that card and no other.
    fireEvent.focusIn(tiles(second)[0]);
    fireEvent.keyDown(tiles(second)[0], { key: "A" });
    expect(verdict(second)).toHaveTextContent("The correct answer is 22.");
    expect(verdict(first)).toBeNull();

    // And the same for the first.
    fireEvent.focusIn(tiles(first)[0]);
    fireEvent.keyDown(tiles(first)[0], { key: "b" });
    expect(verdict(first)).toHaveTextContent(/^Correct\./);
  });

  // The deck shows the answers in their stored order. An explanation that names
  // them by their letters ("Option A, port 21") must still find A once the
  // answers are marked: the check or the cross goes to the end of the answer.
  it("keeps every letter once a question whose explanation names one is marked", () => {
    const lettered: DeckQuestion = {
      ...QUESTIONS[0],
      explanation: "SSH listens on port 22. Option A, port 21, is used by FTP.",
    };
    render(deck({ questions: [lettered] }));
    fireEvent.click(tiles()[1]);
    const [a, b] = tiles();
    expect(a.querySelector("span[aria-hidden]")).toHaveTextContent(/^A$/);
    expect(b.querySelector("span[aria-hidden]")).toHaveTextContent(/^B$/);
    // The check is still drawn, at the end of the correct answer.
    expect(b.lastElementChild?.tagName.toLowerCase()).toBe("svg");
    expect(b.lastElementChild?.getAttribute("class")).toMatch(/lucide-check\b/);
  });

  it("draws the check in place of the letter where the explanation names no letter", () => {
    render(deck({ questions: QUESTIONS.slice(0, 1) }));
    fireEvent.click(tiles()[1]);
    const box = tiles()[1].querySelector("span[aria-hidden]")!;
    expect(box).not.toHaveTextContent("B");
    expect(box.querySelector("svg")?.getAttribute("class")).toMatch(/lucide-check\b/);
  });

  // The keys act on the card where they are pressed, and no page-wide turn
  // decides which card may hear them: the card that mounted first holds nothing.
  it("answers from the keyboard the card where the key is pressed, whichever card was there first", () => {
    render(
      <>
        <div data-testid="first">{deck({ label: "First" })}</div>
        <div data-testid="second">{deck({ label: "Second" })}</div>
      </>
    );
    const first = screen.getByTestId("first");
    const second = screen.getByTestId("second");
    fireEvent.keyDown(tiles(second)[0], { key: "B" });
    expect(verdict(second)).toHaveTextContent(/^Correct\./);
    expect(verdict(first)).toBeNull();
  });
});
