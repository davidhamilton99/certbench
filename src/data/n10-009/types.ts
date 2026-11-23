/**
 * A new Network+ N10-009 bank question, written in November 2026 to take the
 * bank past 1,000 questions. The wording is original, by CertBench: CompTIA's
 * objective wording is copyrighted and its exam questions are confidential,
 * and nothing here comes from them or from other prep sites.
 *
 * - `key`: stable and unique, "n9-<topic>-<slug>-<n>", e.g. "n9-2.4-wpa3-sae-1".
 * - `topic`: the Network+ topic it is filed under, e.g. "2.4". Network+ topics
 *   are CertBench's own grouping of the N10-009 content, not CompTIA's
 *   objective numbers (usesOfficialObjectiveNumbers in src/lib/seo/exam-versions.ts).
 * - `subject`: what it practices, in a few words.
 * - `options`: shown shuffled on the study path, so an explanation never names
 *   one by letter.
 * - `explanation`: why the answer is right, then briefly why each other option
 *   is wrong.
 */
/**
 * A correction to a live Network+ question. `was` is the live question's text
 * and explanation when the correction was written; the fields given replace
 * the live ones, and the fields left out stay as they are.
 */
export interface N10009LiveFix {
  id: string;
  topic: string;
  /** What was wrong, in a sentence or two. */
  why: string;
  was: { question: string; explanation: string };
  question?: string;
  options?: readonly [string, string, string, string];
  answer?: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface N10009NewQuestion {
  key: string;
  topic: string;
  subject: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
}
