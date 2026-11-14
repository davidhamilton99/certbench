// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

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
});
afterEach(() => {
  vi.useRealTimers();
});

describe("PracticeExam", () => {
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
