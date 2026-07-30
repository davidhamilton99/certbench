import { describe, expect, it } from "vitest";
import { gradeThreatHunt } from "@/core/pbq/grade-threat-hunt";
import type { ThreatHuntScenario } from "@/data/pbq/types";

const scenario: ThreatHuntScenario = {
  type: "threat-hunt",
  id: "test-hunt",
  title: "Test hunt",
  briefing: "b",
  domain_number: "4.0",
  domain_title: "Security Operations",
  logSource: "/var/log/auth.log",
  // 3 malicious, 5 benign
  lines: [
    { text: "m1", malicious: true },
    { text: "m2", malicious: true },
    { text: "m3", malicious: true },
    { text: "b1", malicious: false },
    { text: "b2", malicious: false },
    { text: "b3", malicious: false },
    { text: "b4", malicious: false },
    { text: "b5", malicious: false },
  ],
  question: "q",
  options: ["Brute force", "Phishing", "SQLi"],
  correctOption: 0,
  explanation: "e",
  estimatedMinutes: 4,
};

describe("gradeThreatHunt", () => {
  it("perfect hunt scores 100", () => {
    const r = gradeThreatHunt(scenario, {
      flagged: [0, 1, 2],
      attackChoice: 0,
    });
    expect(r.score).toBe(100);
    expect(r.correctItems).toBe(9); // 8 lines + attack id
    expect(r.feedback).toHaveLength(0);
  });

  it("flagging everything cannot beat 50% on flagging (blanket strategy)", () => {
    const r = gradeThreatHunt(scenario, {
      flagged: [0, 1, 2, 3, 4, 5, 6, 7],
      attackChoice: 0,
    });
    // recall 1, specificity 0 → flagScore 0.5; id correct → 0.5*0.7 + 0.3 = 0.65
    expect(r.score).toBe(65);
    // Five false alarms surfaced.
    expect(r.feedback.filter((f) => f.startsWith("False alarm")).length).toBe(5);
  });

  it("flagging nothing also lands at the 50% flagging floor", () => {
    const r = gradeThreatHunt(scenario, { flagged: [], attackChoice: 0 });
    // recall 0, specificity 1 → 0.5; + id 0.3 → 0.65
    expect(r.score).toBe(65);
    expect(r.feedback.filter((f) => f.startsWith("Missed evidence")).length).toBe(3);
  });

  it("perfect flagging but wrong attack loses only the id weight", () => {
    const r = gradeThreatHunt(scenario, {
      flagged: [0, 1, 2],
      attackChoice: 1,
    });
    expect(r.score).toBe(70); // flag 1.0 * 0.7, id 0
    expect(r.feedback.some((f) => f.includes("Attack identification"))).toBe(true);
  });

  it("no attack selected is treated as incorrect id", () => {
    const r = gradeThreatHunt(scenario, {
      flagged: [0, 1, 2],
      attackChoice: -1,
    });
    expect(r.score).toBe(70);
    expect(r.feedback.some((f) => f.includes("no attack selected"))).toBe(true);
  });

  it("partial discrimination scores between floor and ceiling", () => {
    // Catch 2 of 3 malicious, 1 false alarm → recall 2/3, specificity 4/5
    const r = gradeThreatHunt(scenario, {
      flagged: [0, 1, 3],
      attackChoice: 0,
    });
    const flagScore = (2 / 3 + 4 / 5) / 2; // ≈ 0.733
    const expected = Math.round((flagScore * 0.7 + 0.3) * 100); // ≈ 81
    expect(r.score).toBe(expected);
    expect(r.score).toBeGreaterThan(65);
    expect(r.score).toBeLessThan(100);
  });
});
