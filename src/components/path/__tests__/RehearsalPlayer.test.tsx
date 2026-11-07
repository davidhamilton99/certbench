// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
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

function setup(run = makeRun()) {
  const onChange = vi.fn();
  const onFinish = vi.fn();
  const onLeave = vi.fn();
  render(<RehearsalPlayer run={run} examCode="SY0-701" onChange={onChange} onFinish={onFinish} onLeave={onLeave} />);
  return { onChange, onFinish, onLeave, last: () => onChange.mock.calls.at(-1)?.[0] as RehearsalRun };
}

beforeEach(() => {
  visibility = "visible";
});
afterEach(() => {
  vi.useRealTimers();
});

describe("RehearsalPlayer", () => {
  it("takes an answer without saying whether it's right, and keeps it", () => {
    const { last } = setup();
    expect(screen.getByRole("heading", { name: "Question text 1" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Wrong one/ }));
    expect(screen.getByRole("radio", { name: /Wrong one/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByText(/Right\.|It's Right answer/)).toBeNull();
    expect(screen.getByText("1 of 3 answered")).toBeInTheDocument();
    expect(last().picks).toEqual([1, null, null]);
    // An answer can be changed, as on the exam.
    fireEvent.click(screen.getByRole("radio", { name: /Right answer/ }));
    expect(last().picks).toEqual([0, null, null]);
  });

  it("moves on and back, and flags a question to come back to", () => {
    const { last } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(screen.getByRole("heading", { name: "Question text 2" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Flag for review" }));
    expect(last().flagged).toEqual([1]);
    expect(screen.getByRole("button", { name: "Flagged" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /Back/ }));
    expect(screen.getByRole("heading", { name: "Question text 1" })).toBeInTheDocument();
  });

  it("shows every question in a grid and jumps to one", () => {
    setup(makeRun({ picks: [0, null, null], flagged: [2] }));
    fireEvent.click(screen.getByRole("button", { name: "All questions" }));
    expect(screen.getByText("1 answered · 1 flagged · 2 to go")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Question 1: answered, current" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Question 3: not answered, flagged" }));
    expect(screen.getByRole("heading", { name: "Question text 3" })).toBeInTheDocument();
  });

  it("says how many are blank before scoring, and can send them back to answer them", () => {
    const { onFinish } = setup(makeRun({ picks: [0, null, null], i: 2 }));
    fireEvent.click(screen.getByRole("button", { name: /Finish/ }));
    expect(screen.getByRole("heading", { name: "2 questions still unanswered" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Answer them" }));
    expect(screen.getByRole("heading", { name: "Question text 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "All questions" }));
    fireEvent.click(screen.getByRole("button", { name: /Finish the rehearsal/ }));
    fireEvent.click(screen.getByRole("button", { name: /See my score/ }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish.mock.calls[0][0].picks).toEqual([0, null, null]);
    expect(onFinish.mock.calls[0][1]).toBe(false);
  });

  it("answers, moves and flags from the keyboard", () => {
    const { last } = setup();
    fireEvent.keyDown(document, { key: "2" });
    expect(last().picks[0]).toBe(1);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.keyDown(document, { key: "c" });
    expect(last().picks[1]).toBe(2);
    fireEvent.keyDown(document, { key: "f" });
    expect(last().flagged).toEqual([1]);
  });

  it("runs the clock only while it's on screen, and ends the rehearsal at zero", () => {
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

  it("leaves for the map with the clock where it stopped", () => {
    const { onLeave } = setup();
    fireEvent.click(screen.getByRole("button", { name: "All questions" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave for now" }));
    expect(onLeave).toHaveBeenCalled();
  });
});
