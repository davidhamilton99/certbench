import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { domainLab } from "@/core/path/labs";
import { pbqClosingLabs, pbqRegistry } from "@/data/pbq";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { SY0_801_DOMAINS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import { SY0_801_MAP, carriedCounts, sy0801Codes, sy0801ObjectiveOf } from "..";
import { buildSy0801Migration, expectedCounts } from "../migration-sql";
import { SY0_801_NEW_QUESTIONS_D1_2 } from "../new-questions/d1-2";
import { SY0_801_NEW_QUESTIONS_D3_5 } from "../new-questions/d3-5";
import bankJson from "../sy0-701-bank.json";
import copiesJson from "../copies.json";

// JSON arrays type as string[][]; each row is an [id, SY0-701 objective] pair.
const bank = (bankJson as unknown as Record<string, [string, string][]>)[SY0_801_MAP.sourceSlug];
// SY0-701 question id → [its copy's id, the copy's SY0-801 objective].
const copies = copiesJson as unknown as Record<string, [string, string]>;
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
  const sy0701 = pbqRegistry[SY0_801_MAP.sourceSlug] ?? [];
  const sy0801 = pbqRegistry[SY0_801_MAP.slug] ?? [];
  const domains = SY0_801_MAP.domains.map((d) => d.number);
  const domainTitle = new Map(SY0_801_MAP.domains.map((d) => [d.number, d.title]));

  it("places every SY0-701 lab in an SY0-801 domain", () => {
    expect(new Set(Object.keys(SY0_801_MAP.labDomains))).toEqual(new Set(sy0701.map((s) => s.id)));
    for (const d of Object.values(SY0_801_MAP.labDomains)) expect(domains).toContain(d);
  });

  it("plays every SY0-701 lab, in its own version where SY0-801 has one, and the AI threat hunt", () => {
    const ids = sy0801.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of sy0701) {
      const own = SY0_801_MAP.replacedLabs[s.id];
      expect(ids).toContain(own ?? s.id);
      if (own) expect(ids).not.toContain(s.id);
    }
    expect(ids).toContain("sec801-hunt-ai-assistant");
    expect(ids).toHaveLength(sy0701.length + 1);
  });

  it("files each lab in its SY0-801 domain, under SY0-801's domain name", () => {
    for (const s of sy0801) {
      const expected = SY0_801_MAP.labDomains[s.id] ?? s.domain_number;
      expect(s.domain_number, s.id).toBe(expected);
      expect(s.domain_title, s.id).toBe(domainTitle.get(s.domain_number));
    }
  });

  it("closes every domain with the lab the map picks, or the most hands-on one", () => {
    for (const [d, id] of Object.entries(SY0_801_MAP.closingLabs)) {
      expect(sy0801.find((s) => s.id === id)?.domain_number, id).toBe(d);
    }
    const closing = Object.fromEntries(
      domains.map((d) => [d, domainLab(sy0801, d, pbqClosingLabs[SY0_801_MAP.slug]?.[d])?.id])
    );
    expect(closing).toEqual({
      "1.0": "certificate-lifecycle",
      "2.0": "sec801-hunt-ai-assistant",
      "3.0": "sp-topo-network-segmentation",
      "4.0": "security-incident-log-analysis",
      "5.0": "risk-assessment-process",
    });
  });
});

describe("SY0-801's objective labels", () => {
  it("are the path's short names, the same on every page", () => {
    const labels = Object.fromEntries(SY0_801_DOMAINS.flatMap((d) => d.objectives.map((o) => [o.code, o.label])));
    expect(labels).toEqual(OBJECTIVE_TITLES[SY0_801_MAP.slug]);
  });
});

describe("the copies migration 030 makes", () => {
  const ids = (list: string[]) => list.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id));
  const copyIds = Object.values(copies).map(([id]) => id);

  it("gives every copied question one fixed id and its SY0-801 objective", () => {
    const copied = bank.filter(([id]) => !(id in SY0_801_MAP.retired));
    expect(new Set(Object.keys(copies))).toEqual(new Set(copied.map(([id]) => id)));
    for (const [id, code] of copied) expect(copies[id][1], id).toBe(sy0801ObjectiveOf(id, code));
    expect(ids(copyIds)).toBe(true);
    expect(new Set(copyIds).size).toBe(copyIds.length);
    for (const id of copyIds) expect(sourceCode.has(id)).toBe(false);
  });
});

describe("migration 030", () => {
  const input = {
    map: SY0_801_MAP,
    bank,
    copies,
    newQuestions: [...SY0_801_NEW_QUESTIONS_D1_2, ...SY0_801_NEW_QUESTIONS_D3_5],
  };

  it("leaves every objective with 20 questions or more, and 2.6 with 30", () => {
    const counts = expectedCounts(input);
    expect(Object.keys(counts)).toEqual(codes);
    for (const [code, n] of Object.entries(counts)) expect(n, code).toBeGreaterThanOrEqual(code === "2.6" ? 30 : 20);
    expect(Object.values(counts).reduce((s, n) => s + n, 0)).toBe(836 + 172);
  });

  it("is committed as 030 exactly as the builder makes it", () => {
    const file = readFileSync(join(process.cwd(), "supabase/migrations/030_security_plus_sy0_801.sql"), "utf8");
    // Git may check the file out with Windows line endings.
    expect(file.replace(/\r\n/g, "\n")).toBe(buildSy0801Migration(input));
  });

  it("only adds rows, all in one transaction, and checks before it commits", () => {
    const sql = buildSy0801Migration(input);
    expect(sql.startsWith("-- Add Security+ SY0-801")).toBe(true);
    expect(sql).toMatch(/\nbegin;\n/);
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
    expect(sql).not.toMatch(/\b(delete from|drop table|truncate)\b/i);
    // Updates touch only the copies the fixes name, never an SY0-701 question.
    const updated = [...sql.matchAll(/update cert_questions set[\s\S]*?where id = '([0-9a-f-]+)';/g)].map((m) => m[1]);
    expect(updated.sort()).toEqual(Object.keys(SY0_801_MAP.fixes).map((id) => copies[id][0]).sort());
  });
});
