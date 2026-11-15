/**
 * A new Security+ SY0-801 bank question for domains 3 to 5, and the topic it
 * covers. The wording is original, by CertBench: CompTIA's objective wording
 * is copyrighted and its exam questions are confidential, so nothing here
 * comes from them or from other prep sites.
 *
 * It's the shape the A+ V15 migration builder reads (key, objective,
 * difficulty, question, options, answer, explanation) plus the topic, so the
 * SY0-801 migration can insert these the same way.
 *
 * - `key`: stable and unique, "s8-<objective>-<slug>-<n>", e.g. "s8-4.3-ipam-1".
 * - `objective`: the SY0-801 objective code, e.g. "4.3".
 * - `options`: four distinct answers. The path shuffles them, so nothing refers
 *   to an option by its letter.
 * - `explanation`: why the answer is right, then briefly why each other option is wrong.
 */
export interface NewQuestion {
  key: string;
  objective: string;
  /** The topic it covers, worded exactly as in COVERAGE. */
  topic: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
}

/** A topic SY0-801 names, and the objective it belongs to. */
export interface CoverageItem {
  objective: string;
  topic: string;
}
