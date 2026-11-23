// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ChoiceRep, PathStructure } from "@/core/path/types";

const track = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));
// The arrow reads its link's status, which needs the app router around it.
vi.mock("@/components/ui/link-arrow", () => ({ LinkArrow: () => null }));
// Who is signed in: nobody, unless a test says otherwise. Undefined while the
// page has not yet learned who it is.
const session = vi.hoisted(() => ({ userId: null as string | null | undefined }));
vi.mock("@/components/auth/useSignedIn", () => ({ useSessionUserId: () => session.userId }));

import { readGuestPath, readLocalPath, readVisitorPath, writeLocalPath } from "@/components/path/local-path";
import { begunOnPublicPage, takeOwedStartEvent } from "@/components/path/path-start";
import { EMPTY_PATH_PROGRESS } from "@/core/path/types";
import { recordRep } from "@/core/path/progress";
import { SampleQuestions } from "../SampleQuestions";

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

const rep = (key: string, objective: string, prompt: string, options: string[], answer: number): ChoiceRep => ({
  id: `a|${objective}|${key}`,
  type: "choice",
  label: "Recall",
  tier: "quick",
  objective,
  prompt,
  options,
  answer,
  takeaway: `Reason for ${key}.`,
});

const REPS = [
  rep("w3", "1.2", "Which part of the CIA triad does a file hash prove?", ["Integrity", "Confidentiality"], 0),
  rep("w5", "2.2", "A text links to a fake courier site. What is this?", ["Vishing", "Smishing"], 1),
  rep("w4", "4.6", "Which principle gives an account only what its job needs?", ["Least privilege", "Zero trust"], 0),
];

const STRUCTURE: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    {
      number: "1.0",
      title: "General security concepts",
      weight: 12,
      objectives: [{ code: "1.2", title: "Core security concepts" }],
    },
    {
      number: "2.0",
      title: "Threats, vulnerabilities, and mitigations",
      weight: 22,
      objectives: [{ code: "2.2", title: "Threat vectors" }],
    },
    {
      number: "4.0",
      title: "Security operations",
      weight: 28,
      objectives: [{ code: "4.6", title: "Identity and access" }],
    },
  ],
  library: [],
} as unknown as PathStructure;

function answer(name: RegExp | string) {
  fireEvent.click(screen.getByRole("button", { name }));
  fireEvent.click(screen.getByRole("button", { name: /Continue/ }));
}

beforeEach(() => {
  track.mockClear();
  window.localStorage.clear();
  session.userId = null;
});

