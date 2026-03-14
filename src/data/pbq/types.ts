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

/* ================================================================ */
/*  Simulation Scenario Types                                        */
/* ================================================================ */

export interface SimDropdownField {
  type: "dropdown";
  id: string;
  label: string;
  options: string[];
  correctIndex: number;
}

export interface SimTextInputField {
  type: "text";
  id: string;
  label: string;
  /** Accepted answers (case-insensitive, whitespace-normalised). */
  acceptedValues: string[];
  placeholder?: string;
}

export interface SimSelectManyField {
  type: "select-many";
  id: string;
  label: string;
  options: string[];
  /** Indices of the correct options. */
  correctIndices: number[];
}

export interface SimZonePlacementField {
  type: "zone-placement";
  id: string;
  label: string;
  /** Items to place into zones. */
  items: string[];
  /** Zone names (e.g., "DMZ", "Internal", "External"). */
  zones: string[];
  /** Correct zone for each item: correctZones[itemIndex] = zoneIndex. */
  correctZones: number[];
}

export type SimField =
  | SimDropdownField
  | SimTextInputField
  | SimSelectManyField
  | SimZonePlacementField;

export interface SimTask {
  id: string;
  title: string;
  /** Instructions shown at the top of this task panel. */
  instructions: string;
  /** Optional evidence: command output, log snippets, config tables. */
  evidence?: { label: string; content: string }[];
  /** Input fields for this task. */
  fields: SimField[];
  /** Per-task explanation shown in results. */
  explanation: string;
}

export interface SimulationScenario {
  type: "simulation";
  id: string;
  title: string;
  /** Scenario briefing — the situation the candidate walks into. */
  briefing: string;
  domain_number: string;
  domain_title: string;
  /** Ordered tasks rendered as tabs. */
  tasks: SimTask[];
  /** Overall explanation shown after grading. */
  explanation: string;
  /** Estimated minutes to complete (shown in list view). */
  estimatedMinutes: number;
}

/** Answer shape for a single simulation field. */
export type SimFieldAnswer =
  | { type: "dropdown"; selectedIndex: number }
  | { type: "text"; value: string }
  | { type: "select-many"; selectedIndices: number[] }
  | { type: "zone-placement"; placements: number[] };

export type PbqScenario =
  | OrderingScenario
  | MatchingScenario
  | CategorizationScenario
  | SimulationScenario;

/** Grading result for a PBQ scenario. */
export interface PbqGradeResult {
  score: number; // 0-100
  totalItems: number;
  correctItems: number;
  feedback: string[];
}

/** Per-task grading breakdown for simulations. */
export interface SimTaskGradeResult {
  taskTitle: string;
  totalFields: number;
  correctFields: number;
  feedback: string[];
}
