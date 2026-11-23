// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { RehearsalPlayer } from "../RehearsalPlayer";
import type { RehearsalRun } from "../rehearsal-run";
import type { ChoiceRep } from "@/core/path/types";

const rep = (n: number): ChoiceRep => ({
  id: `q|1.${n}|00000000-0000-4000-8000-00000000000${n}`,
  type: "choice",
  label: "Exam style",
  tier: "exam",
  objective: `1.${n}`,
  prompt: `Question text ${n}`,
  options: ["Right answer", "Wrong one", "Wrong two", "Wrong three"],
  answer: 0,
  takeaway: `Takeaway ${n}`,
  lettered: true,
});

const makeRun = (extra?: Partial<RehearsalRun>): RehearsalRun => ({
  v: 1,
  owner: "u1",
  size: "full",
  asStop: false,
  reps: [rep(1), rep(2), rep(3)],
  picks: [null, null, null],
  flagged: [],
  i: 0,
  spentMs: 0,
  limitMs: 90 * 60_000,
  startedAt: 1,
  done: null,
  ...extra,
});

let visibility: DocumentVisibilityState = "visible";
Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });

function setup(run = makeRun(), extra: Partial<Parameters<typeof RehearsalPlayer>[0]> = {}) {
  const onChange = vi.fn();
  const onFinish = vi.fn();
  const onLeave = vi.fn();
  render(
    <RehearsalPlayer
      run={run}
      examCode="SY0-701"
      onChange={onChange}
      onFinish={onFinish}
      onLeave={onLeave}
      {...extra}
    />
  );
  return { onChange, onFinish, onLeave, last: () => onChange.mock.calls.at(-1)?.[0] as RehearsalRun };
}

/** The question on screen: its heading, which is inside the player and can hold the focus. */
const question = (n: number) => screen.getByRole("heading", { name: `Question text ${n}` });

/** The button that opens the grid: it is named by the position it shows. */
const gridButton = (i: number, total = 3) =>
  screen.getByRole("button", { name: `${i} of ${total}, show all questions` });

