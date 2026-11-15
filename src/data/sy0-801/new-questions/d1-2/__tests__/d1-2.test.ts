import { describe, expect, it } from "vitest";
import { SY0_801_AI_QUESTIONS, SY0_801_AI_TOPICS } from "@/data/security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "@/data/security-plus-v8-practice-test";
import { SY0_801_MAP, carriedCounts, sy0801Codes } from "@/data/sy0-801";
import bankJson from "@/data/sy0-801/sy0-701-bank.json";
import { COVERAGE, SY0_801_NEW_QUESTIONS_D1_2 } from "..";
import { questions as domain1 } from "../domain-1";
import { questions as domain2 } from "../domain-2";

const all = SY0_801_NEW_QUESTIONS_D1_2;
const codes = sy0801Codes();
// JSON arrays type as string[][]; each row is an [id, SY0-701 objective] pair.
const bank = (bankJson as unknown as Record<string, [string, string][]>)[SY0_801_MAP.sourceSlug];
const topicId = (c: { objective: string; topic: string }) => `${c.objective} ${c.topic}`;
const onObjective = (code: string) => all.filter((q) => q.objective === code);

/** A stem's three-word runs, to compare how much wording two questions share. */
function trigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) out.add(words.slice(i, i + 3).join(" "));
  return out;
}

/** Share of the shorter stem's trigrams that also appear in the other stem. */
function overlap(a: string, b: string): number {
  const [x, y] = [trigrams(a), trigrams(b)];
  let shared = 0;
  for (const g of x) if (y.has(g)) shared++;
  return shared / Math.min(x.size, y.size);
}

describe("new SY0-801 questions for domains 1 and 2", () => {
  it("joins the two domain files, each holding only its own domain's objectives", () => {
    expect(all).toEqual([...domain1, ...domain2]);
    for (const q of domain1) expect(q.objective.startsWith("1."), q.key).toBe(true);
    for (const q of domain2) expect(q.objective.startsWith("2."), q.key).toBe(true);
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

  it("gives every question a difficulty and four distinct, non-empty options", () => {
    for (const q of all) {
      expect([1, 2, 3], q.key).toContain(q.difficulty);
      expect(q.options, q.key).toHaveLength(4);
      for (const o of q.options) expect(o.trim(), q.key).not.toBe("");
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.key).toBe(4);
      expect([0, 1, 2, 3], q.key).toContain(q.answer);
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

  it("doesn't give answers away by length", () => {
    // The right answer is the single longest option about as often as chance
    // would make it, not most of the time.
    const longest = all.filter((q) => {
      const lengths = q.options.map((o) => o.length);
      const max = Math.max(...lengths);
      return lengths[q.answer] === max && lengths.filter((n) => n === max).length === 1;
    });
    expect(longest.length / all.length).toBeLessThanOrEqual(1 / 3);
  });

  it("explains every answer in at least 120 characters, never naming an option by letter", () => {
    for (const q of all) {
      expect(q.explanation.length, q.key).toBeGreaterThanOrEqual(120);
      // The path shuffles options, so a letter would point at the wrong one.
      expect(q.explanation, q.key).not.toMatch(/\b(option|answer|choice) [A-D]\b|\b[A-D]\) /);
    }
  });

  it("practises every listed topic under its objective, and nothing unlisted", () => {
    const listed = COVERAGE.map(topicId);
    expect(new Set(listed).size).toBe(listed.length);
    const practised = new Set(all.map(topicId));
    for (const topic of listed) expect(practised.has(topic), topic).toBe(true);
    for (const q of all) expect(listed, q.key).toContain(topicId(q));
  });

  it("covers all 13 of 2.6's AI topics at least twice each, in 30 questions or more", () => {
    const listed = COVERAGE.filter((c) => c.objective === "2.6").map((c) => c.topic);
    expect(listed).toEqual(SY0_801_AI_TOPICS.map((t) => t.term.toLowerCase()));
    const ai = onObjective("2.6");
    expect(ai.length).toBeGreaterThanOrEqual(30);
    for (const topic of listed) expect(ai.filter((q) => q.topic === topic).length, topic).toBeGreaterThanOrEqual(2);
  });

  it("brings 2.1 and 2.6 to the bar SY0-801 has to clear, with the bank carried from SY0-701", () => {
    const carried = carriedCounts(bank);
    expect(carried["2.1"] + onObjective("2.1").length).toBeGreaterThanOrEqual(20);
    expect(carried["2.6"] + onObjective("2.6").length).toBeGreaterThanOrEqual(30);
  });

  it("never repeats a stem, its own or one of the 59 free SY0-801 questions'", () => {
    const own = all.map((q) => q.question);
    const free = [...SY0_801_PRACTICE_TEST, ...SY0_801_AI_QUESTIONS].map((q) => q.questionText);
    expect(free).toHaveLength(59);
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    expect(new Set([...own, ...free].map(norm)).size).toBe(own.length + free.length);
    // A paid rehearsal mustn't replay a free question in new words either: no
    // stem shares even a quarter of its wording with a free one, or half with another new one.
    all.forEach((q, i) => {
      for (const f of free) expect(overlap(q.question, f), `${q.key} vs a free question`).toBeLessThan(0.25);
      for (const other of all.slice(i + 1)) expect(overlap(q.question, other.question), `${q.key} vs ${other.key}`).toBeLessThan(0.5);
    });
  });
});
