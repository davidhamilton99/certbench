// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { SimDropdownField, SimFieldAnswer, SimulationScenario, SimZonePlacementField } from "@/data/pbq/types";
import { gradeSimulationScenario } from "@/core/pbq/grade-simulation";
import { pickOrder, sortOrder } from "@/core/pbq/sim-play";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { SimulationPlayer } from "../SimulationPlayer";
import { MOVE_ADVANCE_MS, STEP_ADVANCE_MS } from "../SimMoves";

const cause: SimDropdownField = {
  type: "dropdown",
  id: "cause",
  label: "Which part failed?",
  options: ["LCD panel", "Backlight", "GPU", "RAM"],
  correctIndex: 1,
};
const where: SimZonePlacementField = {
  type: "zone-placement",
  id: "where",
  label: "Sort each part by where it lives",
  items: ["LED strip", "GPU chip"],
  zones: ["Lid", "Motherboard"],
  correctZones: [0, 1],
};

const lab: SimulationScenario = {
  type: "simulation",
  id: "sim-test",
  title: "Dim Laptop Screen",
  briefing: "A user's laptop screen is dim. An external monitor works.",
  domain_number: "3.0",
  domain_title: "Hardware",
  estimatedMinutes: 5,
  explanation: "A torch test that shows the image means the backlight.",
  tasks: [
    {
      id: "t1",
      title: "Task 1 — Diagnose",
      instructions: "Read the tests.",
      evidence: [
        { label: "Test results", content: "Test 1: Brightness keys — No change\nTest 2: HDMI — no issues" },
        { label: "ping 10.0.0.1", content: "Reply from 10.0.0.1: time=1ms" },
      ],
      fields: [cause, { type: "text", id: "gw", label: "Gateway address", acceptedValues: ["10.0.0.1"] }],
      explanation: "Stage one: the panel shows an image, so it's the light behind it.",
    },
    {
      id: "t2",
      title: "Task 2 — Repair",
      instructions: "Plan it.",
      fields: [
        {
          type: "select-many",
          id: "steps",
          label: "Select ALL safe steps (Select all that apply)",
          options: ["Remove the battery", "Use WD-40 on the hinges", "Wear an ESD strap"],
          correctIndices: [0, 2],
        },
        where,
      ],
      explanation: "Stage two: power off, ground yourself, no solvents.",
    },
  ],
};

const status = () => screen.getByRole("status");
const tile = (name: string) => screen.getByRole("radio", { name: new RegExp(name) });
const button = (name: string | RegExp) => screen.getByRole("button", { name });

/** Say yes or no to whatever card is up, right or wrong as asked. */
function call(right: boolean) {
  const card = screen.getByText(/Remove the battery|Use WD-40 on the hinges|Wear an ESD strap/);
  const isYes = card.textContent !== "Use WD-40 on the hinges";
  fireEvent.click(button(new RegExp(`^${isYes === right ? "Yes" : "No"}`)));
}

/** Sort whatever item is up, into its bin or the other one. */
function sort(right: boolean) {
  const item = screen.getByText(/^(LED strip|GPU chip)$/);
  const home = item.textContent === "LED strip" ? "Lid" : "Motherboard";
  const other = home === "Lid" ? "Motherboard" : "Lid";
  fireEvent.click(button(new RegExp(right ? home : other)));
}

function playStageOne() {
  fireEvent.click(tile("Backlight"));
  fireEvent.click(button(/^Next/));
  fireEvent.change(screen.getByRole("textbox", { name: "Gateway address" }), { target: { value: "10.0.0.1" } });
  fireEvent.click(button("Check"));
  fireEvent.click(button(/^Next/));
}

// Right answers move on by themselves; fake time keeps that from racing the clicks.
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  track.mockClear();
});

