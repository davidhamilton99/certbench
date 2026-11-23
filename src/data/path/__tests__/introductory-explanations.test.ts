import { describe, expect, it } from "vitest";
import { PATH_CONTENT } from "../index";
import type { AuthoredRep } from "../types";
import { wordCount } from "@/core/path/text";

/**
 * The explanations of the introductory questions are the first explanations a
 * visitor reads: four of them are the sample questions on the home page. The
 * question card prints each one straight after its verdict ("Correct." or
 * "Incorrect. The correct answer is 22."), so each has to read on from the
 * verdict as one or two complete sentences that give the reason, in the
 * register of the page around it. A note ("SSH is 22.", "Least privilege: only
 * the access the job needs.") is not that.
 *
 * This holds the written introductory questions, which today are the two
 * Security+ exams'. Network+ and A+ have none: their introductory questions are
 * built from the reference tables and the question bank when a study path is
 * opened, and the wording of those explanations is made elsewhere
 * (src/lib/path/fact-reps.ts, and the bank's stored explanations).
 */

/**
 * Short enough that the verdict and its explanation stay a few lines on a
 * phone, and fit the foot of the home page's sample sheet without changing
 * its size.
 */
const MAX_WORDS = 22;

/** "is not" and "it is" closed up. Case matters: "IT's approval" is a possessive, not a contraction. */
const CONTRACTION =
  /\b(?:[A-Za-z]+n't|(?:[Ii]t|[Tt]hat|[Tt]here|[Hh]ere|[Ww]hat|[Ww]ho|[Hh]e|[Ss]he|[Ll]et)'s|[A-Za-z]+'(?:re|ve|ll|d|m))\b/;

const answerOf = (r: AuthoredRep) => (r.kind === "typed" ? r.answer : r.options[0]);

/** What is wrong with an explanation, in words; nothing when it is sound. */
function faults(takeaway: string, answer: string): string[] {
  const found: string[] = [];
  if (takeaway !== takeaway.trim() || /\s{2,}/.test(takeaway)) found.push("has stray spacing");
  // Plain characters only: no dash, arrow, middle dot, curly quote or emoji.
  if ([...takeaway].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126)) {
    found.push("uses a character outside plain text");
  }
  // A colon or an equals sign is how a note joins a label to a fragment; a sentence uses a verb.
  if (/[:=]/.test(takeaway)) found.push("joins a label to a fragment where a sentence belongs");
  if (/[!&]/.test(takeaway)) found.push("uses an exclamation mark or an ampersand");
  if (CONTRACTION.test(takeaway)) found.push("uses a contraction");

  const sentences = takeaway.split(/(?<=\.)\s+/);
  if (sentences.length > 2) found.push(`has ${sentences.length} sentences`);
  for (const sentence of sentences) {
    if (!/^[A-Z]/.test(sentence) || !/[A-Za-z0-9)]\.$/.test(sentence)) {
      found.push(`is not set as a sentence: "${sentence}"`);
    }
    if (wordCount(sentence) < 4) found.push(`has a note where a sentence belongs: "${sentence}"`);
  }
  if (wordCount(takeaway) > MAX_WORDS) found.push(`runs to ${wordCount(takeaway)} words`);
  // The verdict names the answer; the explanation is about that answer, in the answer's own words.
  if (!takeaway.toLowerCase().includes(answer.toLowerCase())) found.push(`does not name the answer, "${answer}"`);
  return found;
}

const WRITTEN: [string, AuthoredRep[]][] = Object.entries(PATH_CONTENT)
  .map(([cert, content]): [string, AuthoredRep[]] => [cert, content.warmup.authored ?? []])
  .filter(([, reps]) => reps.length > 0);

/** What the check must refuse. The first five are the notes these explanations replaced. */
const REFUSED: [what: string, takeaway: string, answer: string, fault: RegExp][] = [
  ["a note of three words", "SSH is 22. It replaced Telnet on 23.", "22", /a note where a sentence belongs: "SSH is 22\."/],
  ["a sentence that begins with a figure", "443 is HTTPS. Plain HTTP is 80.", "HTTPS", /is not set as a sentence: "443 is HTTPS\."/],
  ["a label and a fragment", "Least privilege: only the access the job needs.", "Least privilege", /joins a label to a fragment/],
  ["a fragment after a colon", "Hashes prove data was not altered: integrity.", "Integrity", /joins a label to a fragment/],
  [
    "an abbreviation in place of the answer",
    "Something you have plus something you know is two factors, so MFA.",
    "Multifactor authentication",
    /does not name the answer, "Multifactor authentication"/,
  ],
  ["a contraction", "Integrity means that data wasn't altered. A hash shows whether it has.", "Integrity", /uses a contraction/],
  ["a contraction of it is", "A hash shows whether data has changed. It's how integrity is checked.", "Integrity", /uses a contraction/],
  ["three sentences", "SSH uses port 22. Telnet uses port 23. SMTP uses port 25.", "22", /has 3 sentences/],
  [
    "an explanation that runs on",
    `Least privilege gives ${"an account ".repeat(11)}only the access that its job needs.`,
    "Least privilege",
    /runs to 32 words/,
  ],
  [
    "a dash between words",
    `Least privilege gives an account the access that its job needs ${String.fromCharCode(0x2014)} and no more.`,
    "Least privilege",
    /uses a character outside plain text/,
  ],
  [
    "an ampersand",
    "The badge & the PIN are two factors, which is multifactor authentication.",
    "Multifactor authentication",
    /an ampersand/,
  ],
];

describe("explanations of the introductory questions", () => {
  it("covers both Security+ exams, so the checks below are not empty", () => {
    const certs = WRITTEN.map(([cert]) => cert);
    expect(certs).toContain("security-plus-sy0-701");
    expect(certs).toContain("security-plus-sy0-801");
  });

  for (const [cert, reps] of WRITTEN) {
    it(`${cert}: explains every answer in one or two complete sentences`, () => {
      for (const r of reps) {
        expect(faults(r.takeaway, answerOf(r)), `${r.key}: ${r.takeaway}`).toEqual([]);
      }
    });
  }

  it("gives a question that both Security+ versions ask the same explanation", () => {
    const sy0701 = new Map((PATH_CONTENT["security-plus-sy0-701"].warmup.authored ?? []).map((r) => [r.key, r]));
    let shared = 0;
    for (const r of PATH_CONTENT["security-plus-sy0-801"].warmup.authored ?? []) {
      const twin = sy0701.get(r.key);
      if (!twin || twin.prompt !== r.prompt) continue;
      shared++;
      expect(r.takeaway, r.key).toBe(twin.takeaway);
    }
    expect(shared).toBeGreaterThan(0);
  });

  it("reads on from the verdict, as the first question does", () => {
    const first = PATH_CONTENT["security-plus-sy0-701"].warmup.authored?.[0];
    expect(first?.takeaway).toBe("SSH uses port 22. It replaced Telnet, which uses port 23.");
  });

  describe("the check itself", () => {
    it("passes a sentence that adds to the verdict", () => {
      expect(faults("SSH uses port 22. It replaced Telnet, which uses port 23.", "22")).toEqual([]);
      expect(faults("Least privilege gives an account only the access that its job needs.", "Least privilege")).toEqual([]);
      // A possessive is not a contraction.
      expect(faults("Shadow IT is technology that is used without IT's approval.", "Shadow IT")).toEqual([]);
    });

    it.each(REFUSED)("refuses %s", (_what, takeaway, answer, fault) => {
      expect(faults(takeaway, answer).join("; ")).toMatch(fault);
    });
  });
});
