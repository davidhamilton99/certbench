// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
const identifyUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser }));

// Who is signed in, and the account form: one press stands in for signing up.
const session = vi.hoisted(() => ({ userId: "u1" as string | null }));
vi.mock("@/components/auth/useSignedIn", () => ({ useSessionUserId: () => session.userId }));
vi.mock("@/components/auth/InlineSignup", () => ({
  InlineSignup: ({
    submitLabel,
    onSignedIn,
  }: {
    submitLabel: string;
    onSignedIn: (id: string, email: string | undefined, method: "email_signup") => void;
  }) => (
    <button type="button" onClick={() => onSignedIn("u9", "new@example.com", "email_signup")}>
      {submitLabel}
    </button>
  ),
}));

import { PracticeExam, PracticeExamJump } from "../PracticeExam";
import { rehearsalQuestionsKey } from "@/components/path/rehearsal-run";
import { pathRehearsalKey } from "@/components/path/storage-key";
import { examReps, examStructure } from "@/lib/tools/practice-exam";

const STRUCTURE = examStructure({
  slug: "security-plus-sy0-801",
  examName: "Security+ SY0-801",
  examCode: "SY0-801",
  domains: [
    { number: "1.0", title: "General Security Concepts", weight: 40, objectives: [{ code: "1.1", label: "Concepts" }] },
    { number: "2.0", title: "Threats", weight: 60, objectives: [{ code: "2.1", label: "Threats" }] },
  ],
});

const question = (n: number, objective: string) => ({
  id: `t-${n}`,
  objective,
  questionText: `Question text ${n}?`,
  options: [`Right ${n}`, `Wrong ${n}a`, `Wrong ${n}b`, `Wrong ${n}c`],
  correctIndex: 0,
  explanation: `Takeaway ${n}. More about ${n}.`,
});

const REPS = examReps([question(1, "1.1"), question(2, "2.1"), question(3, "2.1")]);

const NEXT = {
  heading: "Your Security+ study path begins from this result",
  body: "The study path covers the ground that the two exams share.",
  primary: { href: "/path/security-plus-sy0-701", label: "Open the study path" },
  links: [{ href: "/security-plus-sy0-801-vs-sy0-701", label: "Compare SY0-801 and SY0-701" }],
};

const STORAGE_ID = "security-plus-sy0-801-practice-test";
const STORAGE_KEY = pathRehearsalKey(STORAGE_ID);
const LIST_TITLE = "All 3 questions, with answers";

function mount(extra: Partial<Parameters<typeof PracticeExam>[0]> = {}) {
  return render(
    <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={REPS} size="half" next={NEXT} {...extra} />
  );
}

/** The question on screen, by its number in the fixture. */
function onScreen(): number {
  const heading = screen.getByRole("heading", { name: /^Question text \d+\?$/ });
  return Number(heading.textContent!.match(/\d+/)![0]);
}

/** Answer the question on screen, right or wrong. */
function answer(right: boolean) {
  const n = onScreen();
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(right ? `Right ${n}$` : `Wrong ${n}a`) }));
  return n;
}

const start = () => fireEvent.click(screen.getByRole("button", { name: /^Start the exam/ }));
const pause = () => fireEvent.click(screen.getByRole("button", { name: "Pause and leave" }));
/** From any question: the grid, the finish panel, and the last press. */
function finishNow() {
  fireEvent.click(screen.getByRole("button", { name: /show all questions$/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Finish the practice exam/ }));
  fireEvent.click(screen.getByRole("button", { name: /^Finish (and view my score|the exam)/ }));
}

/** What the device holds: the sitting's answers and clock, and its questions beside them. */
const savedRun = () => JSON.parse(store.get(STORAGE_KEY)!);
const savedQuestions = () => JSON.parse(store.get(rehearsalQuestionsKey(STORAGE_ID))!).reps as { objective: string }[];

// Node's own experimental `localStorage` global shadows jsdom's: use a plain
// in-memory Storage so that the sitting's persistence is exercised for real.
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

