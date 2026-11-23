import { describe, expect, it } from "vitest";
import { gradeScenario } from "@/core/pbq/grade";
import { pbqRegistry } from "@/data/pbq";
import { incidentResponseProcess as lab } from "../incident-response-process";

describe("SY0-801's Incident Response Process lab", () => {
  it("is a well-formed ordering drill that grades its own answer as right", () => {
    expect(lab.items).toHaveLength(6);
    expect(new Set(lab.items).size).toBe(lab.items.length);
    expect([...lab.correct_order].sort((a, b) => a - b)).toEqual(lab.items.map((_, i) => i));
    expect(gradeScenario(lab, lab.correct_order).score).toBe(100);
    expect(gradeScenario(lab, [...lab.correct_order].reverse()).score).toBeLessThan(100);
  });

  it("orders SY0-801's activities, not SY0-701's NIST phase names", () => {
    const ordered = lab.correct_order.map((i) => lab.items[i]);
    expect(ordered).toEqual([
      "Preparation",
      "Identification",
      "Investigation",
      "Containment",
      "Eradication and recovery",
      "Post-incident activities",
    ]);
    expect(lab.items.join(" ")).not.toMatch(/detection and analysis|lessons learned/i);
  });

  it("leaves negotiation and notification out of the order and explains where they fit", () => {
    expect(lab.items.join(" ")).not.toMatch(/negotiation|notification/i);
    expect(lab.explanation).toMatch(/negotiation/i);
    expect(lab.explanation).toMatch(/notification/i);
  });

  it("takes the place of SY0-701's version on the SY0-801 study path, in domain 4.0", () => {
    const sy0801 = pbqRegistry["security-plus-sy0-801"] ?? [];
    expect(sy0801.filter((s) => s.id === lab.id)).toHaveLength(1);
    expect(sy0801.some((s) => s.id === "incident-response-steps")).toBe(false);
    expect((pbqRegistry["security-plus-sy0-701"] ?? []).some((s) => s.id === lab.id)).toBe(false);
    expect(lab.domain_number).toBe("4.0");
  });
});

describe("Security+ lab explanations", () => {
  // SY0-801 reuses every SY0-701 lab, so none may say which version it's for.
  it("never tie a lab to one exam version or its domain numbers", () => {
    for (const s of pbqRegistry["security-plus-sy0-701"] ?? []) {
      expect(JSON.stringify(s), s.id).not.toMatch(/SY0-\d{3}/);
    }
  });
});
