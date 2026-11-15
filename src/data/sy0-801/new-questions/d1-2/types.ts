/**
 * A new Security+ SY0-801 bank question for domains 1 and 2, plus the topic it
 * covers. The wording is original, by CertBench: CompTIA's objective wording is
 * copyrighted and its exam questions are confidential, and nothing here comes
 * from them or from other prep sites.
 *
 * - `key`: stable and unique, "s8-<objective>-<slug>-<n>", e.g. "s8-2.6-poisoning-1".
 * - `objective`: the SY0-801 objective code, e.g. "2.6".
 * - `options`: the path shuffles them, so an explanation never names one by letter.
 * - `explanation`: why the answer is right, then briefly why each other option is wrong.
 */
export interface NewQuestion {
  key: string;
  objective: string;
  /** The topic it covers, worded as in COVERAGE. */
  topic: string;
  difficulty: 1 | 2 | 3;
  question: string;
  options: readonly [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
}

/** A topic, and the SY0-801 objective it belongs to. */
export interface CoverageItem {
  objective: string;
  topic: string;
}
