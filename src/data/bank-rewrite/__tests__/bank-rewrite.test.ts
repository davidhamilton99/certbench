import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { mentionsOptionLetter } from "@/core/path/text";
import { answerLengthRatio, chooseLongestScore, chooseShortestScore, type KeyedQuestion } from "@/core/questions/cues";
import { americanSpelling } from "@/core/text/spelling";

/**
 * The rewritten question bank, and the rules it is held to.
 *
 * Each JSON file in src/data/bank-rewrite holds the new text of one exam's
 * questions in the database (the cert_questions table), one entry for each
 * stored row: its id, a fingerprint of the text it replaces ("was"), the new
 * question, its four options in their stored order, the position of the
 * correct option ("answer"), the explanation and the difficulty. A question is
 * added once it has passed every check of the rewrite, so a file can cover
 * part of an exam while the rewrite is under way.
 *
 * The bank was rewritten because visitors were choosing the longest answer
 * without reading the question. Recordings of real visitors in November 2026
 * showed the habit, and on the old bank it was right more than half the time.
 * In the new text the right answer is no more often the longest or the
 * shortest option than chance would make it, and these tests keep it that way.
 *
 * The files change nothing on the site by themselves. The questions reach the
 * database through scripts/bank-rewrite/apply.mjs, which is run only with
 * David's go-ahead. It changes a row only while the row still reads exactly as
 * it did when the rewrite was made (the "was" fingerprint), and every row keeps
 * its id and the position of its correct option, so that members' past answers
 * still point at the right one.
 */

interface BankRow {
  id: string;
  was: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  difficulty: number;
}

interface Exam {
  exam: string;
  rows: BankRow[];
}

const DIR = join(__dirname, "..");
const EXAMS: Exam[] = readdirSync(DIR)
  .filter((file) => file.endsWith(".json"))
  .sort()
  .map((file) => ({ exam: file.replace(/\.json$/, ""), rows: JSON.parse(readFileSync(join(DIR, file), "utf8")) as BankRow[] }));
const ALL = EXAMS.flatMap(({ exam, rows }) => rows.map((row) => ({ exam, ...row })));

/** Where a fault is: the exam and the question's id. */
const where = (row: { exam: string; id: string }, detail = "") => `${row.exam} ${row.id}${detail ? `: ${detail}` : ""}`;
/** Every text a visitor reads in one question, each with its name. */
const texts = (row: BankRow): [string, string][] => [
  ["question", row.question],
  ...row.options.map((option, i): [string, string] => [`option ${i + 1}`, option]),
  ["explanation", row.explanation],
];
/** The rows of which `fault` names something, each with what it found. */
const faults = (fault: (row: BankRow) => string | null) =>
  ALL.flatMap((row) => {
    const found = fault(row);
    return found ? [where(row, found)] : [];
  });
/** The first text of a row that `test` finds, by name, or null. */
const firstText = (row: BankRow, test: (text: string) => boolean) => texts(row).find(([, text]) => test(text))?.[0] ?? null;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** A dash between words: a figure dash, en dash, em dash or horizontal bar anywhere, or a hyphen with a space on each side. */
const DASH = new RegExp(`[${String.fromCharCode(0x2012, 0x2013, 0x2014, 0x2015)}]| -{1,2} `);
const APOSTROPHE = `['${String.fromCharCode(0x2019)}]`;
/** "don't", "it's", "they're" and the like. A possessive ("CompTIA's") is not one. */
const CONTRACTION = new RegExp(
  `\\b(?:\\w+n${APOSTROPHE}t|(?:it|that|there|what|who|he|she|here|where|how|let)${APOSTROPHE}s|i${APOSTROPHE}m|\\w+${APOSTROPHE}(?:re|ll|ve|d))\\b`,
  "i"
);
/** Spellings that American English does not use: what americanSpelling would change, and two it accepts but the writers were held to. */
const isBritish = (text: string) => americanSpelling(text) !== text || /\b(?:judgement|acknowledgement)s?\b/i.test(text);
/** An option named by its place in the list: options are shuffled when they are shown, so the place is not the one the reader sees. */
const namesAPlace = (text: string) =>
  mentionsOptionLetter(text) ||
  /\b[A-D]\) |\b[A-D] is (?:correct|incorrect|wrong)\b/.test(text) ||
  /\b(?:first|second|third|fourth|last) (?:option|choice)\b/i.test(text);

