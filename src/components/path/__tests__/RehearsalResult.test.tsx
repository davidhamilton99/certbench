// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ChoiceRep, PathStructure } from "@/core/path/types";
import type { RehearsalRun } from "../rehearsal-run";

// The score counts up with requestAnimationFrame; its look has its own tests.
vi.mock("@/components/instrument/ScoreLevel", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/components/instrument/ScoreLevel")>()),
  ScoreLevel: ({ score }: { score: number }) => <div data-testid="score">{score}%</div>,
}));

import { RehearsalResult } from "../RehearsalResult";

const structure: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    { number: "1.0", title: "General Security Concepts", weight: 40, objectives: [{ code: "1.1", title: "Security controls" }] },
    { number: "2.0", title: "Threats, Vulnerabilities, and Mitigations", weight: 60, objectives: [{ code: "2.1", title: "Threat actors" }] },
  ],
};

const rep = (n: number, objective: string): ChoiceRep => ({
  id: `q|${objective}|${n}`,
  type: "choice",
  label: "Exam style",
  tier: "exam",
  objective,
  prompt: `Question text ${n}?`,
  options: ["Right answer", "Wrong one", "Wrong two", "Wrong three"],
  answer: 0,
  takeaway: `Takeaway ${n}.`,
});

/** A finished sitting of three questions: two answered correctly and one incorrectly. */
const run = (extra: Partial<NonNullable<RehearsalRun["done"]>> = {}): RehearsalRun & { done: NonNullable<RehearsalRun["done"]> } => ({
  v: 1,
  owner: "u1",
  size: "full",
  asStop: false,
  reps: [rep(1, "1.1"), rep(2, "2.1"), rep(3, "2.1")],
  picks: [0, 0, 1],
  flagged: [],
  i: 2,
  spentMs: 30 * 60_000,
  limitMs: 90 * 60_000,
  startedAt: 5,
  done: {
    result: {
      score: 70,
      at: 1_800_000_000_000,
      domains: [
        { number: "1.0", correct: 1, total: 1 },
        { number: "2.0", correct: 1, total: 2 },
      ],
      size: "full",
      answered: 3,
      total: 3,
      seconds: 30 * 60,
    },
    before: null,
    timedOut: false,
    ...extra,
  },
});

afterEach(cleanup);

describe("a practice exam's result", () => {
  it("is the title of its screen on the study path, with the list of answers as the heading under it", () => {
    render(
      <RehearsalResult run={run()} structure={structure} headlineAs="h1">
        <p>What comes next</p>
      </RehearsalResult>
    );
    const titles = screen.getAllByRole("heading", { level: 1 });
    expect(titles).toHaveLength(1);
    expect(titles[0].textContent).toBe("This is where you stand.");
    expect(screen.getByRole("heading", { level: 2, name: "Your answers" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
    // It takes the focus as it arrives, and names what it is.
    expect(screen.getByRole("group", { name: "Security+ practice exam result" })).toHaveFocus();
  });

  it("stands under a public page's own title: its headline is a second-level heading, and the answers a third", () => {
    render(
      <RehearsalResult run={run()} structure={structure}>
        <p>What comes next</p>
      </RehearsalResult>
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("This is where you stand.");
    expect(screen.getByRole("heading", { level: 3, name: "Your answers" })).toBeInTheDocument();
  });

  it("filters the answers with two buttons in a named group, of which one is pressed", () => {
    render(
      <RehearsalResult run={run()} structure={structure}>
        <p>What comes next</p>
      </RehearsalResult>
    );
    // They filter one list. They are not tabs: there are no panels and no arrow keys to promise.
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tab")).toBeNull();
    const filter = screen.getByRole("group", { name: "Which answers to show" });
    const missed = within(filter).getByRole("button", { name: "Missed (1)" });
    const all = within(filter).getByRole("button", { name: "All (3)" });
    expect(within(filter).getAllByRole("button")).toEqual([missed, all]);
    expect(missed).toHaveAttribute("aria-pressed", "true");
    expect(all).toHaveAttribute("aria-pressed", "false");
    // Neither carries what belongs to a tab.
    for (const button of [missed, all]) {
      expect(button).not.toHaveAttribute("role");
      expect(button).not.toHaveAttribute("aria-selected");
    }
    expect(screen.getByText("Question text 3?")).toBeInTheDocument();
    expect(screen.queryByText("Question text 1?")).toBeNull();

    fireEvent.click(all);
    expect(all).toHaveAttribute("aria-pressed", "true");
    expect(missed).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Question text 1?")).toBeInTheDocument();
    expect(screen.getByText("Question text 3?")).toBeInTheDocument();
  });

  it("opens on every answer, with that button pressed, when nothing was missed", () => {
    const perfect = run();
    perfect.picks = [0, 0, 0];
    render(
      <RehearsalResult run={perfect} structure={structure}>
        <p>What comes next</p>
      </RehearsalResult>
    );
    expect(screen.getByRole("button", { name: "All (3)" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Missed (0)" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Missed (0)" }));
    expect(screen.getByText("You did not miss any questions.")).toBeInTheDocument();
  });

  it("draws the icons of its notes in ink: the pressable colour is kept for what can be pressed", () => {
    render(
      <RehearsalResult run={run()} structure={structure}>
        <p>What comes next</p>
      </RehearsalResult>
    );
    const time = screen.getByText("You used 30 of 90 minutes.").closest(".glass")!;
    const focus = screen.getByText("The area to focus on next").closest(".glass")!;
    for (const note of [time, focus]) {
      const icon = note.querySelector("svg")!;
      expect(icon.getAttribute("class")).toContain("text-muted-foreground");
      expect(icon.getAttribute("class")).not.toContain("text-primary");
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
    // The two notes stand side by side and are set in the same size.
    expect(time.querySelector("div")?.className).toBe(focus.querySelector("div")?.className);
  });

  it("says that the time limit was reached, in the name it takes the focus with and in the note", () => {
    render(
      <RehearsalResult run={run({ timedOut: true })} structure={structure}>
        <p>What comes next</p>
      </RehearsalResult>
    );
    expect(
      screen.getByRole("group", { name: "The time limit was reached. Security+ practice exam result" })
    ).toHaveFocus();
    expect(screen.getByText("The time limit of 90 minutes was reached.")).toBeInTheDocument();
  });
});
