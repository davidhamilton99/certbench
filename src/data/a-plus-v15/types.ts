/**
 * CompTIA A+ V15 (220-1201 and 220-1202), and how CertBench's bank, written to
 * the retired 220-1101 and 220-1102, moves onto it. One file per core holds
 * the exam's structure and every decision about an existing question, so the
 * migration, the path and the redirects all read the same map.
 */

export interface V15Objective {
  code: string;
  /** Short label for maps and headings ("Displays"). Our own wording. */
  label: string;
  /** What the objective covers, in our own words: CompTIA's wording is copyrighted. */
  title: string;
}

export interface V15Domain {
  number: string;
  title: string;
  /** Percent of the exam, from CompTIA's exam page. */
  weight: number;
  objectives: V15Objective[];
}

/** A correction to a question that was wrong as written. */
export interface QuestionFix {
  question?: string;
  options?: [string, string, string, string];
  answer?: 0 | 1 | 2 | 3;
  explanation: string;
}

export interface V15Exam {
  slug: string;
  /** The slug the 220-1101/1102 version used: for redirects and saved progress. */
  oldSlug: string;
  examCode: string;
  oldExamCode: string;
  passingScore: number;
  domains: V15Domain[];
  /** Old objective code → V15 code; null where the topic left the exam. */
  objectiveMap: Record<string, string | null>;
  /** Recall decks the path teaches from, deck id → V15 objective; null when dropped. */
  recallDecks: Record<string, string | null>;
  /**
   * Lab stops that close their domain with a different scenario on V15 (a
   * scenario moved domain or left): stop id ("lab2") → the scenario closing it
   * now. A learner's record for the stop is rebuilt from that scenario's own.
   */
  changedLabs: Record<string, string>;
  /** Questions that don't follow their objective's map: id → V15 code, and why. */
  overrides: Record<string, { to: string; why: string }>;
  /** Questions on topics V15 doesn't test: set inactive (never deleted), and why. */
  retired: Record<string, string>;
  /** Corrections to questions that were wrong as written, by id. */
  fixes: Record<string, QuestionFix>;
}
