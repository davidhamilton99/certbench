import { describe, expect, it } from "vitest";
import { CORE1_V15, v15Codes, v15ObjectiveOf } from "@/data/a-plus-v15";
import bankJson from "@/data/a-plus-v15/v14-bank.json";
import { CORE1_NEW_QUESTIONS, COVERAGE, EXTRA_COVERAGE, TOP_UP_COVERAGE } from "..";
import { questions as domain1 } from "../domain-1";
import { questions as domain2 } from "../domain-2";
import { questions as domain3 } from "../domain-3";
import { questions as domain4 } from "../domain-4";
import { questions as domain5 } from "../domain-5";

const all = CORE1_NEW_QUESTIONS;
const codes = v15Codes(CORE1_V15);
// JSON arrays type as string[][]; each row is an [id, old objective] pair.
const bank = (bankJson as unknown as Record<string, [string, string][]>)[CORE1_V15.oldSlug];
const topicId = (c: { objective: string; topic: string }) => `${c.objective} ${c.topic}`;

describe("new 220-1201 questions", () => {
  it("joins the five domain files, each holding only its own domain's objectives", () => {
    const domains = [domain1, domain2, domain3, domain4, domain5];
    expect(all).toEqual(domains.flat());
    domains.forEach((d, i) => {
      for (const q of d) expect(q.objective.startsWith(`${i + 1}.`), q.key).toBe(true);
    });
  });

  it("gives every question a unique key in the c1-<objective>-<slug>-<n> form", () => {
    expect(new Set(all.map((q) => q.key)).size).toBe(all.length);
    for (const q of all) {
      expect(/^c1-(\d\.\d)-[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.exec(q.key)?.[1], q.key).toBe(q.objective);
    }
  });

  it("tags every question with one of 220-1201's 27 objectives", () => {
    expect(codes).toHaveLength(27);
    for (const q of all) expect(codes, q.key).toContain(q.objective);
  });

  it("gives every question four distinct, non-empty options", () => {
    for (const q of all) {
      expect(q.options, q.key).toHaveLength(4);
      for (const o of q.options) expect(o.trim(), q.key).not.toBe("");
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.key).toBe(4);
    }
  });

  it("never offers all or none of the above", () => {
    for (const q of all) {
      for (const text of [q.question, ...q.options]) {
        expect(text, q.key).not.toMatch(/\b(all|none) of the above\b/i);
      }
    }
  });

  it("spreads the answers so each of A to D holds 18–32% of them", () => {
    const counts = [0, 0, 0, 0];
    for (const q of all) counts[q.answer]++;
    for (const n of counts) {
      expect(n / all.length).toBeGreaterThanOrEqual(0.18);
      expect(n / all.length).toBeLessThanOrEqual(0.32);
    }
  });

  it("practises every listed topic under its objective, and nothing unlisted", () => {
    const listed = [...COVERAGE, ...EXTRA_COVERAGE, ...TOP_UP_COVERAGE].map(topicId);
    expect(new Set(listed).size).toBe(listed.length);
    const practised = new Set(all.map(topicId));
    for (const topic of listed) expect(practised.has(topic), topic).toBe(true);
    for (const q of all) expect(listed, q.key).toContain(topicId(q));
  });

  it("brings every objective to the 12 active questions it needs, with the re-tagged bank", () => {
    const total = Object.fromEntries(codes.map((c) => [c, 0]));
    for (const [id, code] of bank) {
      const to = v15ObjectiveOf(CORE1_V15, id, code);
      if (to) total[to]++;
    }
    for (const q of all) total[q.objective]++;
    for (const [code, n] of Object.entries(total)) expect(n, code).toBeGreaterThanOrEqual(12);

    // The bank alone leaves 3.7 at 10 and 3.8 at 5.
    const added = (code: string) => all.filter((q) => q.objective === code).length;
    expect(added("3.7")).toBeGreaterThanOrEqual(2);
    expect(added("3.8")).toBeGreaterThanOrEqual(7);
  });

  it("explains every answer in at least 120 characters", () => {
    for (const q of all) expect(q.explanation.length, q.key).toBeGreaterThanOrEqual(120);
  });

  it("never repeats a stem", () => {
    const stems = all.map((q) => q.question.trim().toLowerCase().replace(/\s+/g, " "));
    expect(new Set(stems).size).toBe(stems.length);
  });
});