describe("simulation labs, played", () => {
  it("opens on the first question as tiles, with the ticket and the evidence above it, and no form to submit", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    expect(screen.getByText(/A user's laptop screen is dim/)).toBeInTheDocument();
    expect(screen.getByText("Stage 1 of 2 · Diagnose")).toBeInTheDocument();
    expect(screen.getByText("Which part failed?")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(4);
    expect(screen.queryByText(/Submit All Answers/i)).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("marks a pick the moment it's tapped, and a miss waits with the answer", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    fireEvent.click(tile("GPU"));
    expect(status()).toHaveTextContent("It's Backlight.");
    expect(tile("Backlight")).toBeDisabled();
    fireEvent.click(button(/^Got it/));
    expect(screen.getByRole("textbox", { name: "Gateway address" })).toBeInTheDocument();
  });

  it("moves on by itself after a right answer", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    fireEvent.click(tile("Backlight"));
    expect(status()).toHaveTextContent("Right.");
    act(() => vi.advanceTimersByTime(MOVE_ADVANCE_MS));
    expect(screen.getByRole("textbox", { name: "Gateway address" })).toBeInTheDocument();
  });

  it("opens each clue in the console, marking the ones not opened yet", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    const tabs = within(screen.getByRole("tablist", { name: "Evidence" }));
    expect(tabs.getByRole("tab", { name: /Test results/ })).toHaveAttribute("aria-selected", "true");
    expect(tabs.getByRole("tab", { name: /ping 10\.0\.0\.1/ })).toHaveTextContent("not opened yet");
    expect(screen.getByText("No change")).toBeInTheDocument();
    fireEvent.click(tabs.getByRole("tab", { name: /ping 10\.0\.0\.1/ }));
    expect(screen.getByText("Reply from")).toBeInTheDocument();
    expect(tabs.getByRole("tab", { name: /ping 10\.0\.0\.1/ })).not.toHaveTextContent("not opened yet");
  });

  it("ends a stage on its score, with the explanation folded away, and tracks it", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    playStageOne();
    expect(screen.getByText("Stage 1 of 2 done")).toBeInTheDocument();
    expect(screen.getByText("All 2 right")).toBeInTheDocument();
    expect(screen.getByText("Why these are the answers").closest("details")).not.toHaveAttribute("open");
    expect(track).toHaveBeenCalledWith("sim_stage_cleared", {
      scenario_id: "sim-test",
      stage: 1,
      stages: 2,
      correct: 2,
      total: 2,
    });
    fireEvent.click(button(/^Next stage/));
    expect(screen.getByText("Stage 2 of 2 · Repair")).toBeInTheDocument();
    expect(screen.getByText("Safe steps")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("asks a pick-all one option at a time, yes or no, marking each call", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    playStageOne();
    fireEvent.click(button(/^Next stage/));
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    call(true);
    expect(status()).toHaveTextContent("Right.");
    act(() => vi.advanceTimersByTime(STEP_ADVANCE_MS));
    expect(screen.getByText("2 / 3")).toBeInTheDocument();
    call(false);
    expect(status()).toHaveTextContent(/That one's a (yes|no)\./);
    fireEvent.click(button(/^Got it/));
    call(true);
    expect(status()).toHaveTextContent("2 of 3 called right.");
  });

  it("sorts each item into a bin, then grades the lab once with the grader's own score", () => {
    const onGraded = vi.fn();
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} onGraded={onGraded} />);
    playStageOne();
    fireEvent.click(button(/^Next stage/));
    for (let i = 0; i < 3; i++) {
      call(true);
      fireEvent.click(button(/^Next/));
    }
    sort(true);
    fireEvent.click(button(/^Next/));
    sort(false);
    expect(status()).toHaveTextContent(/It goes in (Lid|Motherboard)\. 1 of 2 sorted right\./);
    fireEvent.click(button(/^Got it/));
    expect(screen.getByText("1 of 2 right")).toBeInTheDocument();
    const score = button(/^See my score/);
    fireEvent.click(score);
    fireEvent.click(score);

    // Graded once, by the grader, on exactly the answers given: the first item
    // up went in its bin, the second in the other one.
    expect(onGraded).toHaveBeenCalledTimes(1);
    const [firstUp, secondUp] = sortOrder(where);
    const placements = [-1, -1];
    placements[firstUp] = where.correctZones[firstUp];
    placements[secondUp] = 1 - where.correctZones[secondUp];
    const answers: Record<string, SimFieldAnswer> = {
      cause: { type: "dropdown", selectedIndex: 1 },
      gw: { type: "text", value: "10.0.0.1" },
      steps: { type: "select-many", selectedIndices: [0, 2] },
      where: { type: "zone-placement", placements },
    };
    expect(onGraded.mock.calls[0][0]).toEqual(gradeSimulationScenario(lab, answers).result);
    expect(onGraded.mock.calls[0][0]).toMatchObject({ score: 80, correctItems: 4, totalItems: 5 });
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Solved")).toBeInTheDocument();
    expect(screen.getByText("The one to look at again")).toBeInTheDocument();
  });

  it("plays from the keyboard: numbers pick, y and n call, numbers sort, Enter moves on", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    const key = (k: string) => fireEvent.keyDown(document, { key: k });
    // The tiles are shuffled; the backlight's number is wherever it landed.
    key(String(pickOrder(cause).indexOf(1) + 1));
    expect(status()).toHaveTextContent("Right.");
    act(() => vi.advanceTimersByTime(MOVE_ADVANCE_MS));
    fireEvent.change(screen.getByRole("textbox", { name: "Gateway address" }), { target: { value: "10.0.0.9" } });
    fireEvent.submit(screen.getByRole("textbox", { name: "Gateway address" }).closest("form")!);
    expect(status()).toHaveTextContent("It's 10.0.0.1.");
    key("Enter");
    expect(screen.getByText("1 of 2 right")).toBeInTheDocument();
    key("Enter");
    expect(screen.getByText("Safe steps")).toBeInTheDocument();
    for (let i = 0; i < 3; i++) {
      const card = screen.getByText(/Remove the battery|Use WD-40 on the hinges|Wear an ESD strap/);
      key(card.textContent === "Use WD-40 on the hinges" ? "n" : "y");
      act(() => vi.advanceTimersByTime(STEP_ADVANCE_MS));
    }
    act(() => vi.advanceTimersByTime(MOVE_ADVANCE_MS));
    for (let i = 0; i < 2; i++) {
      const item = screen.getByText(/^(LED strip|GPU chip)$/);
      key(item.textContent === "LED strip" ? "1" : "2");
      act(() => vi.advanceTimersByTime(STEP_ADVANCE_MS));
    }
    act(() => vi.advanceTimersByTime(MOVE_ADVANCE_MS));
    expect(screen.getByText("All 2 right")).toBeInTheDocument();
    key("Enter");
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("asks before leaving with answers given, and starts clean on Play again", () => {
    const onBack = vi.fn();
    render(<SimulationPlayer scenario={lab} onBack={onBack} backLabel="Pick another lab" />);
    fireEvent.click(tile("Backlight"));
    fireEvent.click(button("Pick another lab"));
    expect(screen.getByRole("dialog", { name: "Leave this lab?" })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(button("Stay"));

    fireEvent.click(button(/^Next/));
    fireEvent.change(screen.getByRole("textbox", { name: "Gateway address" }), { target: { value: "10.0.0.1" } });
    fireEvent.click(button("Check"));
    fireEvent.click(button(/^Next/));
    fireEvent.click(button(/^Next stage/));
    for (let i = 0; i < 3; i++) {
      call(true);
      fireEvent.click(button(/^Next/));
    }
    sort(true);
    fireEvent.click(button(/^Next/));
    sort(true);
    fireEvent.click(button(/^Next/));
    fireEvent.click(button(/^See my score/));
    expect(screen.getByText("100%")).toBeInTheDocument();
    expect(screen.queryByText(/to look at again/)).toBeNull();

    fireEvent.click(button(/Play again/));
    expect(screen.getByText("Which part failed?")).toBeInTheDocument();
    expect(screen.getAllByRole("radio").every((r) => !r.hasAttribute("disabled"))).toBe(true);
    fireEvent.click(button("Pick another lab"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
