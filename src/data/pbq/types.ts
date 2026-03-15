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

/* ================================================================ */
/*  Topology Scenario Types                                          */
/* ================================================================ */

/** Position of a device on the SVG canvas (percentage-based, 0-100). */
export interface TopoPosition {
  x: number;
  y: number;
}

/** Device categories — determines the SVG icon rendered. */
export type TopoDeviceType =
  | "router"
  | "switch"
  | "firewall"
  | "server"
  | "pc"
  | "access-point"
  | "cloud";

/** A CLI command field — user types IOS/config-style commands. */
export interface TopoCLIField {
  type: "cli";
  id: string;
  label: string;
  /** Prompt string shown (e.g., "Switch(config)#"). */
  prompt: string;
  /** Each accepted command sequence: array of command strings.
   *  Order-sensitive. Multiple valid sequences allowed. */
  acceptedSequences: string[][];
  /** Hint shown after incorrect submission. */
  hint?: string;
}

/** Union of fields available inside a topology device config panel. */
export type TopoField =
  | SimDropdownField
  | SimTextInputField
  | SimSelectManyField
  | TopoCLIField;

/** A connection line between two devices in the topology. */
export interface TopoConnection {
  from: string;
  to: string;
  label?: string;
}

/** A single device in the topology diagram. */
export interface TopoDevice {
  id: string;
  type: TopoDeviceType;
  label: string;
  position: TopoPosition;
  /** If true, device is already correctly configured.
   *  Touching a pre-configured device incurs a grading penalty. */
  preConfigured: boolean;
  /** Fields shown when user clicks the device. */
  fields: TopoField[];
  /** Per-device explanation shown in results. */
  explanation: string;
  /** Optional read-only block showing current config (show commands output). */
  currentConfig?: string;
}

export interface TopologyScenario {
  type: "topology";
  id: string;
  title: string;
  /** Scenario briefing — the situation description. */
  briefing: string;
  domain_number: string;
  domain_title: string;
  /** Network diagram title/label. */
  diagramTitle: string;
  /** All devices in the topology. */
  devices: TopoDevice[];
  /** Connection lines between devices. */
  connections: TopoConnection[];
  /** Overall explanation shown after grading. */
  explanation: string;
  estimatedMinutes: number;
}

/** Answer shape for a CLI field. */
export interface TopoCLIFieldAnswer {
  type: "cli";
  commands: string[];
}

/** Extended field answer union for topology scenarios. */
export type TopoFieldAnswer = SimFieldAnswer | TopoCLIFieldAnswer;

export type PbqScenario =
  | OrderingScenario
  | MatchingScenario
  | CategorizationScenario
  | SimulationScenario
  | TopologyScenario;

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

/** Per-device grading breakdown for topologies. */
export interface TopoDeviceGradeResult {
  deviceLabel: string;
  deviceId: string;
  preConfigured: boolean;
  totalFields: number;
  correctFields: number;
  feedback: string[];
}
