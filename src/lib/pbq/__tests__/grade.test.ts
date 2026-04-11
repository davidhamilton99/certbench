import { describe, it, expect } from "vitest";
import { gradeScenario } from "../grade";
import type {
  OrderingScenario,
  MatchingScenario,
  CategorizationScenario,
} from "@/data/pbq/types";

describe("gradeScenario — ordering", () => {
  const scenario: OrderingScenario = {
    type: "ordering",
    id: "ordering-1",
    title: "Incident Response Steps",
    description: "Order the steps",
    domain_number: "4.0",
    domain_title: "Operations",
    items: ["Preparation", "Identification", "Containment", "Eradication", "Recovery"],
    correct_order: [0, 1, 2, 3, 4],
    explanation: "Standard IR process",
  };

  it("returns 100 for perfect ordering", () => {
    const result = gradeScenario(scenario, [0, 1, 2, 3, 4]);
    expect(result.score).toBe(100);
    expect(result.correctItems).toBe(5);
    expect(result.totalItems).toBe(5);
    expect(result.feedback).toHaveLength(0);
  });

  it("returns 0 when all positions are wrong", () => {
    const result = gradeScenario(scenario, [4, 3, 1, 0, 2]);
    expect(result.score).toBe(0);
    expect(result.correctItems).toBe(0);
    expect(result.feedback).toHaveLength(5);
  });

  it("gives partial credit for partially correct ordering", () => {
    // First 3 correct, last 2 swapped
    const result = gradeScenario(scenario, [0, 1, 2, 4, 3]);
    expect(result.score).toBe(60); // 3/5 = 60%
    expect(result.correctItems).toBe(3);
    expect(result.feedback).toHaveLength(2);
  });

  it("includes position feedback for incorrect items", () => {
    const result = gradeScenario(scenario, [1, 0, 2, 3, 4]);
    expect(result.feedback.length).toBeGreaterThan(0);
    expect(result.feedback[0]).toContain("Position 1");
  });
});

describe("gradeScenario — matching", () => {
  const scenario: MatchingScenario = {
    type: "matching",
    id: "matching-1",
    title: "Port Matching",
    description: "Match ports to services",
    domain_number: "3.0",
    domain_title: "Implementation",
    left: ["HTTP", "HTTPS", "SSH", "DNS"],
    right: ["80", "443", "22", "53"],
    correct_map: [0, 1, 2, 3],
    explanation: "Standard port assignments",
  };

  it("returns 100 for perfect matching", () => {
    const result = gradeScenario(scenario, [0, 1, 2, 3]);
    expect(result.score).toBe(100);
    expect(result.correctItems).toBe(4);
    expect(result.totalItems).toBe(4);
    expect(result.feedback).toHaveLength(0);
  });

  it("returns 0 when all matches are wrong", () => {
    const result = gradeScenario(scenario, [3, 2, 1, 0]);
    expect(result.score).toBe(0);
    expect(result.correctItems).toBe(0);
    expect(result.feedback).toHaveLength(4);
  });

  it("gives partial credit for partially correct matching", () => {
    // HTTP and HTTPS correct, SSH and DNS swapped
    const result = gradeScenario(scenario, [0, 1, 3, 2]);
    expect(result.score).toBe(50); // 2/4
    expect(result.correctItems).toBe(2);
  });

  it("handles unmatched items (-1)", () => {
    const result = gradeScenario(scenario, [0, -1, 2, 3]);
    expect(result.score).toBe(75); // 3/4
    expect(result.feedback).toHaveLength(1);
    expect(result.feedback[0]).toContain("(not matched)");
  });
});

describe("gradeScenario — categorization", () => {
  const scenario: CategorizationScenario = {
    type: "categorization",
    id: "cat-1",
    title: "Attack Classification",
    description: "Categorize each attack",
    domain_number: "1.0",
    domain_title: "Attacks",
    categories: ["Social Engineering", "Network", "Application"],
    items: [
      { text: "Phishing", category: 0 },
      { text: "DDoS", category: 1 },
      { text: "SQL Injection", category: 2 },
      { text: "Pretexting", category: 0 },
    ],
    explanation: "Standard attack categories",
  };

  it("returns 100 for perfect categorization", () => {
    const result = gradeScenario(scenario, [0, 1, 2, 0]);
    expect(result.score).toBe(100);
    expect(result.correctItems).toBe(4);
    expect(result.totalItems).toBe(4);
    expect(result.feedback).toHaveLength(0);
  });

  it("returns 0 when all categorizations are wrong", () => {
    const result = gradeScenario(scenario, [2, 0, 1, 1]);
    expect(result.score).toBe(0);
    expect(result.correctItems).toBe(0);
    expect(result.feedback).toHaveLength(4);
  });

  it("gives partial credit for partially correct categorization", () => {
    // Phishing and SQL Injection correct, others wrong
    const result = gradeScenario(scenario, [0, 0, 2, 1]);
    expect(result.score).toBe(50); // 2/4
    expect(result.correctItems).toBe(2);
  });

  it("handles unplaced items (-1)", () => {
    const result = gradeScenario(scenario, [0, 1, -1, 0]);
    expect(result.score).toBe(75); // 3/4
    expect(result.feedback).toHaveLength(1);
    expect(result.feedback[0]).toContain("(not placed)");
  });

  it("includes item names in feedback", () => {
    const result = gradeScenario(scenario, [1, 1, 2, 0]);
    // "Phishing" was placed in "Network" instead of "Social Engineering"
    expect(result.feedback[0]).toContain("Phishing");
    expect(result.feedback[0]).toContain("Social Engineering");
    expect(result.feedback[0]).toContain("Network");
  });
});
