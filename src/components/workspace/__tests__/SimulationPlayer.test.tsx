// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { SimDropdownField, SimFieldAnswer, SimulationScenario, SimZonePlacementField } from "@/data/pbq/types";
import { gradeSimulationScenario } from "@/core/pbq/grade-simulation";
import { pickOrder, sortOrder } from "@/core/pbq/sim-play";

const track = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics", () => ({ track }));

import { SimulationPlayer } from "../SimulationPlayer";

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
      explanation: "Stage one: the panel shows an image, so it is the light behind it.",
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

const button = (name: string | RegExp) => screen.getByRole("button", { name });
/** The button that moves a move on. Its description is the verdict on the answer just given. */
const onward = () => button("Continue");
/** The name of an answer once it is marked: what a screen reader is told, then the answer. */
const marked = (said: string, answer: string) => new RegExp(`^${said}:\\s*${answer}$`);
/** A move's answers: a group named by what is being asked. */
const answers = (name: string) => within(screen.getByRole("group", { name }));
const gateway = () => screen.getByRole("textbox", { name: "Gateway address" });
const score = () => screen.getByRole("group", { name: "Your score" });

/** Say yes or no to whatever card is up, correctly or not as asked. */
function call(right: boolean) {
  const card = screen.getByText(/^(Remove the battery|Use WD-40 on the hinges|Wear an ESD strap)$/);
  const isYes = card.textContent !== "Use WD-40 on the hinges";
  fireEvent.click(answers(card.textContent!).getByRole("button", { name: isYes === right ? "Yes" : "No" }));
}

/** Sort whatever item is up, into its bin or the other one. */
function sort(right: boolean) {
  const item = screen.getByText(/^(LED strip|GPU chip)$/);
  const home = item.textContent === "LED strip" ? "Lid" : "Motherboard";
  const other = home === "Lid" ? "Motherboard" : "Lid";
  fireEvent.click(answers(item.textContent!).getByRole("button", { name: right ? home : other }));
}

function playStageOne() {
  fireEvent.click(button("Backlight"));
  fireEvent.click(onward());
  fireEvent.change(gateway(), { target: { value: "10.0.0.1" } });
  fireEvent.click(button("Check answer"));
  fireEvent.click(onward());
}

afterEach(() => {
  vi.useRealTimers();
  track.mockClear();
});

