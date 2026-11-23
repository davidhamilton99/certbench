import { describe, expect, it } from "vitest";
import {
  SY0_701_OBJECTIVES_PER_DOMAIN,
  SY0_801_AI_QUESTIONS,
  SY0_801_AI_TOPICS,
  SY0_801_DOMAINS,
} from "../security-plus-v8";
import { SECURITY_PLUS_DOMAIN_CHANGES } from "@/lib/seo/exam-versions";

/** A dash between words: an em dash or a horizontal bar anywhere, or an en dash with a space on each side. */
const DASH = new RegExp(`[${String.fromCharCode(0x2014, 0x2015)}]|\\s${String.fromCharCode(0x2013)}\\s`);

describe("SY0-801 domains and objectives", () => {
  it("has five domains weighted as in the version comparison, adding up to the whole exam", () => {
    expect(SY0_801_DOMAINS.map((d) => d.weight)).toEqual(SECURITY_PLUS_DOMAIN_CHANGES.map((d) => d.sy0801));
    expect(SY0_801_DOMAINS.reduce((n, d) => n + d.weight, 0)).toBe(100);
  });

  it("lists 27 objectives, numbered in order within each domain, one of them new", () => {
    const all = SY0_801_DOMAINS.flatMap((d) => d.objectives);
    expect(all).toHaveLength(27);
    for (const d of SY0_801_DOMAINS) {
      const prefix = d.number.replace(/\.0$/, "");
      expect(d.objectives.map((o) => o.code)).toEqual(d.objectives.map((_, i) => `${prefix}.${i + 1}`));
    }
    expect(all.filter((o) => o.isNew).map((o) => o.code)).toEqual(["2.6"]);
    expect(new Set(all.map((o) => o.label)).size).toBe(all.length);
  });

  it("compares against SY0-701's 28", () => {
    expect(SY0_701_OBJECTIVES_PER_DOMAIN.reduce((a, b) => a + b, 0)).toBe(28);
  });
});

describe("the AI objective's practice questions", () => {
  const terms = SY0_801_AI_TOPICS.map((t) => t.term);

  it("explains each of 2.6's thirteen topics once", () => {
    expect(terms).toHaveLength(13);
    expect(new Set(terms).size).toBe(13);
    for (const t of SY0_801_AI_TOPICS) expect(t.gist.length).toBeGreaterThan(30);
  });

  it("defines each topic in one complete sentence that opens with the term", () => {
    // Two pages print the list as a glossary, so each line has to stand as a
    // definition when it is read, or quoted, without the heading above it.
    for (const { term, gist } of SY0_801_AI_TOPICS) {
      expect(gist.startsWith(`${term} `), term).toBe(true);
      expect(gist.slice(term.length), term).toMatch(/^ (?:is|are|concerns) /);
      // One sentence: a capital to open it, one full stop, and that at the end.
      expect(gist, term).toMatch(/^[A-Z][^.!?]*\.$/);
      expect(gist.split(/\s+/).length, term).toBeLessThanOrEqual(30);
      // House style: no dash between words, no contraction, no ampersand.
      expect(DASH.test(gist), term).toBe(false);
      expect(gist, term).not.toMatch(/&|\b\w+n't\b|\b(?:it|that|there)'s\b/);
    }
  });

  it("practices every topic at least once", () => {
    const practised = new Set(SY0_801_AI_QUESTIONS.map((q) => q.topic));
    for (const term of terms) expect(practised.has(term), term).toBe(true);
    for (const q of SY0_801_AI_QUESTIONS) expect(terms).toContain(q.topic);
  });

  it("gives every question four distinct options, one answer and an explanation", () => {
    for (const q of SY0_801_AI_QUESTIONS) {
      expect(q.options, q.questionText).toHaveLength(4);
      expect(new Set(q.options).size).toBe(4);
      expect(q.correctIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex).toBeLessThan(4);
      expect(q.explanation.length).toBeGreaterThan(60);
    }
    expect(new Set(SY0_801_AI_QUESTIONS.map((q) => q.questionText)).size).toBe(SY0_801_AI_QUESTIONS.length);
  });

  it("marks the topic it practices as the answer, when the options are topics", () => {
    for (const q of SY0_801_AI_QUESTIONS) {
      if (q.options.every((o) => terms.includes(o))) {
        expect(q.options[q.correctIndex], q.questionText).toBe(q.topic);
      }
    }
  });

  it("spreads the answers across A to D, so position gives nothing away", () => {
    const counts = [0, 0, 0, 0];
    for (const q of SY0_801_AI_QUESTIONS) counts[q.correctIndex]++;
    for (const n of counts) expect(n).toBeGreaterThanOrEqual(3);
  });
});
