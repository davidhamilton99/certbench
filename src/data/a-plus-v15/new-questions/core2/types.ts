import type { V15NewQuestion } from "@/data/a-plus-v15/migration-sql";

/**
 * A question for a topic CompTIA added in A+ Core 2 (220-1202): one a bank
 * written to 220-1102 doesn't cover. Original, written by CertBench: CompTIA's
 * exam questions are confidential, and nothing here comes from them or from
 * other prep material.
 *
 * key is stable and unique, "c2-<objective>-<slug>-<n>" (e.g. "c2-1.9-dnf-1").
 * The explanation says why the answer is right, then briefly why each other
 * option is wrong.
 */
export type NewQuestion = V15NewQuestion & {
  /** The added topic it covers, worded as in COVERAGE. */
  topic: string;
};

/** A topic 220-1202 added, under the objective that lists it. */
export interface CoverageTopic {
  objective: string;
  topic: string;
}
