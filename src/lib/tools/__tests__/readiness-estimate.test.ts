import { describe, expect, it } from "vitest";
import {
  allocateSlots,
  estimateReadiness,
} from "../readiness-estimate";

describe("estimateReadiness", () => {
  it("weights domain accuracy by exam weight", () => {
    // Heavy domain (weight 30) 100%, light domain (weight 10) 0%:
    // (100*30 + 0*10) / 40 = 75.
    const r = estimateReadiness([
      { domainTitle: "Heavy", examWeight: 30, correct: true },
      { domainTitle: "Heavy", examWeight: 30, correct: true },
      { domainTitle: "Light", examWeight: 10, correct: false },
    ]);
    expect(r.score).toBe(75);
    expect(r.band).toBe("ready");
  });

  it("maps scores to bands at the 75/40 thresholds", () => {
    const all = (correct: boolean) => [
      { domainTitle: "D", examWeight: 100, correct },
    ];
    expect(estimateReadiness(all(true)).band).toBe("ready");
    expect(estimateReadiness(all(false)).band).toBe("start");
    const half = estimateReadiness([
      { domainTitle: "D", examWeight: 100, correct: true },
      { domainTitle: "D", examWeight: 100, correct: false },
    ]);
    expect(half.score).toBe(50);
    expect(half.band).toBe("close");
  });

  it("reports per-domain tallies", () => {
    const r = estimateReadiness([
      { domainTitle: "A", examWeight: 50, correct: true },
      { domainTitle: "A", examWeight: 50, correct: false },
      { domainTitle: "B", examWeight: 50, correct: true },
    ]);
    const a = r.domains.find((d) => d.domainTitle === "A")!;
    expect(a.correct).toBe(1);
    expect(a.total).toBe(2);
    expect(a.pct).toBe(50);
  });

  it("handles empty input", () => {
    expect(estimateReadiness([]).score).toBe(0);
  });
});

describe("allocateSlots", () => {
  it("gives every domain at least one slot and sums to total", () => {
    // Security+-shaped weights.
    const slots = allocateSlots([12, 22, 18, 28, 20], 10);
    expect(slots.reduce((a, b) => a + b, 0)).toBe(10);
    expect(Math.min(...slots)).toBeGreaterThanOrEqual(1);
    // Heaviest domain gets the most slots.
    expect(slots[3]).toBe(Math.max(...slots));
  });

  it("degrades gracefully when total < domain count", () => {
    expect(allocateSlots([50, 30, 20], 2)).toEqual([1, 1, 0]);
  });

  it("handles empty weights", () => {
    expect(allocateSlots([], 10)).toEqual([]);
  });
});