describe("the home page's sample questions", () => {
  it("names the objective above each question and counts the questions", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    expect(screen.getByRole("heading", { name: "Sample questions" })).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Security+ objective 1.2: Core security concepts.")).toBeInTheDocument();
  });

  it("ends as a marked paper when every answer is correct", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    answer(/Smishing/);
    answer(/Least privilege/);

    expect(screen.getByText("You answered 3 of 3 questions correctly.")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: "Your answers" })).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("1.2");
    expect(rows[0]).toHaveTextContent("Correct answer: Integrity.");
    expect(rows[0]).toHaveTextContent(/Correct$/);
    // The closing sentence names the exam with its code and counts from the structure.
    expect(
      screen.getByText(
        "The Security+ SY0-701 study path asks questions like these on all 3 exam objectives, in 41 short steps."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Choose your exam/ })).toHaveAttribute("href", "/start");
  });

  // Network+ is set out by CertBench's own topics, not by CompTIA's objectives,
  // so the sheet never counts "exam objectives" for it.
  it("counts topics, not exam objectives, for an exam set out by CertBench's own topics", () => {
    const netPlus = { ...STRUCTURE, certSlug: "network-plus-n10-009", examName: "Network+", examCode: "N10-009" };
    const { container } = render(<SampleQuestions reps={REPS} structure={netPlus} steps={30} />);
    answer(/Integrity/);
    answer(/Smishing/);
    answer(/Least privilege/);
    expect(
      screen.getByText("The Network+ N10-009 study path asks questions like these on all 3 topics, in 30 short steps.")
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/exam objectives/);
  });

  it("asks a missed question once more before the result, and says so", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Confidentiality/); // wrong
    answer(/Smishing/);
    answer(/Least privilege/);

    // The fourth card is the first question again, with the reason it is back.
    expect(screen.getByText("A question repeated")).toBeInTheDocument();
    expect(
      screen.getByText(
        "You answered this question incorrectly. The study path repeats a question until you answer it correctly."
      )
    ).toBeInTheDocument();
    answer(/Integrity/);

    expect(screen.getByText("You answered 2 of 3 questions correctly.")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: "Your answers" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Incorrect, then correct");
    expect(rows[1]).toHaveTextContent(/Correct$/);
    expect(screen.getByText(/repeats each question that you answer incorrectly until you answer it correctly\./)).toBeInTheDocument();
  });

  it("repeats two questions at most", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Confidentiality/);
    answer(/Vishing/);
    answer(/Zero trust/);
    // Two repeats, then the result: three misses do not make three repeats.
    answer(/Integrity/);
    answer(/Vishing/);
    expect(screen.getByText("You answered 0 of 3 questions correctly.")).toBeInTheDocument();
    const rows = within(screen.getByRole("list", { name: "Your answers" })).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Incorrect, then correct");
    expect(rows[1]).toHaveTextContent("Incorrect twice");
    expect(rows[2]).toHaveTextContent(/Incorrect$/);
  });

  it("records each question once and the finish, by the names and properties the funnel already uses", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Confidentiality/);
    answer(/Smishing/);
    answer(/Least privilege/);
    // The missed question, asked again: answered, but not counted a second time.
    answer(/Integrity/);
    expect(track.mock.calls.filter(([name]) => name === "sample_question_answered")).toEqual([
      ["sample_question_answered", { correct: false, surface: "home_demo" }],
      ["sample_question_answered", { correct: true, surface: "home_demo" }],
      ["sample_question_answered", { correct: true, surface: "home_demo" }],
    ]);
    // The score that is reported counts first answers only.
    expect(track).toHaveBeenCalledWith("question_deck_completed", { surface: "home_demo", correct: 2, total: 3 });
  });

  // An account made anywhere else (the header's sign-up, say) must not be
  // counted as one that the study path's save request made (path-start.ts).
  it("marks a signed-out visitor's work as begun on a public page, and a signed-in member's not", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    expect(begunOnPublicPage("security-plus-sy0-701")).toBe(true);

    window.localStorage.clear();
    cleanup();
    session.userId = "member-1";
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    expect(begunOnPublicPage("security-plus-sy0-701")).toBe(false);
  });

  it("keeps the answers on the device as the study path's first answers", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    const kept = readLocalPath("security-plus-sy0-701");
    expect(kept?.owner).toBeNull();
    expect(Object.keys(kept?.progress.items ?? {})).toContain("a|1.2|w3");
  });

  // `path_started` is recorded by the study path's page at a visitor's first
  // answer there. The copy this answer begins has "started" already, so the
  // home page says that the event is still owed.
  it("leaves the study path's start event owed when its answer begins the device's copy", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    answer(/Smishing/);
    expect(takeOwedStartEvent("security-plus-sy0-701")).toBe(true);
    // Taken once: a later sample answer adds to a copy that has begun, and owes nothing more.
    answer(/Least privilege/);
    expect(takeOwedStartEvent("security-plus-sy0-701")).toBe(false);
  });

  it("owes nothing for a visitor whose study path had already begun", () => {
    writeLocalPath("security-plus-sy0-701", {
      v: 1,
      owner: null,
      progress: recordRep(EMPTY_PATH_PROGRESS, "a|1.1|w1", true, 1),
    });
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    expect(takeOwedStartEvent("security-plus-sy0-701")).toBe(false);
  });

  it("keeps a signed-in member's answers in that member's own copy", () => {
    session.userId = "member-1";
    writeLocalPath("security-plus-sy0-701", {
      v: 1,
      owner: "member-1",
      progress: recordRep(EMPTY_PATH_PROGRESS, "a|1.1|w1", true, 1),
    });
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);

    const kept = readLocalPath("security-plus-sy0-701");
    expect(kept?.owner).toBe("member-1");
    expect(Object.keys(kept?.progress.items ?? {})).toEqual(expect.arrayContaining(["a|1.1|w1", "a|1.2|w3"]));
    expect(readGuestPath("security-plus-sy0-701")).toBeNull();
  });

  // A shared computer with no copy on it: a member answers the samples, signs
  // out, and the next person answers them too.
  it("begins the member's own copy, and keeps the next person's answers apart from it", () => {
    session.userId = "member-1";
    const first = render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    expect(readLocalPath("security-plus-sy0-701")).toMatchObject({ owner: "member-1" });
    first.unmount();

    session.userId = null;
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Confidentiality/);
    expect(Object.keys(readLocalPath("security-plus-sy0-701")?.progress.items ?? {})).toEqual(["a|1.2|w3"]);
    expect(readLocalPath("security-plus-sy0-701")?.progress.items["a|1.2|w3"]).toMatchObject({ c: 1 });
    // The next person's answer is guest work, and they are shown nothing of the member's.
    expect(readGuestPath("security-plus-sy0-701")?.items["a|1.2|w3"]).toMatchObject({ c: 0 });
    expect(readVisitorPath("security-plus-sy0-701")?.items["a|1.2|w3"]).toMatchObject({ c: 0 });
  });

  it("keeps an answer given before the page knows who is signed in, once it knows, as that person's", () => {
    session.userId = undefined;
    const view = render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    // Not kept as an anonymous visitor's in the meantime.
    expect(readLocalPath("security-plus-sy0-701")).toBeNull();
    expect(readGuestPath("security-plus-sy0-701")).toBeNull();

    session.userId = "member-1";
    view.rerender(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    expect(readLocalPath("security-plus-sy0-701")).toMatchObject({ owner: "member-1" });
    expect(Object.keys(readLocalPath("security-plus-sy0-701")?.progress.items ?? {})).toEqual(["a|1.2|w3"]);
  });

  // A shared computer: the device holds one person's study path and someone
  // else, signed out, answers the samples.
  it("never adds a signed-out visitor's answers to an account's copy on the device", () => {
    writeLocalPath("security-plus-sy0-701", {
      v: 1,
      owner: "member-1",
      progress: recordRep(EMPTY_PATH_PROGRESS, "a|1.1|w1", true, 1),
    });
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);

    expect(Object.keys(readLocalPath("security-plus-sy0-701")?.progress.items ?? {})).toEqual(["a|1.1|w1"]);
    expect(Object.keys(readGuestPath("security-plus-sy0-701")?.items ?? {})).toEqual(["a|1.2|w3"]);
  });

  it("starts again from the first question", () => {
    render(<SampleQuestions reps={REPS} structure={STRUCTURE} steps={41} />);
    answer(/Integrity/);
    answer(/Smishing/);
    answer(/Least privilege/);
    fireEvent.click(screen.getByRole("button", { name: "Answer the questions again" }));
    expect(screen.getByText("Question 1 of 3")).toBeInTheDocument();
    expect(screen.getByText("Which part of the CIA triad does a file hash prove?")).toBeInTheDocument();
  });
});
