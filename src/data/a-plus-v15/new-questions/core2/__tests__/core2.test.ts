import { describe, expect, it } from "vitest";
import { CORE2_V15, v15Codes, v15ObjectiveOf } from "@/data/a-plus-v15";
import bankJson from "@/data/a-plus-v15/v14-bank.json";
import { CORE2_NEW_QUESTIONS, COVERAGE } from "..";
import { questions as domain1 } from "../domain-1";
import { questions as domain2 } from "../domain-2";
import { questions as domain3 } from "../domain-3";
import { questions as domain4 } from "../domain-4";

// JSON arrays type as string[][]; each row is an [id, old objective] pair.
const bank = (bankJson as unknown as Record<string, [string, string][]>)[CORE2_V15.oldSlug];
const codes = v15Codes(CORE2_V15);
const questions = CORE2_NEW_QUESTIONS;

/**
 * New questions each objective needs at least: 1.11 and 4.10 are new and have
 * none, and the re-tagged 220-1102 bank leaves the others under the 12 active
 * questions a path stop needs (see a-plus-v15.test.ts).
 */
const MINIMUM_NEW: Record<string, number> = {
  "1.1": 5,
  "1.2": 1,
  "1.5": 1,
  "1.10": 4,
  "1.11": 12,
  "4.1": 4,
  "4.9": 1,
  "4.10": 12,
};

const perObjective = (list: { objective: string }[]) => {
  const out = Object.fromEntries(codes.map((c) => [c, 0]));
  for (const { objective } of list) out[objective]++;
  return out;
};

describe("new 220-1202 questions", () => {
  it("gives every question a unique key that names its objective", () => {
    const keys = questions.map((q) => q.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const q of questions) {
      expect(q.key).toMatch(/^c2-\d\.\d{1,2}-[a-z0-9-]+-\d+$/);
      expect(q.key.startsWith(`c2-${q.objective}-`), q.key).toBe(true);
    }
  });

  it("files each question under one of 220-1202's 36 objectives, in its domain's file", () => {
    expect(codes).toHaveLength(36);
    for (const q of questions) expect(codes, q.key).toContain(q.objective);
    [domain1, domain2, domain3, domain4].forEach((list, i) => {
      for (const q of list) expect(q.objective.split(".")[0], q.key).toBe(String(i + 1));
    });
    expect(questions).toHaveLength(domain1.length + domain2.length + domain3.length + domain4.length);
  });

  it("gives every question four distinct options, none of them 'all' or 'none of the above'", () => {
    for (const q of questions) {
      expect(q.options, q.key).toHaveLength(4);
      for (const o of q.options) expect(o.trim(), q.key).not.toBe("");
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.key).toBe(4);
      for (const text of [q.question, ...q.options]) expect(text, q.key).not.toMatch(/\b(all|none) of the above\b/i);
    }
  });

  it("spreads the answers across A to D, so position gives nothing away", () => {
    const counts = [0, 0, 0, 0];
    for (const q of questions) counts[q.answer]++;
    for (const n of counts) {
      expect(n / questions.length).toBeGreaterThanOrEqual(0.18);
      expect(n / questions.length).toBeLessThanOrEqual(0.32);
    }
  });

  it("explains every answer properly, and asks each question once", () => {
    for (const q of questions) expect(q.explanation.length, q.key).toBeGreaterThanOrEqual(120);
    const stems = questions.map((q) => q.question.trim().toLowerCase());
    expect(new Set(stems).size).toBe(stems.length);
  });
});

describe("what 220-1202 added", () => {
  const listed = COVERAGE.map((c) => `${c.objective} ${c.topic}`);
  const asked = new Set(questions.map((q) => `${q.objective} ${q.topic}`));

  it("lists each added topic once, under a 220-1202 objective", () => {
    expect(new Set(listed).size).toBe(listed.length);
    for (const c of COVERAGE) expect(codes).toContain(c.objective);
  });

  it("asks about every added topic, and only about those", () => {
    for (const topic of listed) expect(asked.has(topic), topic).toBe(true);
    for (const topic of asked) expect(listed, topic).toContain(topic);
  });

  it("writes the new questions each objective needs, including 12 for each new objective", () => {
    const counts = perObjective(questions);
    for (const [code, min] of Object.entries(MINIMUM_NEW)) expect(counts[code], code).toBeGreaterThanOrEqual(min);
  });

  it("brings every objective to 12 active questions once the old bank is re-tagged", () => {
    const active = perObjective(questions);
    for (const [id, oldCode] of bank) {
      const to = v15ObjectiveOf(CORE2_V15, id, oldCode);
      if (to) active[to]++;
    }
    for (const code of codes) expect(active[code], code).toBeGreaterThanOrEqual(12);
  });
});
