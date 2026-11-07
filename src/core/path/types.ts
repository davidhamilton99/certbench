/**
 * The guided path — one exam's objectives as a sequence of short stops, each a
 * round of reps (one thing to answer). Shared by the server (which composes
 * and gates stops) and the client (which plays them), so a stop means the same
 * thing on both sides. Pure types; see plan.ts, progress.ts and compose.ts.
 */

import type { ItemMap } from "@/core/drill-rounds/drill-rounds";

/** The exams that have a path, by certification slug. */
export const PATH_CERTS = [
  "security-plus-sy0-701",
  "network-plus-n10-009",
  "a-plus-core1-220-1101",
  "a-plus-core2-220-1102",
] as const;
export type PathCert = (typeof PATH_CERTS)[number];

export function isPathCert(slug: string): slug is PathCert {
  return (PATH_CERTS as readonly string[]).includes(slug);
}

/**
 * How much reading a rep asks for. The path climbs through these: recall and
 * quick reps first, the real exam's wording at the end of each stop.
 */
export type RepTier = "recall" | "quick" | "exam";

interface RepBase {
  /** Stable id — see rep-id.ts. Progress is recorded against it. */
  id: string;
  /** Small label above the prompt: "Quick scenario", "Recall", "Exam style". */
  label: string;
  tier: RepTier;
  /** Exam objective code the rep belongs to, e.g. "1.1". */
  objective: string;
  prompt: string;
  /** Optional short ask shown with a recall prompt, e.g. "Which port?". */
  cue?: string;
  /** One line shown after answering — the thing to remember. */
  takeaway: string;
}

export interface ChoiceRep extends RepBase {
  type: "choice";
  options: string[];
  answer: number;
  /** The rest of the explanation, folded behind "Why, in full". */
  explanation?: string;
  /** Options show A–D letters, like the exam (bank questions). */
  lettered?: boolean;
  /**
   * For bank questions: the stored position of each displayed option, so an
   * answer is recorded against the bank's order after shuffling.
   */
  order?: number[];
  /** Short codes (port numbers) — set large in mono. */
  mono?: boolean;
}

export interface TypedRep extends RepBase {
  type: "typed";
  /**
   * Accepted answers, already normalized (see lib/recall/normalize.ts). For a
   * subnetting rep, the single canonical answer its grader checks against.
   */
  accept: string[];
  /** The canonical answer shown on reveal. */
  answerText: string;
  numeric?: boolean;
  /**
   * Subnetting reps are graded by the subnetting engine (dotted masks, CIDR,
   * host counts), not by plain text matching, which would ignore the dots.
   */
  answerKind?: "binary" | "dotted" | "cidr" | "count";
  placeholder?: string;
  /** Worked steps, folded behind "Why, in full". */
  explanation?: string;
}

export type Rep = ChoiceRep | TypedRep;

export type StopKind = "warmup" | "learn" | "checkpoint" | "practice" | "lab" | "rehearsal" | "review";

export interface PathStop {
  /** "warmup", an objective code ("1.1"), "checkpoint", "d1", "lab1", "rehearsal"… or "review". */
  id: string;
  index: number;
  kind: StopKind;
  title: string;
  /** Domain number ("1.0") for learn and practice stops. */
  domain: string | null;
  /** Objective codes the stop covers. */
  objectives: string[];
}

export interface PathObjective {
  code: string;
  title: string;
}

/** A hands-on lab: one of the exam's PBQ scenarios (src/data/pbq), played as a stop. */
export interface PathLab {
  /** The scenario's id. */
  id: string;
  title: string;
  /** Rough minutes it takes. */
  minutes: number;
}

/** The kinds of PBQ scenario (src/data/pbq/types.ts). */
export type LabType = "simulation" | "topology" | "threat-hunt" | "ordering" | "matching" | "categorization";

/** One lab in an exam's library: what a list shows before the scenario is loaded. */
export interface PathLabInfo extends PathLab {
  type: LabType;
  /** Domain number, e.g. "3.0". */
  domain: string;
}

export interface PathDomain {
  number: string;
  title: string;
  /** Share of the exam, in percent. */
  weight: number;
  objectives: PathObjective[];
  /** The lab that closes this domain on the path, when the exam has one for it. */
  lab?: PathLab;
}

/** What an exam's path is built from: its domains and objectives, in order. */
export interface PathStructure {
  certSlug: string;
  /** Short exam name, e.g. "Security+". */
  examName: string;
  examCode: string;
  domains: PathDomain[];
  /** Every lab the exam has, domain by domain: the path's own and the rest. */
  library?: PathLabInfo[];
}

export interface PathPlan {
  stops: PathStop[];
  /** Index of the last stop a free account can open (the checkpoint). */
  freeThrough: number;
}

/** One finished run of a stop. */
export type StopRecord = {
  /** Times finished. */
  n: number;
  /** Correct and total on the latest run. */
  c: number;
  t: number;
  /** When the latest run finished (ms). */
  at: number;
};

export type CheckpointResult = {
  /** 0–100, exam-weighted across the domains sampled. */
  score: number;
  at: number;
  domains: { number: string; correct: number; total: number }[];
};

/** An exam rehearsal's length: the real exam's, or half of it. */
export type RehearsalSize = "full" | "half";

/** One finished exam rehearsal, scored like the checkpoint. */
export type RehearsalResult = CheckpointResult & {
  size: RehearsalSize;
  /** Questions answered, out of those asked. Unanswered ones count as wrong. */
  answered: number;
  total: number;
  /** Clock time used, in seconds. */
  seconds: number;
};

export type PathGoal = {
  /** ISO date when the exam is booked. */
  examDate: string | null;
  /** ISO date they're aiming for when it isn't booked yet. */
  target: string | null;
  /** Minutes a day they said they can give it. */
  minutes: number | null;
  at: number;
};

/** Everything one person has done on one exam's path. */
export interface PathProgress {
  items: ItemMap;
  stops: Record<string, StopRecord>;
  checkpoint: CheckpointResult | null;
  /** Finished exam rehearsals, oldest first. */
  rehearsals: RehearsalResult[];
  /** Labs played, by scenario id: wherever they were opened, the path or its library. */
  labs: Record<string, StopRecord>;
  goal: PathGoal | null;
}

export const EMPTY_PATH_PROGRESS: PathProgress = {
  items: {},
  stops: {},
  checkpoint: null,
  rehearsals: [],
  labs: {},
  goal: null,
};

export type ObjectiveStatus = "new" | "missed" | "got";

/** One stop of a path, packaged for a public page to play inline. */
export interface QuickRoundData {
  cert: PathCert;
  examName: string;
  /** The stop's title ("Security controls", "Warm-up"). */
  title: string;
  reps: Rep[];
  /** Where this stop sits on the path, for the pitch line. */
  stopNumber: number;
  totalStops: number;
  objectiveCount: number;
}
