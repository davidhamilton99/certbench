import { describe, expect, it } from "vitest";
import { gradeScenario } from "@/core/pbq/grade";
import { referenceRegistry } from "@/data/reference";
import { pbqRegistry } from "..";
import type { MatchingScenario } from "../types";

/**
 * Two hands-on labs ask a learner to match a cable to its speed and distance.
 * The same figures stand in the reference tables, so a lab that says something
 * else teaches a second, wrong answer for the same cable. Both labs once gave
 * multimode fiber "10 Gbps up to 550 m (OM4)": IEEE 802.3 specifies 10 Gb/s
 * over multimode fiber to 300 m on OM3, and 550 m is a 1 Gb/s distance. The
 * Network+ lab also gave Cat 6 "1 Gbps (up to 55 m)", against its own
 * explanation and both tables.
 */
const LABS: [cert: string, id: string][] = [
  ["a-plus-core1-220-1201", "aplus-core1-cable-speeds"],
  ["network-plus-n10-009", "cable-types-to-speeds"],
];

const labOf = (cert: string, id: string) => pbqRegistry[cert].find((s) => s.id === id) as MatchingScenario;

/** The answer a lab pairs with the cable whose name opens with these words. */
function answerFor(lab: MatchingScenario, cable: string): string {
  const at = lab.left.findIndex((name) => name.startsWith(cable));
  expect(at, `${lab.id}: ${cable}`).toBeGreaterThanOrEqual(0);
  return lab.right[lab.correct_map[at]];
}

/** A row of an exam's cable table, by the words its name opens with. */
function rowOf(cert: string, cable: string): Record<string, string> {
  const table = referenceRegistry[cert].find((t) => t.id === "cable-types")!;
  return table.entries.find((entry) => entry.columns.cable.startsWith(cable))!.columns;
}

describe("the cable labs and the reference tables", () => {
  it.each(LABS)("%s: the lab is a matching lab that still grades its own key as right", (cert, id) => {
    const lab = labOf(cert, id);
    expect(lab?.type).toBe("matching");
    expect(lab.right).toHaveLength(lab.left.length);
    expect(new Set(lab.right).size).toBe(lab.right.length);
    expect([...lab.correct_map].sort((a, b) => a - b)).toEqual(lab.left.map((_, i) => i));
    expect(gradeScenario(lab, lab.correct_map).score).toBe(100);
  });

  it.each(LABS)("%s: multimode fiber carries 10 Gbps to 300 m on OM3, as the A+ table says", (cert, id) => {
    // The A+ Core 1 table is the one that gives multimode fiber at 10 Gbps.
    const row = rowOf("a-plus-core1-220-1201", "Multimode fiber");
    expect(row.maxSpeed).toBe("10 Gbps");
    expect(row.maxDistance).toContain("300 m (OM3)");

    const answer = answerFor(labOf(cert, id), "Multimode fiber");
    expect(answer).toContain(row.maxSpeed);
    expect(answer).toContain("300 m");
    expect(answer).toContain("OM3");
  });

  it.each(LABS)("%s: no part of the lab gives a 550 m distance", (cert, id) => {
    const lab = labOf(cert, id);
    for (const text of [...lab.left, ...lab.right, lab.description, lab.explanation]) {
      expect(text, text).not.toMatch(/550/);
    }
  });

  it("gives Cat 6 its two distances the right way round in the Network+ lab", () => {
    const lab = labOf("network-plus-n10-009", "cable-types-to-speeds");
    // The table's cell and the lab's own explanation: 10 Gbps to 55 m, 1 Gbps to 100 m.
    expect(rowOf("network-plus-n10-009", "Cat 6").maxDistance).toBe("55 m (10G) / 100 m (1G)");
    expect(lab.explanation).toContain("Cat 6 supports 1 Gbps to 100 m and 10 Gbps to 55 m.");
    expect(answerFor(lab, "Cat 6")).toBe("1 Gbps (up to 100 m) / 10 Gbps (up to 55 m)");
  });
});
