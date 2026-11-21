// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
const identifyUser = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track, identifyUser }));

// Who's signed in, and the account form: one tap stands in for signing up.
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

// The dial animates with rAF; its look isn't under test here.
vi.mock("@/components/instrument/ReadinessDial", () => ({
  ReadinessDial: ({ score, caption }: { score: number; caption?: string }) => (
    <div data-testid="dial">
      {score}% {caption}
    </div>
  ),
}));

import { PracticeExam } from "../PracticeExam";
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
  heading: "Keep going on the Security+ path",
  body: "The path covers the ground the two exams share.",
  primary: { href: "/path/security-plus-sy0-701", label: "Start my Security+ path" },
  links: [{ href: "/security-plus-sy0-801-vs-sy0-701", label: "SY0-801 or SY0-701?" }],
};

const STORAGE_KEY = pathRehearsalKey("security-plus-sy0-801-practice-test");

function mount() {
  return render(
    <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={REPS} size="half" next={NEXT} />
  );
}

/** The question on screen, by its number in the fixture. */
function onScreen(): number {
  const heading = screen.getByRole("heading", { name: /^Question text \d\?$/ });
  return Number(heading.textContent!.match(/\d/)![0]);
}

/** Answer the question on screen, right or wrong. */
function answer(right: boolean) {
  const n = onScreen();
  fireEvent.click(screen.getByRole("radio", { name: new RegExp(right ? `Right ${n}` : `Wrong ${n}a`) }));
  return n;
}

// Node's own experimental `localStorage` global shadows jsdom's — use a plain
// in-memory Storage so the run's persistence is exercised for real.
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

/** Sit the three-question test, every answer right, to the score. */
function sitIt() {
  fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
  for (let k = 0; k < 3; k++) {
    answer(true);
    fireEvent.click(screen.getByRole("button", { name: k < 2 ? /^Next/ : /^Finish/ }));
  }
  fireEvent.click(screen.getByRole("button", { name: /See my score/ }));
}
afterEach(() => {
  vi.useRealTimers();
});

/** A full-length draw: 36 questions in domain 1 (weight 40) and 54 in domain 2 (weight 60). */
const FULL_REPS = examReps(Array.from({ length: 90 }, (_, i) => question(i + 1, i % 5 < 2 ? "1.1" : "2.1")));

