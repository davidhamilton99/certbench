import { describe, expect, it } from "vitest";
import { OBJECTIVE_TITLES } from "@/data/path/titles";
import { N10_009_BANK_COUNTS, N10_009_DOMAIN_WEIGHTS } from "../bank";
import { N10_009_LIVE_FIXES } from "../live-fixes";
import { N10_009_NEW_QUESTIONS } from "../new-questions";
import { questions as domain1 } from "../new-questions/domain-1";
import { questions as domain2 } from "../new-questions/domain-2";
import { questions as domain3 } from "../new-questions/domain-3";
import { questions as domain4 } from "../new-questions/domain-4";
import { questions as domain5 } from "../new-questions/domain-5";

const all = N10_009_NEW_QUESTIONS;
const DOMAINS = [domain1, domain2, domain3, domain4, domain5];
const topics = Object.keys(OBJECTIVE_TITLES["network-plus-n10-009"]);
const sum = (ns: number[]) => ns.reduce((s, n) => s + n, 0);

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

/** Share of the smaller set of trigrams that also appears in the other. */
function overlap(x: Set<string>, y: Set<string>): number {
  let shared = 0;
  for (const g of x) if (y.has(g)) shared++;
  return shared / Math.min(x.size, y.size);
}

/** Every piece of text a question shows, with where it is. */
const texts = (q: (typeof all)[number]) => [q.question, ...q.options, q.explanation];

