import { describe, expect, it } from "vitest";
import { SY0_801_AI_QUESTIONS, SY0_801_DOMAINS } from "../security-plus-v8";
import { SY0_801_PRACTICE_TEST } from "../security-plus-v8-practice-test";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { mentionsOptionLetter, splitExplanation } from "@/core/path/text";

const domainOf = (objective: string) => `${objective.split(".")[0]}.0`;

describe("the SY0-801 practice test", () => {
  it("is half the real exam's length, the size its player times it at", () => {
    expect(SY0_801_PRACTICE_TEST).toHaveLength(REHEARSAL_FORMATS.half.questions);
  });

  it("splits its questions across the domains by the exam's weights", () => {
    const total = SY0_801_PRACTICE_TEST.length;
    for (const d of SY0_801_DOMAINS) {
      const count = SY0_801_PRACTICE_TEST.filter((q) => domainOf(q.objective) === d.number).length;
      // The nearest whole number of questions to the domain's share.
      expect(Math.abs(count - (d.weight / 100) * total), d.title).toBeLessThan(1);
    }
  });

  it("has at least one question on every objective, and none on an objective SY0-801 doesn't have", () => {
    const codes = SY0_801_DOMAINS.flatMap((d) => d.objectives.map((o) => o.code));
    const asked = new Set(SY0_801_PRACTICE_TEST.map((q) => q.objective));
    for (const code of codes) expect(asked.has(code), code).toBe(true);
    for (const q of SY0_801_PRACTICE_TEST) expect(codes, q.id).toContain(q.objective);
  });

  it("lists its questions in objective order, as the page shows them", () => {
    const codes = SY0_801_DOMAINS.flatMap((d) => d.objectives.map((o) => o.code));
    const positions = SY0_801_PRACTICE_TEST.map((q) => codes.indexOf(q.objective));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("gives every question four distinct options, one answer and an explanation", () => {
    for (const q of SY0_801_PRACTICE_TEST) {
      expect(q.options, q.id).toHaveLength(4);
      expect(new Set(q.options).size, q.id).toBe(4);
      expect(Number.isInteger(q.correctIndex), q.id).toBe(true);
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThan(4);
      expect(q.explanation.length, q.id).toBeGreaterThan(60);
      expect(q.questionText.trim().endsWith("?"), q.id).toBe(true);
    }
  });

  it("has ids and wording of its own, repeating none of the AI page's questions", () => {
    expect(new Set(SY0_801_PRACTICE_TEST.map((q) => q.id)).size).toBe(SY0_801_PRACTICE_TEST.length);
    const texts = SY0_801_PRACTICE_TEST.map((q) => q.questionText);
    expect(new Set(texts).size).toBe(texts.length);
    const aiTexts = new Set(SY0_801_AI_QUESTIONS.map((q) => q.questionText));
    for (const text of texts) expect(aiTexts.has(text)).toBe(false);
  });

  it("spreads the answers evenly across A to D, so position gives nothing away", () => {
    const counts = [0, 0, 0, 0];
    for (const q of SY0_801_PRACTICE_TEST) counts[q.correctIndex]++;
    for (const n of counts) {
      expect(n).toBeGreaterThanOrEqual(10);
      expect(n).toBeLessThanOrEqual(13);
    }
  });

  it("never gives the answer away by being the longest option every time", () => {
    const longest = SY0_801_PRACTICE_TEST.filter(
      (q) => q.options[q.correctIndex].length === Math.max(...q.options.map((o) => o.length))
    ).length;
    expect(longest / SY0_801_PRACTICE_TEST.length).toBeLessThan(0.6);
  });

  it("explains each answer without naming an option by letter, and opens with a line that stands alone", () => {
    for (const q of SY0_801_PRACTICE_TEST) {
      expect(mentionsOptionLetter(q.explanation), q.id).toBe(false);
      expect(splitExplanation(q.explanation).takeaway.length, q.id).toBeGreaterThan(30);
    }
  });

  it("avoids catch-all options", () => {
    for (const q of SY0_801_PRACTICE_TEST) {
      for (const option of q.options) {
        expect(option, q.id).not.toMatch(/all of the above|none of the above|both a and b/i);
      }
    }
  });
});