describe("PracticeExam", () => {
  it("offers a full-length exam, or a half cut from it in the exam's weights", () => {
    render(
      <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={FULL_REPS} size="full" offerHalf next={NEXT} />
    );
    expect(screen.getByRole("heading", { name: "90 questions, 90 minutes." })).toBeInTheDocument();
    expect(screen.getByText(/The real exam's limit, so it's full length at the real pace./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Start the full exam/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Half exam: 45 questions, 45 min" }));
    expect(track).toHaveBeenCalledWith("practice_test_started", { test: "security-plus-sy0-801", questions: 45, resumed: false });
    const saved = JSON.parse(store.get(STORAGE_KEY)!);
    expect(saved.size).toBe("half");
    expect(saved.limitMs).toBe(45 * 60_000);
    expect(saved.reps).toHaveLength(45);
    expect(saved.reps.filter((r: { objective: string }) => r.objective === "1.1")).toHaveLength(18);

    fireEvent.click(screen.getByRole("button", { name: "All questions" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave for now" }));
    expect(screen.getByText(/In progress: 0 of 45 answered/)).toBeInTheDocument();
  });

  it("starts the full exam at the real exam's length", () => {
    render(
      <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={FULL_REPS} size="full" offerHalf next={NEXT} />
    );
    fireEvent.click(screen.getByRole("button", { name: /^Start the full exam/ }));
    const saved = JSON.parse(store.get(STORAGE_KEY)!);
    expect(saved.size).toBe("full");
    expect(saved.reps).toHaveLength(90);
    expect(saved.limitMs).toBe(90 * 60_000);
  });

  it("keeps the score for a free account, says so before they start, and shows it once they sign up", () => {
    session.userId = null;
    mount();
    expect(screen.getByText("Free. A free account shows your score when you finish.")).toBeInTheDocument();
    sitIt();

    expect(screen.getByRole("heading", { name: "Your score is ready." })).toBeInTheDocument();
    expect(screen.getByText(/You answered 3 of 3\. Create a free account to see your score by domain/)).toBeInTheDocument();
    expect(screen.queryByTestId("dial")).toBeNull();
    expect(track).toHaveBeenCalledWith("practice_test_gate_viewed", { test: "security-plus-sy0-801" });
    // Scored all the same: the result is counted, and kept on the device.
    expect(track).toHaveBeenCalledWith("practice_test_completed", expect.objectContaining({ score: 100 }));

    fireEvent.click(screen.getByRole("button", { name: "Show my score" }));
    expect(screen.getByTestId("dial")).toHaveTextContent("100%");
    expect(identifyUser).toHaveBeenCalledWith("u9", { email: "new@example.com" });
    expect(track).toHaveBeenCalledWith("practice_test_account_linked", { test: "security-plus-sy0-801", method: "email_signup" });
  });

  it("doesn't show a signed-out visitor an earlier score, only the way to it", () => {
    mount();
    sitIt();
    cleanup();
    session.userId = null;
    mount();
    expect(screen.getByText(/You finished it last time\./)).toBeInTheDocument();
    expect(screen.queryByText(/Last time you scored/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "See your score" }));
    expect(screen.getByRole("heading", { name: "Your score is ready." })).toBeInTheDocument();
  });

  it("opens the score straight away when Google sign-in brings them back", () => {
    mount();
    sitIt();
    cleanup();
    window.history.replaceState(null, "", "/security-plus-sy0-801-practice-test?exam=scored");
    mount();
    expect(screen.getByTestId("dial")).toHaveTextContent("100%");
    expect(window.location.search).toBe("");
    expect(track).toHaveBeenCalledWith("practice_test_account_linked", { test: "security-plus-sy0-801", method: "redirect" });
  });

  it("offers the test in the server-rendered page, before any script runs", () => {
    const html = renderToStaticMarkup(
      <PracticeExam testId="security-plus-sy0-801" structure={STRUCTURE} reps={REPS} size="half" next={NEXT} />
    );
    expect(html).toContain("Practice test · SY0-801");
    expect(html).toContain("3 questions, 45 minutes.");
    expect(html).toContain("Start the test");
  });

  it("runs every question with no answers shown, then scores it by domain", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    expect(track).toHaveBeenCalledWith("practice_test_started", {
      test: "security-plus-sy0-801",
      questions: 3,
      resumed: false,
    });

    // Every question comes up once, in the sitting's own order; one from domain 2 is missed.
    const seen: number[] = [];
    for (let k = 0; k < 3; k++) {
      const n = onScreen();
      seen.push(answer(n !== 3));
      expect(screen.queryByText(/Takeaway/)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: k < 2 ? /^Next/ : /^Finish/ }));
    }
    expect([...seen].sort()).toEqual([1, 2, 3]);
    expect(screen.getByText("Every question answered")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /See my score/ }));

    // Domain 1: 1/1 at 40%. Domain 2: 1/2 at 60%. Weighted: 70%.
    expect(screen.getByTestId("dial")).toHaveTextContent("70% Practice test");
    expect(screen.getByText("Practice test · Security+ SY0-801")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "practice_test_completed",
      expect.objectContaining({ test: "security-plus-sy0-801", score: 70, answered: 3, total: 3, timed_out: false })
    );
    expect(track).toHaveBeenCalledWith("upsell_viewed", { context: "security-plus-sy0-801_practice_test" });

    // The miss is explained, and the way on is offered.
    expect(screen.getByRole("tab", { name: "Missed (1)" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Question text 3?")).toBeInTheDocument();
    expect(screen.getByText("Takeaway 3.")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /Start my Security\+ path/ });
    expect(cta).toHaveAttribute("href", "/path/security-plus-sy0-701");
    // jsdom can't follow a link; the click only has to be recorded.
    cta.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(cta);
    expect(track).toHaveBeenCalledWith("upsell_clicked", {
      context: "security-plus-sy0-801_practice_test",
      href: "/path/security-plus-sy0-701",
    });
  });

  it("keeps a sitting left mid-way on the device, and picks it back up", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    const first = answer(true);
    fireEvent.click(screen.getByRole("button", { name: "All questions" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave for now" }));
    expect(screen.getByText(/In progress: 1 of 3 answered/)).toBeInTheDocument();

    // A closed tab, then back to the page.
    cleanup();
    mount();
    expect(screen.getByText(/In progress: 1 of 3 answered/)).toBeInTheDocument();
    track.mockClear();
    fireEvent.click(screen.getByRole("button", { name: /Resume the test/ }));
    expect(track).toHaveBeenCalledWith("practice_test_started", {
      test: "security-plus-sy0-801",
      questions: 3,
      resumed: true,
    });
    expect(onScreen()).toBe(first);
    expect(screen.getByRole("radio", { name: new RegExp(`Right ${first}`) })).toHaveAttribute("aria-checked", "true");
  });

  it("starts over only after asking, and throws the answers away", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    answer(true);
    fireEvent.click(screen.getByRole("button", { name: "All questions" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave for now" }));

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByText("Throw away these answers?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Keep them" }));
    expect(screen.getByText(/In progress: 1 of 3 answered/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.queryByText(/In progress/)).toBeNull();
    expect(screen.getByRole("button", { name: /Start the test/ })).toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("shows the last result again on a later visit, and offers another sitting", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    for (let k = 0; k < 3; k++) {
      answer(true);
      fireEvent.click(screen.getByRole("button", { name: k < 2 ? /^Next/ : /^Finish/ }));
    }
    fireEvent.click(screen.getByRole("button", { name: /See my score/ }));
    expect(screen.getByTestId("dial")).toHaveTextContent("100%");

    cleanup();
    mount();
    expect(screen.getByText(/Last time you scored/)).toHaveTextContent("Last time you scored 100%.");
    fireEvent.click(screen.getByRole("button", { name: "See that result" }));
    expect(screen.getByTestId("dial")).toHaveTextContent("100%");

    fireEvent.click(screen.getByRole("button", { name: /Take the test again/ }));
    expect(screen.getByText("0 of 3 answered")).toBeInTheDocument();
    expect(screen.queryByTestId("dial")).toBeNull();
  });

  it("scores what was answered when the clock runs out", () => {
    vi.useFakeTimers();
    mount();
    fireEvent.click(screen.getByRole("button", { name: /Start the test/ }));
    answer(true);
    // The 45 minutes pass, one second at a time (a tick counts at most five).
    act(() => {
      vi.advanceTimersByTime(45 * 60_000 + 2_000);
    });
    expect(screen.getByText("Time ran out at 45 minutes")).toBeInTheDocument();
    expect(screen.getByText("2 left unanswered, counted as wrong.")).toBeInTheDocument();
    expect(track).toHaveBeenCalledWith(
      "practice_test_completed",
      expect.objectContaining({ answered: 1, total: 3, minutes: 45, timed_out: true })
    );
  });
});
