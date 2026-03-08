/**
 * Performance-Based Question (PBQ) scenario types.
 * Three interaction modes: ordering, matching, categorization.
 */

export interface OrderingScenario {
  type: "ordering";
  id: string;
  title: string;
  description: string;
  domain_number: string;
  domain_title: string;
  /** Items to be placed in the correct order. */
  items: string[];
  /** Correct order as indices into the items array. */
  correct_order: number[];
  /** Explanation shown after grading. */
  explanation: string;
}

export interface MatchingScenario {
  type: "matching";
  id: string;
  title: string;
  description: string;
  domain_number: string;
  domain_title: string;
  /** Left column (fixed). */
  left: string[];
  /** Right column (to be matched). */
  right: string[];
  /** Correct mapping: correct_map[leftIndex] = rightIndex. */
  correct_map: number[];
  explanation: string;
}

export interface CategorizationScenario {
  type: "categorization";
  id: string;
  title: string;
  description: string;
  domain_number: string;
  domain_title: string;
  /** Category bucket names. */
  categories: string[];
  /** Items to be sorted into categories. */
  items: { text: string; category: number }[];
  explanation: string;
}

export type PbqScenario =
  | OrderingScenario
  | MatchingScenario
  | CategorizationScenario;

/** Grading result for a PBQ scenario. */
export interface PbqGradeResult {
  score: number; // 0-100
  totalItems: number;
  correctItems: number;
  feedback: string[];
}