describe("the rewritten question bank", () => {
  it("has at least one exam file, and no file without questions", () => {
    expect(EXAMS.length).toBeGreaterThan(0);
    expect(EXAMS.filter(({ rows }) => !Array.isArray(rows) || rows.length === 0).map(({ exam }) => exam)).toEqual([]);
  });

  it("gives every question an id of its own, and every id is a UUID", () => {
    const seen = new Set<string>();
    const repeated = ALL.filter((row) => seen.size === seen.add(row.id).size).map((row) => where(row, "the id appears twice"));
    expect(repeated).toEqual([]);
    expect(faults((row) => (UUID.test(row.id) ? null : "the id is not a UUID"))).toEqual([]);
  });

  it("gives every question four distinct options, none of them empty", () => {
    expect(
      faults((row) => {
        if (!Array.isArray(row.options) || row.options.length !== 4) return "there are not four options";
        if (row.options.some((option) => typeof option !== "string" || option.trim() === "")) return "an option is empty";
        return new Set(row.options.map((option) => option.trim().toLowerCase())).size === 4 ? null : "two options are the same";
      })
    ).toEqual([]);
  });

  it("marks one of the four options as the answer", () => {
    expect(faults((row) => (Number.isInteger(row.answer) && row.answer >= 0 && row.answer <= 3 ? null : `the answer is ${row.answer}`))).toEqual([]);
  });

  it("records the fingerprint of the text that each question replaces, as 16 hexadecimal characters", () => {
    expect(faults((row) => (/^[0-9a-f]{16}$/.test(row.was) ? null : "the fingerprint is not 16 hexadecimal characters"))).toEqual([]);
  });

  it("gives every question a difficulty of 1, 2 or 3", () => {
    expect(faults((row) => ([1, 2, 3].includes(row.difficulty) ? null : `the difficulty is ${row.difficulty}`))).toEqual([]);
  });

  it("asks every question as a question", () => {
    expect(faults((row) => (row.question.endsWith("?") ? null : "the question does not end with a question mark"))).toEqual([]);
  });

  it("explains every answer in 150 to 700 characters, ending with a full stop", () => {
    expect(
      faults((row) => {
        const n = row.explanation.length;
        if (n < 150 || n > 700) return `the explanation has ${n} characters`;
        return row.explanation.endsWith(".") ? null : "the explanation does not end with a full stop";
      })
    ).toEqual([]);
  });

  it("never names an option by its letter or its place in the list", () => {
    expect(faults((row) => (namesAPlace(row.explanation) ? "the explanation names an option by its place" : null))).toEqual([]);
  });

  it("has no em dash, no en dash and no hyphen with a space on each side", () => {
    expect(faults((row) => firstText(row, (text) => DASH.test(text)))).toEqual([]);
  });

  it("has no contraction", () => {
    expect(faults((row) => firstText(row, (text) => CONTRACTION.test(text)))).toEqual([]);
  });

  it("has no British spelling", () => {
    expect(faults((row) => firstText(row, isBritish))).toEqual([]);
  });

  it("has no backtick and no line break", () => {
    expect(faults((row) => firstText(row, (text) => /[`\r\n\t]/.test(text)))).toEqual([]);
  });
});

describe("what the answers give away by their length", () => {
  const measures = (rows: KeyedQuestion[]) => ({
    longest: chooseLongestScore(rows),
    shortest: chooseShortestScore(rows),
    ratio: answerLengthRatio(rows),
  });
  // With four options, a habit of choosing by length earns about 0.25 by chance. A sound set stays near it.
  const expectNearChance = (name: string, rows: KeyedQuestion[]) => {
    const m = measures(rows);
    expect(m.longest, `${name}: choosing the longest answer`).toBeGreaterThanOrEqual(0.15);
    expect(m.longest, `${name}: choosing the longest answer`).toBeLessThanOrEqual(0.35);
    expect(m.shortest, `${name}: choosing the shortest answer`).toBeGreaterThanOrEqual(0.15);
    expect(m.shortest, `${name}: choosing the shortest answer`).toBeLessThanOrEqual(0.35);
    expect(m.ratio, `${name}: right answers against wrong ones in length`).toBeGreaterThanOrEqual(0.9);
    expect(m.ratio, `${name}: right answers against wrong ones in length`).toBeLessThanOrEqual(1.1);
  };

  for (const { exam, rows } of EXAMS) {
    it(`gives nothing away in ${exam}: choosing the longest or the shortest answer scores near chance`, () => {
      expectNearChance(exam, rows);
    });
  }

  it("gives nothing away across every exam together", () => {
    expectNearChance("every exam", ALL);
  });
});

// The checks are themselves checked, so that a pass above means that the text was read and found clean.
describe("the checks on the bank", () => {
  const EM_DASH = String.fromCharCode(0x2014);
  const EN_DASH = String.fromCharCode(0x2013);

  it("see a dash between words, and leave a hyphenated word alone", () => {
    expect([`left ${EM_DASH} right`, `left${EM_DASH}right`, `pages 3${EN_DASH}5`, "left - right"].filter((text) => DASH.test(text))).toHaveLength(4);
    expect(["a well-known port", "the -t switch", "SHA-256"].filter((text) => DASH.test(text))).toEqual([]);
  });

  it("see a contraction, and leave a possessive alone", () => {
    expect(["It doesn't apply.", "It's encrypted.", "They're the same.", "You'd need a key."].filter((text) => CONTRACTION.test(text))).toHaveLength(4);
    expect(["CompTIA's objectives", "the user's session", "the servers' logs"].filter((text) => CONTRACTION.test(text))).toEqual([]);
  });

  it("see a British spelling, and leave American spelling and the Fibre Channel name alone", () => {
    expect(["the organisation", "a colour printer", "the data centre", "a sound judgement"].filter(isBritish)).toHaveLength(4);
    expect(["the organization", "a Fibre Channel fabric", "two analyses"].filter(isBritish)).toEqual([]);
  });

  it("see an option named by its letter or its place", () => {
    expect(["Option B is a hub.", "B is incorrect because", "The first option is a hub.", "A) a hub"].filter(namesAPlace)).toHaveLength(4);
    expect(["A hub repeats every frame.", "Plan for the worst case."].filter(namesAPlace)).toEqual([]);
  });

  it("score a set that gives its answers away as far from chance", () => {
    const longestRight = [
      { options: ["the longest option of all", "short", "brief", "small"], answer: 0 },
      { options: ["tiny", "the longest option of all", "brief", "small"], answer: 1 },
    ];
    expect(chooseLongestScore(longestRight)).toBe(1);
    expect(answerLengthRatio(longestRight)).toBeGreaterThan(1.1);
  });
});
