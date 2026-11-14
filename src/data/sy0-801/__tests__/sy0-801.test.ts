import { describe, expect, it } from "vitest";
import { domainLab } from "@/core/path/labs";
import { pbqRegistry } from "@/data/pbq";
import { SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import { SY0_801_MAP, carriedCounts, sy0801Codes, sy0801ObjectiveOf } from "..";
import bankJson from "../sy0-701-bank.json";

// JSON arrays type as string[][]; each row is an [id, SY0-701 objective] pair.
const bank = (bankJson as unknown as Record<string, [string, string][]>)[SY0_801_MAP.sourceSlug];
const ids = new Set(bank.map(([id]) => id));
const sourceCode = new Map(bank);
const codes = sy0801Codes();

describe("SY0-801's structure", () => {
  it("has CompTIA's five domains, weighted to 100%", () => {
    expect(SY0_801_MAP.domains.map((d) => d.weight)).toEqual([16, 24, 19, 27, 14]);
    for (const d of SY0_801_MAP.domains) {
      d.objectives.forEach((o, i) => expect(o.code).toBe(`${d.number.replace(/\.0$/, "")}.${i + 1}`));
    }
    expect(codes).toHaveLength(27);
  });

  it("is the public SY0-801 pages' list, which the free practice test is tagged to", () => {
    expect(codes).toEqual(SY0_801_DOMAINS.flatMap((d) => d.objectives.map((o) => o.code)));
    for (const q of SY0_801_PRACTICE_TEST) expect(codes).toContain(q.objective);
  });

  it("describes every objective in its own words, once", () => {
    const objectives = SY0_801_MAP.domains.flatMap((d) => d.objectives);
    const titles = objectives.map((o) => o.title);
    expect(new Set(titles).size).toBe(titles.length);
    for (const title of titles) {
      expect(title?.length ?? 0).toBeGreaterThan(20);
      // CompTIA's objectives open with these verbs; ours name the topic instead.
      expect(title).not.toMatch(/^(Explain|Describe|Summarize|Compare and contrast|Given a scenario)/);
    }
    expect(new Set(objectives.map((o) => o.label)).size).toBe(objectives.length);
  });
});

describe("the SY0-701 bank on SY0-801", () => {
  it("is the 842-question snapshot the map was decided from", () => {
    expect(bank).toHaveLength(842);
    expect(ids.size).toBe(842);
    for (const [id] of bank) expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("maps every SY0-701 objective, and only onto SY0-801 objectives", () => {
    expect(new Set(Object.keys(SY0_801_MAP.objectiveMap))).toEqual(new Set(bank.map(([, code]) => code)));
    for (const to of Object.values(SY0_801_MAP.objectiveMap)) expect(codes).toContain(to);
  });

  it("names only real questions, each decision once and with its reason", () => {
    for (const [id, o] of Object.entries(SY0_801_MAP.overrides)) {
      expect(ids.has(id), id).toBe(true);
      expect(codes).toContain(o.to);
      // An override that agrees with its objective's map would be noise.
      expect(o.to, id).not.toBe(SY0_801_MAP.objectiveMap[sourceCode.get(id) ?? ""]);
      expect(o.why.length).toBeGreaterThan(20);
      expect(id in SY0_801_MAP.retired).toBe(false);
    }
    for (const [id, why] of Object.entries(SY0_801_MAP.retired)) {
      expect(ids.has(id), id).toBe(true);
      expect(why.length).toBeGreaterThan(15);
    }
  });

  it("gives the copies SY0-801 wording that's complete and checkable", () => {
    for (const [id, fix] of Object.entries(SY0_801_MAP.fixes)) {
      expect(ids.has(id), id).toBe(true);
      expect(id in SY0_801_MAP.retired).toBe(false);
      expect(fix.why.length).toBeGreaterThan(20);
      expect(fix.explanation.length).toBeGreaterThan(120);
      if (fix.options) {
        expect(fix.answer, id).toBeDefined();
        expect(new Set(fix.options.map((o) => o.trim().toLowerCase())).size).toBe(4);
        // The SY0-701 terms the fixes exist to replace.
        for (const option of fix.options) expect(option).not.toMatch(/bloatware|removable device|unsecure network|script kidd/i);
      }
      // The path shuffles options, so an explanation never names one by letter.
      expect(fix.explanation).not.toMatch(/\b(option|answer|choice) [A-D]\b|\b[A-D]\) /);
    }
  });

  it("finds each question's SY0-801 objective, or none when it isn't copied", () => {
    for (const [id, code] of bank) {
      const to = sy0801ObjectiveOf(id, code);
      if (id in SY0_801_MAP.retired) expect(to).toBeNull();
      else expect(codes).toContain(to);
    }
  });

  it("carries 836 questions and leaves the gaps the new questions fill", () => {
    const counts = carriedCounts(bank);
    expect(counts).toEqual({
      "1.1": 39, "1.2": 21, "1.3": 34,
      "2.1": 6, "2.2": 37, "2.3": 23, "2.4": 39, "2.5": 89, "2.6": 0,
      "3.1": 32, "3.2": 38, "3.3": 40, "3.4": 44,
      "4.1": 72, "4.2": 26, "4.3": 12, "4.4": 12, "4.5": 36, "4.6": 20, "4.7": 25, "4.8": 23,
      "5.1": 16, "5.2": 35, "5.3": 28, "5.4": 35, "5.5": 31, "5.6": 23,
    });
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(836);
    expect(Object.keys(SY0_801_MAP.retired)).toHaveLength(6);
    // New questions bring these to 20 or more, and 2.6 to 30, before SY0-801 goes live.
    expect(codes.filter((c) => counts[c] < 20)).toEqual(["2.1", "2.6", "4.3", "4.4", "5.1"]);
  });
});

describe("SY0-801's labs", () => {
  const scenarios = pbqRegistry[SY0_801_MAP.sourceSlug] ?? [];
  const onSy0801 = scenarios.map((s) => ({ ...s, domain_number: SY0_801_MAP.labDomains[s.id] }));
  const domains = SY0_801_MAP.domains.map((d) => d.number);

  it("places every Security+ lab in an SY0-801 domain", () => {
    expect(new Set(Object.keys(SY0_801_MAP.labDomains))).toEqual(new Set(scenarios.map((s) => s.id)));
    for (const d of Object.values(SY0_801_MAP.labDomains)) expect(domains).toContain(d);
  });

  it("closes every domain with a lab of its own", () => {
    for (const [d, id] of Object.entries(SY0_801_MAP.closingLabs)) expect(SY0_801_MAP.labDomains[id]).toBe(d);
    const closing = Object.fromEntries(
      domains.map((d) => [d, SY0_801_MAP.closingLabs[d] ?? domainLab(onSy0801, d)?.id])
    );
    expect(closing).toEqual({
      "1.0": "certificate-lifecycle",
      "2.0": "sp-topo-wireless-security",
      "3.0": "sp-topo-network-segmentation",
      "4.0": "security-incident-log-analysis",
      "5.0": "risk-assessment-process",
    });
  });
});