describe("new Network+ N10-009 questions", () => {
  it("joins the five domain files, each holding only its own domain's topics", () => {
    expect(all).toEqual(DOMAINS.flat());
    DOMAINS.forEach((questions, i) => {
      expect(questions.length, `domain ${i + 1}`).toBeGreaterThan(0);
      for (const q of questions) expect(q.topic.startsWith(`${i + 1}.`), q.key).toBe(true);
    });
  });

  it("gives every question a unique key in the n9-<topic>-<slug>-<n> form", () => {
    expect(new Set(all.map((q) => q.key)).size).toBe(all.length);
    for (const q of all) {
      expect(/^n9-(\d\.\d)-[a-z0-9]+(?:-[a-z0-9]+)*-\d+$/.exec(q.key)?.[1], q.key).toBe(q.topic);
    }
  });

  it("files every question under one of the 27 Network+ topics, the ones the bank holds", () => {
    expect(topics).toHaveLength(27);
    expect(Object.keys(N10_009_BANK_COUNTS).sort()).toEqual([...topics].sort());
    for (const q of all) expect(topics, q.key).toContain(q.topic);
  });

  it("gives every question a subject, a difficulty and four distinct, non-empty options", () => {
    for (const q of all) {
      expect(q.subject.trim(), q.key).not.toBe("");
      expect([1, 2, 3], q.key).toContain(q.difficulty);
      expect(q.options, q.key).toHaveLength(4);
      for (const o of q.options) expect(o.trim(), q.key).not.toBe("");
      expect(new Set(q.options.map((o) => o.trim().toLowerCase())).size, q.key).toBe(4);
      expect([0, 1, 2, 3], q.key).toContain(q.answer);
    }
  });

  it("never offers all or none of the above", () => {
    for (const q of all) {
      for (const text of [q.question, ...q.options]) expect(text, q.key).not.toMatch(/\b(all|none) of the above\b/i);
    }
  });

  it("spreads the answers evenly: each position holds 22 to 28 percent of them, in every domain", () => {
    for (const [i, questions] of DOMAINS.entries()) {
      const counts = [0, 0, 0, 0];
      for (const q of questions) counts[q.answer]++;
      for (const n of counts) {
        expect(n / questions.length, `domain ${i + 1}: ${counts.join(", ")}`).toBeGreaterThanOrEqual(0.22);
        expect(n / questions.length, `domain ${i + 1}: ${counts.join(", ")}`).toBeLessThanOrEqual(0.28);
      }
    }
  });

  it("does not give answers away by length", () => {
    // The right answer is the single longest option about as often as chance
    // would make it, not most of the time.
    const longest = all.filter((q) => {
      const lengths = q.options.map((o) => o.length);
      const max = Math.max(...lengths);
      return lengths[q.answer] === max && lengths.filter((n) => n === max).length === 1;
    });
    expect(longest.length / all.length).toBeLessThanOrEqual(1 / 3);
  });

  it("explains every answer in at least 150 characters, never naming an option by letter or position", () => {
    for (const q of all) {
      expect(q.explanation.length, q.key).toBeGreaterThanOrEqual(150);
      // The study path shuffles options, so a letter would point at the wrong one.
      expect(q.explanation, q.key).not.toMatch(/\b(?:[Oo]ption|[Aa]nswer|[Cc]hoice)s? [A-D]\b|\b[A-D]\) /);
      expect(q.explanation, q.key).not.toMatch(/\b(?:first|second|third|fourth|last) (?:option|choice)\b/i);
    }
  });

  it("keeps the house style: no contraction, no British spelling and no dash between words", () => {
    const contraction =
      /\b(?:\w+n't|it's|that's|there's|what's|who's|let's|you're|we're|they're|you've|we've|they've|you'll|we'll|they'll|it'll|you'd|we'd|they'd|he's|she's|here's|where's|how's)\b/i;
    const british =
      /\b(?:colours?|behaviour|organis(?:e|ed|ation)|recognis(?:e|ed)|analys(?:e|ed)|centres?|licences?|defence|catalogue|programmes?|travelled|cancelled|modelling|labelled|fibres?|metres?|favour|utilis(?:e|ed)|prioritis(?:e|ed)|minimis(?:e|ed)|optimis(?:e|ed)|authoris(?:e|ed|ation)|customis(?:e|ed)|synchronis(?:e|ed)|virtualis(?:e|ed|ation)|judgement|grey|acknowledgement)\b/i;
    for (const q of all) {
      for (const text of texts(q)) {
        expect(text, q.key).not.toMatch(contraction);
        // "Fibre Channel" is the storage protocol's proper name, not British spelling.
        expect(text.replace(/\bFibre Channel\b/g, "FC"), q.key).not.toMatch(british);
        expect(text, q.key).not.toMatch(/[‒–—―]| - /);
      }
    }
  });

  it("never repeats a stem, and no two stems share half their wording", () => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    expect(new Set(all.map((q) => norm(q.question))).size).toBe(all.length);
    // Every pair is compared, so each stem's trigrams are worked out once.
    const grams = all.map((q) => trigrams(q.question));
    const close: string[] = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        if (overlap(grams[i], grams[j]) >= 0.5) close.push(`${all[i].key} vs ${all[j].key}`);
      }
    }
    expect(close).toEqual([]);
  });

  it("takes the bank past 1,000 questions, and adds to every topic", () => {
    expect(sum(Object.values(N10_009_BANK_COUNTS))).toBe(617);
    expect(617 + all.length).toBeGreaterThanOrEqual(1000);
    for (const t of topics) expect(all.filter((q) => q.topic === t).length, t).toBeGreaterThan(0);
  });

  it("writes the corrections to live questions in the same style, each changing what it says it changes", () => {
    expect(N10_009_LIVE_FIXES.length).toBeGreaterThan(0);
    expect(new Set(N10_009_LIVE_FIXES.map((f) => f.id)).size).toBe(N10_009_LIVE_FIXES.length);
    for (const f of N10_009_LIVE_FIXES) {
      expect(f.id, f.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(topics, f.id).toContain(f.topic);
      expect(f.why.length, f.id).toBeGreaterThan(40);
      expect(f.explanation, f.id).not.toBe(f.was.explanation);
      expect(f.explanation.length, f.id).toBeGreaterThanOrEqual(150);
      expect(f.explanation, f.id).not.toMatch(/\b(?:[Oo]ption|[Aa]nswer|[Cc]hoice)s? [A-D]\b|\b[A-D]\) /);
      if (f.options) {
        expect(new Set(f.options.map((o) => o.trim().toLowerCase())).size, f.id).toBe(4);
        expect([0, 1, 2, 3], f.id).toContain(f.answer);
      }
      for (const text of [f.question ?? "", ...(f.options ?? []), f.explanation]) {
        expect(text, f.id).not.toMatch(/[‒–—―]| - /);
        expect(text, f.id).not.toMatch(/\b(?:\w+n't|it's|that's|there's|they're|you're)\b/i);
      }
    }
  });

  it("leaves every domain within three points of its weight in CompTIA's exam", () => {
    const total = 617 + all.length;
    for (const [domain, weight] of Object.entries(N10_009_DOMAIN_WEIGHTS)) {
      const live = sum(Object.entries(N10_009_BANK_COUNTS).filter(([t]) => t.startsWith(`${domain}.`)).map(([, n]) => n));
      const added = all.filter((q) => q.topic.startsWith(`${domain}.`)).length;
      expect(Math.abs(((live + added) / total) * 100 - weight), `domain ${domain}`).toBeLessThanOrEqual(3);
    }
  });
});
