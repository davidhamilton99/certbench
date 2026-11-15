import { describe, expect, it } from "vitest";
import { SY0_801_AI_QUESTIONS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import { SY0_801_MAP, carriedCounts, sy0801Codes } from "@/data/sy0-801";
import bankJson from "@/data/sy0-801/sy0-701-bank.json";
import { COVERAGE, SY0_801_NEW_QUESTIONS_D3_5 } from "..";
import { questions as domain3 } from "../domain-3";
import { questions as domain4 } from "../domain-4";
import { questions as domain5 } from "../domain-5";

const all = SY0_801_NEW_QUESTIONS_D3_5;
const codes = sy0801Codes();
// JSON arrays type as string[][]; each row is an [id, SY0-701 objective] pair.
const bank = (bankJson as unknown as Record<string, [string, string][]>)[SY0_801_MAP.sourceSlug];
const topicId = (c: { objective: string; topic: string }) => `${c.objective} ${c.topic}`;

/** The distinct words of four or more letters in a text, lowercased. */
const words = (text: string) => new Set(text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? []);
/** Share of two texts' words they have in common (Jaccard similarity). */
function overlap(a: string, b: string): number {
  const x = words(a);
  const y = words(b);
  const shared = [...x].filter((w) => y.has(w)).length;
  return shared / (x.size + y.size - shared);
}

describe("new SY0-801 questions for domains 3–5", () => {
  it("joins the three domain files, each holding only its own domain's objectives", () => {
    const domains = [domain3, domain4, domain5];
    expect(all).toEqual(domains.flat());
    domains.forEach((d, i) => {
      for (const q of d) expect(q.objective.startsWith(`${i + 3}.`), q.key).toBe(true);
    });
  });

  it("gives every question a unique key in the s8-<objective>-<slug>-<n> form", () => {
    expect(new Set(all.map((q) => q.key)).size).toBe(all.length);
    for (const q of all) {
      expect(/^s8-(\d\.\d)-[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.exec(q.key)?.[1], q.key).toBe(q.objective);
    }
  });

  it("tags every question with one of SY0-801's 27 objectives", () => {
    expect(codes).toHaveLength(27);
    for (const q of all) expect(codes, q.key).toContain(q.objective);
  });

  it("gives every question four distinct, non-empty options and an answer among them", () => {
    for (const q of all) {
      expect(q.options, q.key).toHaveLength(4);
      for (const o of q.options) expect(o.trim(), q.key).not.toBe("");
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.key).toBe(4);
      expect([0, 1, 2, 3], q.key).toContain(q.answer);
      expect([1, 2, 3], q.key).toContain(q.difficulty);
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

  it("doesn't give the answer away by making it the longest option", () => {
    // Someone who always picks the longest option should do little better than chance (25%).
    const longest = all.filter((q) => {
      const lengths = q.options.map((o) => o.length);
      return lengths[q.answer] > Math.max(...lengths.filter((_, i) => i !== q.answer));
    });
    expect(longest.length / all.length).toBeLessThanOrEqual(0.3);
  });

  it("practises every listed topic under its objective, and nothing unlisted", () => {
    const listed = COVERAGE.map(topicId);
    expect(new Set(listed).size).toBe(listed.length);
    for (const c of COVERAGE) expect(codes, c.topic).toContain(c.objective);
    const practised = new Set(all.map(topicId));
    for (const topic of listed) expect(practised.has(topic), topic).toBe(true);
    for (const q of all) expect(listed, q.key).toContain(topicId(q));
  });

  it("brings every domain 3–5 objective to at least 20 questions with the carried bank", () => {
    const carried = carriedCounts(bank);
    const added = (code: string) => all.filter((q) => q.objective === code).length;
    for (const code of codes.filter((c) => /^[345]\./.test(c))) {
      expect(carried[code] + added(code), code).toBeGreaterThanOrEqual(20);
    }
    // The carried bank alone leaves 4.3 and 4.4 at 12 and 5.1 at 16.
    expect([carried["4.3"], carried["4.4"], carried["5.1"]]).toEqual([12, 12, 16]);
  });

  it("explains every answer at length, and never names an option by its letter", () => {
    for (const q of all) {
      expect(q.explanation.length, q.key).toBeGreaterThanOrEqual(120);
      // The path shuffles options, so a letter would point at the wrong one.
      expect(q.explanation, q.key).not.toMatch(/\b(option|answer|choice) [A-D]\b|\b[A-D]\) /);
    }
  });

  it("never repeats a stem", () => {
    const stems = all.map((q) => q.question.trim().toLowerCase().replace(/\s+/g, " "));
    expect(new Set(stems).size).toBe(stems.length);
  });

  it("keeps clear of the 59 free SY0-801 questions, so a paid rehearsal never repeats one", () => {
    const free = [...SY0_801_PRACTICE_TEST, ...SY0_801_AI_QUESTIONS].map((q) => q.questionText);
    expect(free).toHaveLength(59);
    // Different questions on one topic share some words: the free questions overlap
    // each other by up to about 0.26. A reused scenario scores far higher.
    for (const q of all) {
      for (const text of free) expect(overlap(q.question, text), `${q.key} vs "${text.slice(0, 50)}"`).toBeLessThan(0.3);
    }
  });
});