describe("simulation labs, played", () => {
  it("opens on the first question as answers to press, with the ticket and the evidence above it, and no form to submit", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    expect(screen.getByText(/A user's laptop screen is dim/)).toBeInTheDocument();
    expect(screen.getByText("Stage 1 of 2: Diagnose")).toBeInTheDocument();
    expect(screen.getByText("0 of 4 answered")).toBeInTheDocument();
    expect(answers("Which part failed?").getAllByRole("button")).toHaveLength(4);
    expect(screen.queryByText(/Submit All Answers/i)).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();
    // A lab that is on the page as it loads does not take the focus from the page.
    expect(document.body).toHaveFocus();
  });

  it("marks an answer the moment it is pressed, in words as well as colour, and waits with the correct answer", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    fireEvent.click(button("GPU"));
    expect(onward()).toHaveAccessibleDescription("Incorrect. The correct answer is Backlight.");
    expect(onward()).toHaveFocus();
    expect(button(marked("Your answer, which is incorrect", "GPU"))).toBeDisabled();
    expect(button(marked("Correct answer", "Backlight"))).toBeDisabled();
    expect(screen.getByText("1 of 4 answered")).toBeInTheDocument();
    fireEvent.click(onward());
    expect(gateway()).toBeInTheDocument();
    // The move that follows takes the focus on what it asks, so that it is read.
    expect(screen.getByText("Gateway address")).toHaveFocus();
  });

  it("waits for Continue after a correct answer as well: nothing moves on by itself", () => {
    vi.useFakeTimers();
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    fireEvent.click(button("Backlight"));
    expect(onward()).toHaveAccessibleDescription("Correct.");
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(button(marked("Your answer, which is correct", "Backlight"))).toBeDisabled();
    expect(onward()).toHaveFocus();
    fireEvent.click(onward());
    expect(gateway()).toBeInTheDocument();
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

  it("draws the console as dark paper in both themes, in the theme's own ink and marks", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    const frame = screen.getByRole("tablist", { name: "Evidence" }).closest(".dark");
    expect(frame).not.toBeNull();
    // Nothing inside names a colour of its own: no fixed hex, no white, no palette colour.
    const classes = [frame!, ...frame!.querySelectorAll("*")].map((el) => el.getAttribute("class") ?? "").join(" ");
    expect(classes).not.toMatch(/#|\b(?:text|bg|border|fill|stroke|ring)-(?:white|black|amber|emerald|sky|rose|slate|zinc|gray)\b/);
    // A failure reported in the evidence is the theme's red mark.
    expect(screen.getByText("No change")).toHaveClass("text-destructive");
  });

  it("ends a stage on its score in a sentence, with the explanation folded away, and tracks it", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    playStageOne();
    expect(screen.getByText("Stage 1 of 2 complete")).toBeInTheDocument();
    expect(screen.getByText("You answered all 2 questions correctly.")).toBeInTheDocument();
    expect(screen.getByText("Why these answers are correct").closest("details")).not.toHaveAttribute("open");
    expect(track).toHaveBeenCalledWith("sim_stage_cleared", {
      scenario_id: "sim-test",
      stage: 1,
      stages: 2,
      correct: 2,
      total: 2,
    });
    // The way on has the focus, and the stage's score is read with it.
    expect(button(/^Next stage/)).toHaveFocus();
    expect(button(/^Next stage/)).toHaveAccessibleDescription(
      /Stage 1 of 2 complete\s*You answered all 2 questions correctly\./
    );
    fireEvent.click(button(/^Next stage/));
    expect(screen.getByText("Stage 2 of 2: Repair")).toBeInTheDocument();
    expect(screen.getByText("Safe steps")).toBeInTheDocument();
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("asks a pick-all one option at a time, yes or no, marking each answer", () => {
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    playStageOne();
    fireEvent.click(button(/^Next stage/));
    expect(screen.getByText("Item 1 of 3")).toBeInTheDocument();
    call(true);
    expect(onward()).toHaveAccessibleDescription("Correct.");
    fireEvent.click(onward());
    expect(screen.getByText("Item 2 of 3")).toBeInTheDocument();
    call(false);
    expect(onward()).toHaveAccessibleDescription(/^Incorrect\. The correct answer is (Yes|No)\.$/);
    fireEvent.click(onward());
    call(true);
    expect(onward()).toHaveAccessibleDescription("Correct. 2 of 3 answered correctly.");
  });

  it("sorts each item into a bin, then grades the lab once with the grader's own score", () => {
    const onGraded = vi.fn();
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} onGraded={onGraded} />);
    playStageOne();
    fireEvent.click(button(/^Next stage/));
    for (let i = 0; i < 3; i++) {
      call(true);
      fireEvent.click(onward());
    }
    sort(true);
    fireEvent.click(onward());
    sort(false);
    expect(onward()).toHaveAccessibleDescription(
      /^Incorrect\. The correct answer is (Lid|Motherboard)\. 1 of 2 sorted correctly\.$/
    );
    fireEvent.click(onward());
    expect(
      screen.getByText("You answered 1 of 2 questions correctly. One other answer earned partial credit.")
    ).toBeInTheDocument();
    const toScore = button(/^View my score/);
    fireEvent.click(toScore);
    fireEvent.click(toScore);

    // Graded once, by the grader, on exactly the answers given: the first item
    // up went in its bin, the second in the other one.
    expect(onGraded).toHaveBeenCalledTimes(1);
    const [firstUp, secondUp] = sortOrder(where);
    const placements = [-1, -1];
    placements[firstUp] = where.correctZones[firstUp];
    placements[secondUp] = 1 - where.correctZones[secondUp];
    const given: Record<string, SimFieldAnswer> = {
      cause: { type: "dropdown", selectedIndex: 1 },
      gw: { type: "text", value: "10.0.0.1" },
      steps: { type: "select-many", selectedIndices: [0, 2] },
      where: { type: "zone-placement", placements },
    };
    expect(onGraded.mock.calls[0][0]).toEqual(gradeSimulationScenario(lab, given).result);
    expect(onGraded.mock.calls[0][0]).toMatchObject({ score: 80, correctItems: 4, totalItems: 5 });
    // The score is the figure, its verdict in words and a bar: no ring, and no sweep from empty.
    expect(score()).toHaveFocus();
    expect(score()).toHaveTextContent("80%");
    expect(score()).toHaveTextContent("Solved");
    expect(score()).toHaveTextContent("You earned 4 of 5 points, including partial credit.");
    expect(score().querySelector("svg circle")).toBeNull();
    expect(score().querySelector(".animate-gauge, .animate-bar")).toBeNull();
    expect(screen.getByText("The answer to review")).toBeInTheDocument();
  });

  it("plays from the keyboard, and only while the focus is inside the lab", async () => {
    const user = userEvent.setup();
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} />);
    // The answers are shuffled; the backlight's number is wherever it landed.
    const digit = String(pickOrder(cause).indexOf(1) + 1);

    // With the focus elsewhere on the page, a number key is not an answer.
    await user.keyboard(digit);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
    button("Return to the scenarios").focus();
    await user.keyboard(digit);
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();

    // With the focus on one of the answers, it is.
    answers("Which part failed?").getAllByRole("button")[0].focus();
    await user.keyboard(digit);
    expect(onward()).toHaveAccessibleDescription("Correct.");
    // Continue has the focus, so Enter moves on.
    await user.keyboard("{Enter}");

    fireEvent.change(gateway(), { target: { value: "10.0.0.9" } });
    fireEvent.submit(gateway().closest("form")!);
    expect(onward()).toHaveAccessibleDescription("Incorrect. The correct answer is 10.0.0.1.");
    // Enter also moves on from the question itself (a press on the move puts the focus there).
    screen.getByText("Gateway address").focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("You answered 1 of 2 questions correctly.")).toBeInTheDocument();
    await user.keyboard("{Enter}");

    // Each move that follows takes the focus, so the keys carry on with no click.
    expect(screen.getByText("Safe steps")).toHaveFocus();
    for (let i = 0; i < 3; i++) {
      const card = screen.getByText(/^(Remove the battery|Use WD-40 on the hinges|Wear an ESD strap)$/);
      await user.keyboard(card.textContent === "Use WD-40 on the hinges" ? "n" : "y");
      expect(onward()).toHaveAccessibleDescription(/^Correct\./);
      await user.keyboard("{Enter}");
    }
    for (let i = 0; i < 2; i++) {
      const item = screen.getByText(/^(LED strip|GPU chip)$/);
      await user.keyboard(item.textContent === "LED strip" ? "1" : "2");
      expect(onward()).toHaveAccessibleDescription(/^Correct\./);
      await user.keyboard("{Enter}");
    }
    expect(screen.getByText("You answered all 2 questions correctly.")).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(score()).toHaveTextContent("80%");
  });

  it("tells the host once that play has started, at the first answer and not before", () => {
    const onStarted = vi.fn();
    render(<SimulationPlayer scenario={lab} onBack={vi.fn()} onStarted={onStarted} />);
    // Reading the evidence is not a move.
    fireEvent.click(screen.getByRole("tab", { name: /ping 10\.0\.0\.1/ }));
    expect(onStarted).not.toHaveBeenCalled();
    fireEvent.click(button("GPU"));
    expect(onStarted).toHaveBeenCalledTimes(1);
    fireEvent.click(onward());
    fireEvent.change(gateway(), { target: { value: "10.0.0.1" } });
    fireEvent.click(button("Check answer"));
    expect(onStarted).toHaveBeenCalledTimes(1);
  });

  it("asks before leaving with answers given, and starts clean when the lab is repeated", () => {
    const onBack = vi.fn();
    render(<SimulationPlayer scenario={lab} onBack={onBack} backLabel="Choose another lab" />);
    fireEvent.click(button("Backlight"));
    fireEvent.click(button("Choose another lab"));
    expect(screen.getByRole("dialog", { name: "Do you want to leave this lab?" })).toBeInTheDocument();
    expect(onBack).not.toHaveBeenCalled();
    fireEvent.click(button("Stay in the lab"));

    fireEvent.click(onward());
    fireEvent.change(gateway(), { target: { value: "10.0.0.1" } });
    fireEvent.click(button("Check answer"));
    fireEvent.click(onward());
    fireEvent.click(button(/^Next stage/));
    for (let i = 0; i < 3; i++) {
      call(true);
      fireEvent.click(onward());
    }
    sort(true);
    fireEvent.click(onward());
    sort(true);
    fireEvent.click(onward());
    fireEvent.click(button(/^View my score/));
    expect(score()).toHaveTextContent("100%");
    expect(screen.queryByText(/to review/)).toBeNull();

    fireEvent.click(button(/Repeat the lab/));
    expect(screen.getByText("Which part failed?")).toHaveFocus();
    expect(
      answers("Which part failed?")
        .getAllByRole("button")
        .every((b) => !b.hasAttribute("disabled"))
    ).toBe(true);
    fireEvent.click(button("Choose another lab"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
