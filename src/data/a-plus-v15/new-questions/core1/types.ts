import type { V15NewQuestion } from "@/data/a-plus-v15/migration-sql";

/**
 * A new A+ Core 1 (220-1201) question, in the shape the V15 migration builder
 * reads, plus the topic it covers. The wording is original, by CertBench:
 * CompTIA's exam questions are confidential, and nothing here comes from them
 * or from other prep sites.
 *
 * - `key`: stable and unique, "c1-<objective>-<slug>-<n>", e.g. "c1-2.2-6ghz-1".
 * - `objective`: the 220-1201 objective code, e.g. "2.2".
 * - `explanation`: why the answer is right, then briefly why each other option is wrong.
 */
export type NewQuestion = V15NewQuestion & {
  /** The topic it covers, worded as in COVERAGE, EXTRA_COVERAGE or TOP_UP_COVERAGE. */
  topic: string;
};

/** A topic, and the 220-1201 objective it belongs to. */
export interface CoverageItem {
  objective: string;
  topic: string;
}
