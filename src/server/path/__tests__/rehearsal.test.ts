import { describe, expect, it } from "vitest";
import { buildRehearsal } from "../rehearsal";
import { buildStop } from "../build-stop";
import type { BankQuestion, PathBank } from "../bank";
import { allocate } from "@/core/path/compose";
import { buildPlan } from "@/core/path/plan";
import { bankRepId, parseRepId } from "@/core/path/rep-id";
import type { PathStructure } from "@/core/path/types";

/** A bank of `perObjective` questions on each objective of a five-domain exam. */
function fakeBank(weights: number[], objectives: number[], perObjective = 10): PathBank {
  const structure: PathStructure = {
    certSlug: "security-plus-sy0-701",
    examName: "Security+",
    examCode: "SY0-701",
    domains: weights.map((weight, d) => ({
      number: `${d + 1}.0`,
      title: `Domain ${d + 1}`,
      weight,
      objectives: Array.from({ length: objectives[d] }, (_, o) => ({ code: `${d + 1}.${o + 1}`, title: "t" })),
    })),
  };
  const questions: BankQuestion[] = [];
  let n = 0;
  for (const d of structure.domains) {
    for (const o of d.objectives) {
      for (let i = 0; i < perObjective; i++) {
        questions.push({
          id: `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`,
          objective: o.code,
          domain: d.number,
          text: `Question ${n} on ${o.code}`,
          options: ["Alpha", "Beta", "Gamma", "Delta"],
          answer: i % 4,
          explanation: "Why it is. More detail.",
          words: 20,
          optionWords: 1,
        });
      }
    }
  }
  return { certId: "cert", structure, questions, byId: new Map(questions.map((q) => [q.id, q])) };
}

const weights = [12, 22, 18, 28, 20];
const bank = fakeBank(weights, [4, 5, 4, 9, 6]);
const domainOf = (id: string) => `${parseRepId(id)!.objective.split(".")[0]}.0`;
const count = (ids: string[], domain: string) => ids.filter((id) => domainOf(id) === domain).length;

describe("buildRehearsal", () => {
  it("draws the full length, every question once, all in the exam's wording", () => {
    const reps = buildRehearsal({ bank, size: "full", seen: [], seed: 1 });
    expect(reps).toHaveLength(90);
    expect(new Set(reps.map((r) => r.id)).size).toBe(90);
    for (const r of reps) {
      expect(parseRepId(r.id)?.source).toBe("q");
      expect(r.tier).toBe("exam");
      expect(r.answer).toBeGreaterThanOrEqual(0);
      expect(r.answer).toBeLessThan(r.options.length);
    }
    expect(buildRehearsal({ bank, size: "half", seen: [], seed: 1 })).toHaveLength(45);
  });

  it("gives each domain its exam weight's share, mixed together", () => {
    const ids = buildRehearsal({ bank, size: "full", seen: [], seed: 2 }).map((r) => r.id);
    const slots = allocate(weights, 90);
    bank.structure.domains.forEach((d, i) => expect(count(ids, d.number)).toBe(slots[i]));
    // Not served domain by domain.
    expect(ids.slice(0, 10).map(domainOf)).not.toEqual(Array(10).fill(ids.map(domainOf)[0]));
  });

  it("spreads a domain's share across its objectives", () => {
    const ids = buildRehearsal({ bank, size: "full", seen: [], seed: 3 }).map((r) => r.id);
    const domain4 = new Set(ids.filter((id) => domainOf(id) === "4.0").map((id) => parseRepId(id)!.objective));
    expect(domain4.size).toBe(9);
  });

  it("asks questions not seen yet before ones already answered", () => {
    // Every domain 2 question but three has been answered on the path.
    const d2 = bank.questions.filter((q) => q.domain === "2.0");
    const seen = d2.slice(3).map((q) => bankRepId(q.objective, q.id));
    const ids = buildRehearsal({ bank, size: "full", seen, seed: 4 }).map((r) => r.id);
    const fresh = d2.slice(0, 3).map((q) => bankRepId(q.objective, q.id));
    for (const id of fresh) expect(ids).toContain(id);
  });

  it("fills a domain too thin for its share from the rest of the exam", () => {
    const thin = fakeBank(weights, [4, 5, 4, 9, 6]);
    thin.questions = thin.questions.filter((q) => q.domain !== "4.0" || q.objective === "4.1");
    const ids = buildRehearsal({ bank: thin, size: "full", seen: [], seed: 5 }).map((r) => r.id);
    expect(ids).toHaveLength(90);
    expect(count(ids, "4.0")).toBe(10);
  });

  it("draws the same rehearsal from the same seed, and a new one from another", () => {
    const ids = (seed: number) => buildRehearsal({ bank, size: "half", seen: [], seed }).map((r) => r.id);
    expect(ids(7)).toEqual(ids(7));
    expect(ids(8)).not.toEqual(ids(7));
  });

  it("isn't built as a stop: it's drawn on its own, at the size picked", () => {
    const plan = buildPlan(bank.structure);
    const index = plan.stops.findIndex((s) => s.kind === "rehearsal");
    expect(buildStop({ bank, plan, index, seen: [], missed: [], seed: 1 })).toBeNull();
  });
});