let visibility: DocumentVisibilityState = "visible";
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });

beforeEach(() => {
  visibility = "visible";
  window.localStorage.clear();
  track.mockClear();
  identifyUser.mockClear();
  session.userId = "u1";
  window.history.replaceState(null, "", "/security-plus-sy0-801-practice-test");
});

/** Take the three-question exam, every answer right, to the score (or to the gate, signed out). */
function sitIt() {
  start();
  for (let k = 0; k < 3; k++) {
    answer(true);
    fireEvent.click(screen.getByRole("button", { name: k < 2 ? /^Next/ : /^Finish/ }));
  }
  fireEvent.click(screen.getByRole("button", { name: /^Finish (and view my score|the exam)/ }));
}
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

/** A full-length draw: 36 questions in domain 1 (weight 40) and 54 in domain 2 (weight 60). */
const FULL_REPS = examReps(Array.from({ length: 90 }, (_, i) => question(i + 1, i % 5 < 2 ? "1.1" : "2.1")));
const mountFull = () => mount({ reps: FULL_REPS, size: "full", offerHalf: true });

describe("PracticeExam", () => {
  it("offers a full-length exam, or a half cut from it in the exam's weights", () => {
    mountFull();
    expect(screen.getByRole("heading", { name: "90 questions in 90 minutes" })).toBeInTheDocument();
    expect(screen.getByText(/These are the limits of the real exam/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Start the full exam/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Half-length exam: 45 questions in 45 minutes" }));
    expect(track).toHaveBeenCalledWith("practice_test_started", { test: "security-plus-sy0-801", questions: 45, resumed: false });
    expect(savedRun().size).toBe("half");
    expect(savedRun().limitMs).toBe(45 * 60_000);
    expect(savedQuestions()).toHaveLength(45);
    expect(savedQuestions().filter((r) => r.objective === "1.1")).toHaveLength(18);

    pause();
    expect(screen.getByText(/with 0 of 45 questions answered/)).toBeInTheDocument();
  });

  it("starts the full exam at the real exam's length", () => {
    mountFull();
    fireEvent.click(screen.getByRole("button", { name: /^Start the full exam/ }));
    expect(savedRun().size).toBe("full");
    expect(savedQuestions()).toHaveLength(90);
    expect(savedRun().limitMs).toBe(90 * 60_000);
    // The questions are kept once, beside the answers and not inside them.
    expect(savedRun().reps).toBeUndefined();
  });

  it("keeps the score for a free account, says so before they start, and shows it once they sign up", () => {
    session.userId = null;
    mount();
    // The condition is in the card's own sentence, not in small print beside the button.
    expect(
      screen.getByText(
        "The exam is free. When you finish, a free account shows your score by domain and the explanation of every answer."
      )
    ).toBeInTheDocument();

    start();
    for (let k = 0; k < 3; k++) {
      answer(true);
      fireEvent.click(screen.getByRole("button", { name: k < 2 ? /^Next/ : /^Finish/ }));
    }
    // The last button says only what it does, and the panel says what the score needs.
    expect(screen.getByText("Your score is shown once you have a free account.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view my score/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Finish the exam/ }));

    const gate = screen.getByRole("heading", { name: "Your practice exam has been scored." });
    expect(gate).toHaveFocus();
    expect(screen.getByText(/You answered 3 of 3 questions\. Create a free account to see your score by domain/)).toBeInTheDocument();
    expect(screen.queryByText(/You scored/)).toBeNull();
    expect(track).toHaveBeenCalledWith("practice_test_gate_viewed", { test: "security-plus-sy0-801" });
    // Scored all the same: the result is counted, and kept on the device, claimed by nobody yet.
    expect(track).toHaveBeenCalledWith("practice_test_completed", expect.objectContaining({ score: 100 }));
    expect(savedRun().claimedBy).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show my score" }));
    expect(screen.getByText(/You scored 100% across 3 questions/)).toBeInTheDocument();
    expect(identifyUser).toHaveBeenCalledWith("u9", { email: "new@example.com" });
    expect(track).toHaveBeenCalledWith("practice_test_account_linked", { test: "security-plus-sy0-801", method: "email_signup" });
    // The exam is that account's from now on.
    expect(savedRun().claimedBy).toBe("u9");
  });

  it("lets a signed-out visitor leave the account form for the practice exam page, the score still waiting", () => {
    session.userId = null;
    mount();
    sitIt();
    fireEvent.click(screen.getByRole("button", { name: "Return to the practice exam page" }));
    expect(screen.getByRole("heading", { name: "3 questions in 45 minutes" })).toHaveFocus();
    expect(screen.getByText(/You have already completed this practice exam\./)).toBeInTheDocument();
    expect(savedRun().done.result.score).toBe(100);
  });

  it("does not show a signed-out visitor an earlier score, only the way to it", () => {
    mount();
    sitIt();
    cleanup();
    session.userId = null;
    mount();
    expect(screen.getByText(/You have already completed this practice exam\./)).toBeInTheDocument();
    expect(screen.queryByText(/Your last score was/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "View your score" }));
    expect(screen.getByRole("heading", { name: "Your practice exam has been scored." })).toBeInTheDocument();
  });

  it("opens the score straight away when Google sign-in brings them back", () => {
    mount();
    sitIt();
    cleanup();
    window.history.replaceState(null, "", "/security-plus-sy0-801-practice-test?exam=scored");
    mount();
    expect(screen.getByText(/You scored 100% across 3 questions/)).toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(track).toHaveBeenCalledWith("practice_test_account_linked", { test: "security-plus-sy0-801", method: "redirect" });
  });

  it("offers the exam in the server-rendered page, before any script runs", () => {
    const html = renderToStaticMarkup(
      <PracticeExam
        testId="security-plus-sy0-801"
        structure={STRUCTURE}
        reps={REPS}
        size="half"
        next={NEXT}
        listTitle={LIST_TITLE}
      />
    );
    expect(html).toContain("3 questions in 45 minutes");
    expect(html).toContain("Start the exam");
    // The questions and their answers are in the page as it is served: what search and AI answers read.
    expect(html).toContain(LIST_TITLE);
    for (const n of [1, 2, 3]) expect(html).toContain(`Question text ${n}?`);
    expect(html).toContain("Answer: A. Right 1.");
    expect(html).not.toContain("<details open");
  });

  it("runs every question with no answers shown, then scores it by domain", () => {
    mount();
    start();
    expect(track).toHaveBeenCalledWith("practice_test_started", {
      test: "security-plus-sy0-801",
      questions: 3,
      resumed: false,
    });
    expect(screen.getByText("SY0-801 practice exam")).toBeInTheDocument();

    // Every question comes up once, in the sitting's own order; one from domain 2 is missed.
    const seen: number[] = [];
    for (let k = 0; k < 3; k++) {
      const n = onScreen();
      seen.push(answer(n !== 3));
      expect(screen.queryByText(/Takeaway/)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: k < 2 ? /^Next/ : /^Finish/ }));
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
    expect(screen.getByText("Every question is answered.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Finish and view my score/ }));

    // Domain 1: 1/1 at 40%. Domain 2: 1/2 at 60%. Weighted: 70%.
    expect(screen.getByText(/You scored 70% across 3 questions/)).toBeInTheDocument();
    expect(screen.getByText("Practice exam result")).toBeInTheDocument();
    expect(screen.getByText("Security+ SY0-801 practice exam")).toBeInTheDocument();
    // The result takes the focus, so it is read, and it names what it is.
    expect(screen.getByRole("group", { name: "Security+ SY0-801 practice exam result" })).toHaveFocus();
    expect(track).toHaveBeenCalledWith(
      "practice_test_completed",
      expect.objectContaining({ test: "security-plus-sy0-801", score: 70, answered: 3, total: 3, timed_out: false })
    );
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "security-plus-sy0-801_practice_test" });

    // The miss is explained, and the way on is offered.
    // The filter is two pressed buttons in a named group (it has no tab panels, so it is not tabs).
    expect(screen.getByRole("button", { name: "Missed (1)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Question text 3?")).toBeInTheDocument();
    expect(screen.getByText("Takeaway 3.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Open the study path/ });
    expect(cta).toHaveAttribute("href", "/path/security-plus-sy0-701");
    // jsdom cannot follow a link; the click only has to be recorded.
    cta.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(cta);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "security-plus-sy0-801_practice_test",
      href: "/path/security-plus-sy0-701",
    });
  });

  it("keeps a sitting left mid-way on the device, and picks it back up", () => {
    mount();
    start();
    const first = answer(true);
    pause();
    expect(screen.getByText(/You have a practice exam in progress, with 1 of 3 questions answered/)).toBeInTheDocument();

    // A closed tab, then back to the page.
    cleanup();
    mount();
    expect(screen.getByText(/with 1 of 3 questions answered/)).toBeInTheDocument();
    track.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /^Resume the exam/ }));
    expect(track).toHaveBeenCalledWith("practice_test_started", {
      test: "security-plus-sy0-801",
      questions: 3,
      resumed: true,
    });
    expect(onScreen()).toBe(first);
    expect(screen.getByRole("radio", { name: new RegExp(`Right ${first}$`) })).toHaveAttribute("aria-checked", "true");
  });

  it("pauses and resumes a sitting in the open tab even where the browser refuses to store it", () => {
    const refuse = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      mount();
      start();
      const first = answer(true);
      pause();
      expect(store.size).toBe(0);
      expect(screen.getByText(/with 1 of 3 questions answered/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /^Resume the exam/ }));
      expect(onScreen()).toBe(first);
      expect(screen.getByRole("radio", { name: new RegExp(`Right ${first}$`) })).toHaveAttribute("aria-checked", "true");
    } finally {
      refuse.mockRestore();
    }
  });

  it("discards a sitting only after asking, in the same words as the study path", () => {
    mount();
    start();
    answer(true);
    pause();

    fireEvent.click(screen.getByRole("button", { name: "Discard this practice exam" }));
    expect(
      screen.getByText("Do you want to discard this practice exam? Its answers will not be counted.")
    ).toBeInTheDocument();
    // The question opens on the choice that loses nothing.
    expect(screen.getByRole("button", { name: "Keep the exam" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Keep the exam" }));
    expect(screen.getByText(/with 1 of 3 questions answered/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard this practice exam" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Discard this practice exam" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard the exam" }));
    expect(screen.queryByText(/in progress/)).toBeNull();
    expect(screen.getByRole("button", { name: /^Start the exam/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "3 questions in 45 minutes" })).toHaveFocus();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(window.localStorage.getItem(rehearsalQuestionsKey(STORAGE_ID))).toBeNull();
  });

  it("shows the last result again on a later visit, and offers another sitting", () => {
    mount();
    sitIt();
    expect(screen.getByText(/You scored 100% across 3 questions/)).toBeInTheDocument();

    cleanup();
    mount();
    expect(screen.getByText(/Your last score was/)).toHaveTextContent("Your last score was 100%.");
    fireEvent.click(screen.getByRole("button", { name: "View that result" }));
    expect(screen.getByText(/You scored 100% across 3 questions/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Take the exam again/ }));
    expect(screen.getByText("0 of 3 answered")).toBeInTheDocument();
    expect(screen.queryByText(/You scored/)).toBeNull();
  });

  it("scores what was answered when the clock runs out, and says that it did", () => {
    vi.useFakeTimers();
    mount();
    start();
    answer(true);
    // The 45 minutes pass, one second at a time (a tick counts at most five).
    act(() => {
      vi.advanceTimersByTime(45 * 60_000 + 2_000);
    });
    expect(screen.getByText("The time limit of 45 minutes was reached.")).toBeInTheDocument();
    expect(screen.getByText("2 questions were left unanswered and counted as incorrect.")).toBeInTheDocument();
    // The exam was replaced with nothing pressed: the result takes the focus and says why first.
    expect(
      screen.getByRole("group", { name: "The time limit was reached. Security+ SY0-801 practice exam result" })
    ).toHaveFocus();
    expect(track).toHaveBeenCalledWith(
      "practice_test_completed",
      expect.objectContaining({ answered: 1, total: 3, minutes: 45, timed_out: true })
    );
  });

  it("tells a signed-out visitor first that the time limit was reached, on the heading that takes the focus", () => {
    vi.useFakeTimers();
    session.userId = null;
    mount();
    start();
    answer(true);
    act(() => {
      vi.advanceTimersByTime(45 * 60_000 + 2_000);
    });
    const heading = screen.getByRole("heading", { name: "The time limit was reached." });
    expect(heading).toHaveFocus();
    // The heading is described by the sentences under it, which begin with what happened to the exam.
    const described = document.getElementById(heading.getAttribute("aria-describedby")!);
    expect(described).toHaveTextContent(/^Your practice exam has been scored\. You answered 1 of 3 questions\./);
  });

  it("takes the list of answers off the page while a sitting is in progress and until its score has been shown", () => {
    session.userId = null;
    mount({ listTitle: LIST_TITLE });
    // At rest the list is in the page, folded.
    expect(screen.getByText(LIST_TITLE)).toBeInTheDocument();
    expect(screen.getByText("1.1 Concepts")).toBeInTheDocument();

    start();
    expect(screen.queryByText(LIST_TITLE)).toBeNull();
    expect(screen.queryByText(/^Answer: /)).toBeNull();
    answer(true);
    pause();
    // Paused is still in progress.
    expect(screen.queryByText(LIST_TITLE)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /^Resume the exam/ }));
    finishNow();
    // Scored, but the score has not been shown to anyone yet.
    expect(screen.getByRole("heading", { name: "Your practice exam has been scored." })).toBeInTheDocument();
    expect(screen.queryByText(LIST_TITLE)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show my score" }));
    expect(screen.getByText(/You scored/)).toBeInTheDocument();
    expect(screen.getByText(LIST_TITLE)).toBeInTheDocument();
  });

  it("lists an objective without its number where the numbers are not CompTIA's own", () => {
    mount({ listTitle: LIST_TITLE, objectiveCodes: false });
    expect(screen.getByText("Concepts")).toBeInTheDocument();
    expect(screen.queryByText("1.1 Concepts")).toBeNull();
  });

  it("on a shared computer, shows a finished exam only to the account its score was shown to", () => {
    mount();
    sitIt();
    expect(savedRun().claimedBy).toBe("u1");

    // The next person signs in on the same computer: a clean card, and no score of someone else's.
    cleanup();
    session.userId = "u2";
    mount({ listTitle: LIST_TITLE });
    expect(screen.queryByText(/Your last score was/)).toBeNull();
    expect(screen.queryByText(/already completed/)).toBeNull();
    expect(screen.getByRole("button", { name: /^Start the exam/ })).toBeInTheDocument();
    expect(screen.getByText(LIST_TITLE)).toBeInTheDocument();
    expect(savedRun().claimedBy).toBe("u1");

    // Signed out, nobody can tell whose it is: the way to the score is offered, and
    // an account other than the one that claimed it is not shown it.
    cleanup();
    session.userId = null;
    mount();
    fireEvent.click(screen.getByRole("button", { name: "View your score" }));
    fireEvent.click(screen.getByRole("button", { name: "Show my score" }));
    expect(screen.queryByText(/You scored/)).toBeNull();
    expect(screen.getByRole("button", { name: /^Start the exam/ })).toBeInTheDocument();
    expect(savedRun().claimedBy).toBe("u1");

    // The account that claimed it still has it.
    cleanup();
    session.userId = "u1";
    mount();
    expect(screen.getByText(/Your last score was/)).toHaveTextContent("Your last score was 100%.");
  });

  it("offers extended time, and keeps that allowance for the sitting and for another one after it", () => {
    mountFull();
    expect(screen.getByText(/^Take the exam with extended time:/)).toHaveTextContent(
      "Take the exam with extended time: 135 minutes of extended time or 180 minutes of extended time."
    );
    fireEvent.click(screen.getByRole("button", { name: "135 minutes of extended time" }));
    expect(savedRun().limitMs).toBe(135 * 60_000);
    expect(savedRun().size).toBe("full");
    expect(savedQuestions()).toHaveLength(90);
    expect(screen.getByRole("timer")).toHaveTextContent("2:15:00");

    // Paused and resumed, the sitting keeps its limit.
    pause();
    expect(screen.getByText(/2:15:00 remaining/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Resume the exam/ }));
    finishNow();
    expect(screen.getByText("You used 1 of 135 minutes.")).toBeInTheDocument();

    // Another sitting from the result: the same length, and the same time allowed.
    fireEvent.click(screen.getByRole("button", { name: /Take the exam again/ }));
    expect(savedRun().limitMs).toBe(135 * 60_000);
    expect(savedRun().done).toBeNull();

    // Double time, and the standard limit by default.
    cleanup();
    window.localStorage.clear();
    mountFull();
    fireEvent.click(screen.getByRole("button", { name: "180 minutes of extended time" }));
    expect(savedRun().limitMs).toBe(180 * 60_000);
  });

  it("puts the focus on the card the person comes back to, and never as the page loads", () => {
    mount();
    expect(document.body).toHaveFocus();
    start();
    expect(screen.getByRole("heading", { name: /^Question text \d\?$/ })).toHaveFocus();
    pause();
    expect(screen.getByRole("heading", { name: "3 questions in 45 minutes" })).toHaveFocus();

    // A later visit with a sitting in progress: the page loads, and the focus is left alone.
    cleanup();
    mount();
    expect(screen.getByText(/in progress/)).toBeInTheDocument();
    expect(document.body).toHaveFocus();
  });
});