beforeEach(() => {
  visibility = "visible";
});
afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("RehearsalPlayer", () => {
  it("takes an answer without saying whether it is right, and keeps it", () => {
    const { last } = setup();
    expect(question(1)).toBeInTheDocument();
    // The answers are one radio group, named by the question it belongs to.
    const group = screen.getByRole("radiogroup", { name: "Question text 1" });
    expect(within(group).getAllByRole("radio")).toHaveLength(4);
    fireEvent.click(screen.getByRole("radio", { name: /Wrong one/ }));
    expect(screen.getByRole("radio", { name: /Wrong one/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText(/Correct\.|Incorrect\.|Takeaway/)).toBeNull();
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
    expect(last().picks).toEqual([1, null, null]);
    // An answer can be changed, as on the exam.
    fireEvent.click(screen.getByRole("radio", { name: /Right answer/ }));
    expect(last().picks).toEqual([0, null, null]);
    expect(screen.getByRole("radio", { name: /Wrong one/ })).toHaveAttribute("aria-checked", "false");
  });

  it("moves on and back, and flags a question to come back to", () => {
    const { last } = setup();
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(question(2)).toBeInTheDocument();
    const flag = screen.getByRole("button", { name: "Flag for review" });
    expect(flag).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(flag);
    expect(last().flagged).toEqual([1]);
    // The control keeps its name and its width: only its pressed state changes.
    expect(screen.getByRole("button", { name: "Flag for review" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Flagged" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Back/ }));
    expect(question(1)).toBeInTheDocument();
  });

  it("keeps Back, the position and Next where they are from one question to the next", () => {
    setup();
    const back = screen.getByRole("button", { name: /^Back/ });
    const next = screen.getByRole("button", { name: /^Next/ });
    fireEvent.click(next);
    // The same buttons, not new ones: the row is not rebuilt with the question.
    expect(screen.getByRole("button", { name: /^Next/ })).toBe(next);
    expect(screen.getByRole("button", { name: /^Back/ })).toBe(back);
    expect(gridButton(2)).toBeInTheDocument();
  });

  it("puts the focus on each new question, and on the heading of the grid and of the finish panel", () => {
    setup();
    // It opens in answer to a press, so the first question is read at once.
    expect(question(1)).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(question(2)).toHaveFocus();
    fireEvent.click(gridButton(2));
    expect(screen.getByRole("heading", { name: "All questions" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: /Finish the practice exam/ }));
    expect(screen.getByRole("heading", { name: "3 questions are still unanswered." })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Answer the remaining questions" }));
    expect(question(1)).toHaveFocus();
  });

  it("shows every question in a grid and jumps to one", () => {
    setup(makeRun({ picks: [0, null, null], flagged: [2] }));
    fireEvent.click(gridButton(1));
    expect(screen.getByText("1 answered, 1 flagged and 2 not answered.")).toBeInTheDocument();
    // The question in hand is marked for a screen reader as well as for the eye.
    expect(screen.getByRole("button", { name: "Question 1: answered" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: "Question 2: not answered" })).not.toHaveAttribute("aria-current");
    // The key under the grid names every state the grid draws.
    for (const state of ["Answered", "Not answered", "Flagged", "Current question"]) {
      expect(screen.getByText(state)).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Question 3: not answered, flagged" }));
    expect(question(3)).toBeInTheDocument();
  });

  it("says how many are blank before scoring, and can send them back to answer them", () => {
    const { onFinish } = setup(makeRun({ picks: [0, null, null], i: 2 }));
    fireEvent.click(screen.getByRole("button", { name: /^Finish/ }));
    expect(screen.getByRole("heading", { name: "2 questions are still unanswered." })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Answer the remaining questions" }));
    expect(question(2)).toBeInTheDocument();

    fireEvent.click(gridButton(2));
    fireEvent.click(screen.getByRole("button", { name: /Finish the practice exam/ }));
    fireEvent.click(screen.getByRole("button", { name: /Finish and view my score/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].picks).toEqual([0, null, null]);
    expect(onFinish.mock.calls[0][1]).toBe(false);
  });

  it("answers, moves and flags from the keyboard while the focus is inside it", () => {
    const { last } = setup();
    fireEvent.keyDown(question(1), { key: "2" });
    expect(last().picks[0]).toBe(1);
    fireEvent.keyDown(question(1), { key: "ArrowRight" });
    expect(question(2)).toHaveFocus();
    fireEvent.keyDown(question(2), { key: "c" });
    expect(last().picks[1]).toBe(2);
    fireEvent.keyDown(question(2), { key: "f" });
    expect(last().flagged).toEqual([1]);
    fireEvent.keyDown(question(2), { key: "ArrowLeft" });
    expect(question(1)).toBeInTheDocument();
    // The keys are said in a sentence, in the player.
    expect(screen.getByText(/You can answer with the keys A to D and flag the question with the F key\./)).toBeInTheDocument();
  });

  it("does nothing with a key pressed while the focus is elsewhere on the page", () => {
    const { onChange } = setup();
    const outside = document.createElement("a");
    outside.href = "#";
    document.body.append(outside);
    outside.focus();
    for (const key of ["2", "c", "f", "ArrowRight"]) {
      fireEvent.keyDown(outside, { key });
      fireEvent.keyDown(document.body, { key });
      fireEvent.keyDown(document, { key });
    }
    expect(onChange).not.toHaveBeenCalled();
    expect(question(1)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Flag for review" })).toHaveAttribute("aria-pressed", "false");
    outside.remove();
  });

  it("does nothing with the keys where a page turns them off", () => {
    const { onChange } = setup(makeRun(), { keyboard: false });
    fireEvent.keyDown(question(1), { key: "2" });
    fireEvent.keyDown(question(1), { key: "ArrowRight" });
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/You can answer with the keys/)).toBeNull();
  });

  it("moves between the answers with the arrow keys while an answer has the focus, and keeps the question", async () => {
    const { last } = setup();
    const options = screen.getAllByRole("radio");
    options[0].focus();
    fireEvent.keyDown(options[0], { key: "ArrowDown" });
    await waitFor(() => expect(options[1]).toHaveFocus());
    // As in any radio group, the arrow chooses the answer it moves to.
    expect(last().picks).toEqual([1, null, null]);
    fireEvent.keyUp(options[1], { key: "ArrowDown" });

    // The right arrow belongs to the answers here too: it does not change the question.
    fireEvent.keyDown(options[1], { key: "ArrowRight" });
    await waitFor(() => expect(options[2]).toHaveFocus());
    fireEvent.keyUp(options[2], { key: "ArrowRight" });
    expect(last().picks).toEqual([2, null, null]);
    expect(question(1)).toBeInTheDocument();

    // A letter pressed on an answer chooses, and the focus follows the choice.
    fireEvent.keyDown(options[2], { key: "a" });
    expect(last().picks).toEqual([0, null, null]);
    expect(options[0]).toHaveFocus();
  });

  it("chooses the answer that has the focus with Enter, as with Space", () => {
    const { last } = setup();
    const option = screen.getByRole("radio", { name: /Wrong two/ });
    option.focus();
    fireEvent.keyDown(option, { key: "Enter" });
    expect(last().picks).toEqual([2, null, null]);
  });

  it("runs the clock only while it is on screen, and ends the practice exam at zero", () => {
    vi.useFakeTimers();
    const { onFinish, last } = setup(makeRun({ limitMs: 5_000 }));
    expect(screen.getByRole("timer")).toHaveTextContent("0:05");
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByRole("timer")).toHaveTextContent("0:03");

    // Away: the clock stops, and where it stopped is saved.
    visibility = "hidden";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("timer")).toHaveTextContent("0:03");
    expect(last().spentMs).toBe(2_000);

    visibility = "visible";
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(3_000);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][1]).toBe(true);
  });

  it("ends at once when it comes back with no time left", () => {
    const { onFinish } = setup(makeRun({ spentMs: 5_000, limitMs: 5_000 }));
    expect(onFinish).toHaveBeenCalledWith(expect.objectContaining({ spentMs: 5_000 }), true);
  });

  it("can be paused and left from the question itself, and says what that does", () => {
    const { onLeave } = setup();
    expect(screen.getByText(/The clock stops, and your answers are kept\./)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pause and leave" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("offers the way out on the grid and on the finish panel as well", () => {
    setup();
    fireEvent.click(gridButton(1));
    expect(screen.getByRole("button", { name: "Pause and leave" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Finish the practice exam/ }));
    expect(screen.getByRole("button", { name: "Pause and leave" })).toBeInTheDocument();
  });

  it("brings its top back into view when the question or the panel changes while it is scrolled away", () => {
    setup();
    const card = screen.getByRole("timer").closest(".glass") as HTMLElement;
    const scrollIntoView = vi.fn();
    card.scrollIntoView = scrollIntoView;
    let top = 120;
    card.getBoundingClientRect = () => ({ top }) as DOMRect;

    // In view: nothing moves.
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(scrollIntoView).not.toHaveBeenCalled();

    // Scrolled past its top (a long question, or the grid): each change brings it back.
    top = -300;
    fireEvent.click(screen.getByRole("button", { name: /^Next/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    fireEvent.click(gridButton(3));
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /Finish the practice exam/ }));
    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it("is called a practice exam, and goes by another name only where a page gives it one", () => {
    setup();
    expect(screen.getByText("SY0-701 practice exam")).toBeInTheDocument();
    cleanup();
    setup(makeRun(), { examCode: "SY0-801", label: "Practice test", noun: "practice test" });
    expect(screen.getByText("SY0-801 practice test")).toBeInTheDocument();
    fireEvent.click(gridButton(1));
    expect(screen.getByRole("button", { name: /Finish the practice test/ })).toBeInTheDocument();
  });

  it("names itself in the title of its screen where it is a screen of its own, and in a line under a page's own title elsewhere", () => {
    // On a public page the page's title stands above the exam: the line is a paragraph, and the question is the first heading.
    setup();
    expect(screen.getByText("SY0-701 practice exam").tagName).toBe("P");
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(question(1).tagName).toBe("H2");
    cleanup();

    // On the study path the exam is the whole screen: the line is its title, on every panel.
    setup(makeRun(), { titleAs: "h1" });
    const title = screen.getByRole("heading", { level: 1, name: "SY0-701 practice exam" });
    expect(title.className).toBe(screen.getByText("SY0-701 practice exam").className);
    expect(question(1).tagName).toBe("H2");
    fireEvent.click(gridButton(1));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 2, name: "All questions" })).toBeInTheDocument();
  });

  it("where the score needs an account, the last button only finishes the exam and the panel says why", () => {
    const { onFinish } = setup(makeRun({ picks: [0, 1, 2], i: 2 }), { scoreNeedsAccount: true });
    fireEvent.click(screen.getByRole("button", { name: /^Finish/ }));
    expect(screen.getByRole("heading", { name: "Every question is answered." })).toBeInTheDocument();
    expect(screen.getByText("Your score is shown once you have a free account.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /view my score/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Finish the exam/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });
});
