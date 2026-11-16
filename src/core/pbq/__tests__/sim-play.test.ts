import { describe, expect, it } from "vitest";
import { pbqRegistry } from "@/data/pbq";
import type {
  SimDropdownField,
  SimField,
  SimFieldAnswer,
  SimTextInputField,
  SimulationScenario,
} from "@/data/pbq/types";
import { gradeField } from "@/core/pbq/grade-field";
import { gradeSimulationScenario } from "@/core/pbq/grade-simulation";
import {
  callOrder,
  callPrompt,
  fieldCredit,
  inputModeFor,
  isNumberSet,
  isShortSet,
  pickOrder,
  playableStages,
  sortOrder,
  stageTally,
  stageTitle,
} from "@/core/pbq/sim-play";

const sims = Object.values(pbqRegistry)
  .flat()
  .filter((s): s is SimulationScenario => s.type === "simulation");
const fields = sims.flatMap((s) => s.tasks.flatMap((t) => t.fields));
const picks = fields.filter((f): f is SimDropdownField => f.type === "dropdown");

const isPermutation = (order: number[], n: number) =>
  order.length === n && [...order].sort((a, b) => a - b).every((v, i) => v === i);

/** The answer a player who knows it all would give. */
function rightAnswer(f: SimField): SimFieldAnswer {
  switch (f.type) {
    case "dropdown":
      return { type: "dropdown", selectedIndex: f.correctIndex };
    case "text":
      return { type: "text", value: f.acceptedValues[0] };
    case "select-many":
      return { type: "select-many", selectedIndices: f.correctIndices };
    case "zone-placement":
      return { type: "zone-placement", placements: f.correctZones };
  }
}

describe("stage titles", () => {
  it("drop the exam's 'Task N —' prefix, since the stage track numbers them", () => {
    expect(stageTitle("Task 1 — Diagnose the Display Issue")).toBe("Diagnose the Display Issue");
    expect(stageTitle("Task 3 — Port Forwarding & Connectivity Verification")).toBe(
      "Port Forwarding & Connectivity Verification"
    );
    expect(stageTitle("Inbound Rules")).toBe("Inbound Rules");
  });

  it("leave every lab's tasks with a title", () => {
    for (const s of sims) for (const t of s.tasks) expect(stageTitle(t.title).length).toBeGreaterThan(3);
  });
});

describe("pick-all asks", () => {
  it("lose the 'Select ALL … (select all that apply)' wrapper, since each option gets a yes or no", () => {
    expect(
      callPrompt("Select ALL steps that are correct when replacing a laptop display assembly. (Select all that apply)")
    ).toBe("Steps that are correct when replacing a laptop display assembly");
    expect(callPrompt("Select ALL correct immediate remediation actions (choose all that apply):")).toBe(
      "Correct immediate remediation actions"
    );
    expect(callPrompt("Which of these apply?")).toBe("Which of these apply?");
  });

  it("read cleanly for every pick-all in the bank", () => {
    for (const f of fields) {
      if (f.type !== "select-many") continue;
      const ask = callPrompt(f.label);
      expect(ask, f.id).not.toMatch(/select all|choose all|all that apply|[:.]$/i);
      expect(ask[0], f.id).toBe(ask[0].toUpperCase());
    }
  });
});

