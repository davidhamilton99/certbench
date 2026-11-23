// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ChoiceRep, PathStructure } from "@/core/path/types";
import { RehearsalIntro, RehearsalResumeCard } from "../RehearsalIntro";
import type { RehearsalRun } from "../rehearsal-run";

const structure: PathStructure = {
  certSlug: "security-plus-sy0-701",
  examName: "Security+",
  examCode: "SY0-701",
  domains: [
    { number: "1.0", title: "General Security Concepts", weight: 40, objectives: [{ code: "1.1", title: "Security controls" }] },
    { number: "2.0", title: "Threats, Vulnerabilities, and Mitigations", weight: 60, objectives: [{ code: "2.1", title: "Threat actors" }] },
  ],
};

function intro(props: Partial<Parameters<typeof RehearsalIntro>[0]> = {}) {
  const onStart = vi.fn();
  const onBack = vi.fn();
  render(<RehearsalIntro structure={structure} stopNumber={null} reading={null} onStart={onStart} onBack={onBack} {...props} />);
  return { onStart, onBack };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("the screen before a practice exam on the study path", () => {
  it("has its own title, which takes the focus as the screen opens", () => {
    intro();
    // It is a screen of its own on the study path, so its heading is the screen's one title.
    const titles = screen.getAllByRole("heading", { level: 1 });
    expect(titles).toHaveLength(1);
    expect(titles[0]).toHaveTextContent("Take a full-length practice exam.");
    expect(titles[0]).toHaveFocus();
    expect(titles[0]).toHaveAttribute("tabindex", "-1");
    // The exam's limits come from the one place that holds them.
    expect(
      screen.getByText(/The practice exam has 90 questions and a time limit of 90 minutes, which are the limits of the real SY0-701 exam\./)
    ).toBeInTheDocument();
    expect(screen.getByText(/drawn from all 2 domains/)).toBeInTheDocument();
    // What the practice exam does, and nothing about how the real exam behaves.
    expect(screen.getByText(/in the same proportions as the exam\. No answer is shown until you finish\.$/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/as in the real exam/i);
  });

  it("says where it stands on the study path when it is the last step, and says nothing of it otherwise", () => {
    intro({ stopNumber: 41 });
    expect(screen.getByText("Step 41: practice exam")).toBeInTheDocument();
    cleanup();
    intro();
    expect(screen.queryByText(/^Step \d+/)).toBeNull();
  });

  it("names the result that the score will be compared with, with its date in English whatever the browser's language", () => {
    const format = vi.spyOn(Date.prototype, "toLocaleDateString");
    const at = Date.UTC(2026, 10, 14, 18);
    intro({ reading: { source: "checkpoint", score: 58, at } });
    const day = new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric" });
    expect(
      screen.getByText(`Your score is compared with the readiness target and with your checkpoint result of 58% from ${day}.`)
    ).toBeInTheDocument();
    // The date is asked for in English, not in the language the browser happens to be set to.
    for (const call of format.mock.calls) expect(call[0]).toBe("en-US");
    expect(format).toHaveBeenCalled();
    cleanup();

    intro({ reading: { source: "rehearsal", score: 71, at } });
    expect(screen.getByText(new RegExp(`with your last practice exam result of 71% from ${day}\\.$`))).toBeInTheDocument();
    cleanup();

    intro();
    expect(screen.getByText("Your score is compared with the readiness target, and every answer is explained.")).toBeInTheDocument();
  });

  it("starts the full exam or the half-length one, and leads back to the study path", () => {
    const { onStart, onBack } = intro();
    fireEvent.click(screen.getByRole("button", { name: /^Start the full practice exam/ }));
    expect(onStart).toHaveBeenLastCalledWith("full");
    fireEvent.click(screen.getByRole("button", { name: "Half-length exam: 45 questions in 45 minutes" }));
    expect(onStart).toHaveBeenLastCalledWith("half");
    fireEvent.click(screen.getByRole("button", { name: "Return to the study path" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("the card for a practice exam left part-way, on the study path's home screen", () => {
  /** A class that draws text, a fill, an edge or an icon in the pressable colour, with or without a variant or a tint. */
  const PRESSABLE = /(?:^|[\s:])(?:text|bg|border|fill|stroke|ring|outline|decoration)-primary(?:\/[\w.[\]%-]+)?(?=\s|$)/;
  const classOf = (element: Element) => element.getAttribute("class") ?? "";

  const question = (n: number): ChoiceRep => ({
    id: `q-${n}`,
    type: "choice",
    label: "Exam style",
    tier: "exam",
    objective: "1.1",
    prompt: `Question ${n}?`,
    options: ["A", "B", "C", "D"],
    answer: 0,
    takeaway: "Because.",
  });
  const run: RehearsalRun = {
    v: 1,
    owner: "u1",
    size: "full",
    asStop: false,
    reps: [question(1), question(2), question(3)],
    picks: [0, null, null],
    flagged: [],
    i: 1,
    spentMs: 5 * 60_000,
    limitMs: 90 * 60_000,
    startedAt: 1,
    done: null,
  };

  function card(handlers: { onResume?: () => void; onDiscard?: () => void } = {}) {
    const { container } = render(
      <RehearsalResumeCard run={run} onResume={handlers.onResume ?? (() => {})} onDiscard={handlers.onDiscard ?? (() => {})} />
    );
    return container.firstElementChild!;
  }

  // The colour rule: one colour means "press this", and it is drawn only on what
  // can be pressed. The card's edge was drawn in it, which made the whole card
  // look like something to press.
  it("has the ordinary edge of a card, and nothing but its controls in the pressable colour", () => {
    const root = card();
    expect(classOf(root)).toContain("glass");
    expect(classOf(root)).not.toMatch(/border-primary/);
    const notPressed = [root, ...root.querySelectorAll("*")].filter((el) => !el.closest("button, a"));
    expect(notPressed.filter((el) => PRESSABLE.test(classOf(el))).map(classOf)).toEqual([]);
    // The clock's icon is in the ink of its own line.
    const clock = screen.getByText(/remaining$/);
    expect(classOf(clock)).toContain("text-muted-foreground");
    expect(classOf(clock.querySelector("svg")!)).not.toMatch(PRESSABLE);
  });

  it("says how far the exam has gone and how long is left, and resumes it", () => {
    const onResume = vi.fn();
    card({ onResume });
    expect(screen.getByText("You have a practice exam in progress.")).toBeInTheDocument();
    expect(screen.getByText("1 of 3 questions answered")).toBeInTheDocument();
    expect(screen.getByText(/remaining$/)).toHaveTextContent("1:25:00 remaining");
    fireEvent.click(screen.getByRole("button", { name: /^Resume the exam/ }));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it("asks before discarding, opens the question on the choice that loses nothing, and returns the focus on keeping", () => {
    const onDiscard = vi.fn();
    card({ onDiscard });
    fireEvent.click(screen.getByRole("button", { name: "Discard this practice exam" }));
    expect(screen.getByText("Do you want to discard this practice exam? Its answers will not be counted.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep the exam" })).toHaveFocus();
    expect(onDiscard).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Keep the exam" }));
    expect(screen.getByRole("button", { name: "Discard this practice exam" })).toHaveFocus();

    fireEvent.click(screen.getByRole("button", { name: "Discard this practice exam" }));
    fireEvent.click(screen.getByRole("button", { name: "Discard the exam" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });
});
