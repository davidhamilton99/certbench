import { describe, expect, it } from "vitest";
import { halfOfExam, REHEARSAL_FORMATS } from "../rehearsal";
import type { ChoiceRep, PathDomain } from "../types";

const DOMAINS: PathDomain[] = [
  { number: "1.0", title: "Concepts", weight: 40, objectives: [{ code: "1.1", title: "One" }] },
  { number: "2.0", title: "Threats", weight: 60, objectives: [{ code: "2.1", title: "Two" }, { code: "2.2", title: "Three" }] },
];

function rep(i: number, objective: string): ChoiceRep {
  return {
    id: `r${i}`,
    type: "choice",
    label: "Exam style",
    tier: "exam",
    objective,
    prompt: `Question ${i}?`,
    options: ["A", "B", "C", "D"],
    answer: 0,
    takeaway: "",
  };
}

/** A full draw: 36 in domain 1 and 54 in domain 2, mixed. */
const FULL = Array.from({ length: 90 }, (_, i) => rep(i, i % 5 < 2 ? "1.1" : i % 2 ? "2.1" : "2.2"));

describe("halfOfExam", () => {
  it("cuts a half from a full draw in the exam's weights, in the draw's order", () => {
    const half = halfOfExam(FULL, DOMAINS);
    expect(half).toHaveLength(REHEARSAL_FORMATS.half.questions);
    expect(half.filter((r) => r.objective === "1.1")).toHaveLength(18);
    expect(half.filter((r) => r.objective !== "1.1")).toHaveLength(27);
    const order = half.map((r) => FULL.indexOf(r));
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(new Set(half.map((r) => r.id)).size).toBe(45);
  });

  it("fills from the rest when a domain is too thin for its share", () => {
    const thin = [...FULL.filter((r) => r.objective !== "1.1"), ...FULL.filter((r) => r.objective === "1.1").slice(0, 5)];
    const half = halfOfExam(thin, DOMAINS);
    expect(half).toHaveLength(45);
    expect(half.filter((r) => r.objective === "1.1")).toHaveLength(5);
  });

  it("returns a draw no longer than a half as it is", () => {
    expect(halfOfExam(FULL.slice(0, 30), DOMAINS)).toEqual(FULL.slice(0, 30));
  });
});