describe("PracticeExamJump", () => {
  function page() {
    return render(
      <>
        <div data-testid="opening-lines">
          <PracticeExamJump testId="security-plus-sy0-801" />
        </div>
        <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={REPS} size="half" next={NEXT} />
      </>
    );
  }

  it("leads from the opening lines to the practice exam", () => {
    page();
    expect(screen.getByRole("link", { name: "Go to the practice exam" })).toHaveAttribute("href", "#practice-test");
    expect(renderToStaticMarkup(<PracticeExamJump testId="security-plus-sy0-801" />)).toContain("Go to the practice exam");
  });

  it("says when a sitting is in progress on this device, and resumes it", () => {
    page();
    start();
    const first = answer(true);
    // While the exam is on screen the opening lines stay as they are.
    expect(screen.getByRole("link", { name: "Go to the practice exam" })).toBeInTheDocument();
    pause();
    expect(
      screen.getByText(/^You have a practice exam in progress, with 1 of 3 questions answered\./, { selector: "p" })
    ).toHaveTextContent("You have a practice exam in progress, with 1 of 3 questions answered. Resume the exam.");

    // A later visit: the line is there once the page has read the device.
    cleanup();
    page();
    track.mockClear();
    // (The card further down has its own button of the same name.)
    fireEvent.click(within(screen.getByTestId("opening-lines")).getByRole("button", { name: "Resume the exam" }));
    expect(track).toHaveBeenCalledWith("practice_test_started", {
      test: "security-plus-sy0-801",
      questions: 3,
      resumed: true,
    });
    expect(onScreen()).toBe(first);
    // The question where the sitting stopped has the focus: it is read, and the keys act on it.
    expect(screen.getByRole("heading", { name: /^Question text \d\?$/ })).toHaveFocus();
    expect(screen.getByRole("link", { name: "Go to the practice exam" })).toBeInTheDocument();
  });
});