describe("option order", () => {
  it("shuffles each pick the same way every time, never as written", () => {
    for (const f of picks) {
      const order = pickOrder(f);
      expect(isPermutation(order, f.options.length), f.id).toBe(true);
      expect(pickOrder(f), f.id).toEqual(order);
      if (!isNumberSet(f.options)) expect(order, f.id).not.toEqual(f.options.map((_, i) => i));
    }
  });

  it("keeps numbers in their written order", () => {
    const counts: SimDropdownField = {
      type: "dropdown",
      id: "count",
      label: "How many?",
      options: ["0", "1", "2", "3", "4"],
      correctIndex: 2,
    };
    expect(pickOrder(counts)).toEqual([0, 1, 2, 3, 4]);
    expect(isNumberSet(["255.255.255.192", "/26", "62"])).toBe(true);
    expect(isNumberSet(["WPA3", "WPA2"])).toBe(false);
  });

  it("spreads the answers out: as written, three in four sat second or third", () => {
    const shown = new Map<number, number>();
    const written = new Map<number, number>();
    for (const f of picks) {
      written.set(f.correctIndex, (written.get(f.correctIndex) ?? 0) + 1);
      const at = pickOrder(f).indexOf(f.correctIndex);
      shown.set(at, (shown.get(at) ?? 0) + 1);
    }
    const share = (m: Map<number, number>) => Math.max(...m.values()) / picks.length;
    expect(share(written)).toBeGreaterThan(0.4);
    expect(share(shown)).toBeLessThan(0.3);
  });

  it("calls and sorts every option and item exactly once", () => {
    for (const f of fields) {
      if (f.type === "select-many") expect(isPermutation(callOrder(f), f.options.length), f.id).toBe(true);
      if (f.type === "zone-placement") expect(isPermutation(sortOrder(f), f.items.length), f.id).toBe(true);
    }
  });

  it("sets short options two to a row", () => {
    expect(isShortSet(["Channel 1", "Channel 6", "Channel 11"])).toBe(true);
    expect(isShortSet(["The GPU is functioning correctly — the fault is isolated"])).toBe(false);
  });
});

describe("typed answers", () => {
  const typed = (value: string): SimTextInputField => ({ type: "text", id: "t", label: "x", acceptedValues: [value] });

  it("open a number pad for IDs and addresses, a keyboard for the rest", () => {
    expect(inputModeFor(typed("99"))).toBe("numeric");
    expect(inputModeFor(typed("192.168.10.64"))).toBe("decimal");
    expect(inputModeFor(typed("ip route 0.0.0.0 0.0.0.0 203.0.113.2"))).toBe("text");
    expect(inputModeFor(typed("v=spf1 mx -all"))).toBe("text");
  });
});

describe("marks", () => {
  it("are the grader's own credit for each field", () => {
    for (const f of fields) {
      const answer = rightAnswer(f);
      expect(fieldCredit(f, answer), f.id).toBe(gradeField(f, answer).score);
      expect(fieldCredit(f, answer), f.id).toBe(1);
    }
  });

  it("add up, stage by stage, to what the grader gives the whole lab", () => {
    for (const s of sims) {
      // Every other field right, the rest given a wrong or empty answer.
      const answers: Record<string, SimFieldAnswer> = {};
      const credit: Record<string, number> = {};
      s.tasks
        .flatMap((t) => t.fields)
        .forEach((f, i) => {
          const a: SimFieldAnswer =
            i % 2 === 0
              ? rightAnswer(f)
              : f.type === "dropdown"
                ? { type: "dropdown", selectedIndex: (f.correctIndex + 1) % f.options.length }
                : f.type === "text"
                  ? { type: "text", value: "nope" }
                  : f.type === "select-many"
                    ? { type: "select-many", selectedIndices: [] }
                    : { type: "zone-placement", placements: f.items.map(() => 0) };
          answers[f.id] = a;
          credit[f.id] = fieldCredit(f, a);
        });
      const graded = gradeSimulationScenario(s, answers);
      const stages = playableStages(s.tasks);
      const points = stages.reduce((n, t) => n + stageTally(t, credit).points, 0);
      const total = stages.reduce((n, t) => n + stageTally(t, credit).total, 0);
      expect(total, s.id).toBe(graded.result.totalItems);
      expect(Math.round(points), s.id).toBe(graded.result.correctItems);
      expect(Math.round((points / total) * 100), s.id).toBe(graded.result.score);
    }
  });

  it("count a stage's moves right, partly right and in all", () => {
    const lab = sims.find((s) => s.id === "aplus-core1-sim-laptop-display")!;
    const repair = lab.tasks[1];
    const credit = { [repair.fields[0].id]: 1, [repair.fields[1].id]: 5 / 6, [repair.fields[2].id]: 0 };
    expect(stageTally(repair, credit)).toMatchObject({ right: 1, partly: 1, moves: 3 });
  });
});
