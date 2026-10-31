/**
 * Hand-written path content. Each rep is one short thing to answer, tagged to
 * an exam objective.
 *
 * Authoring rules (enforced by src/data/path/__tests__/content.test.ts):
 * - The FIRST option is the correct one. Options are shuffled when a stop is
 *   built, so reviewers can check every rep at a glance.
 * - Prompts stay short (quick reps ≤ 25 words, exam-style ≤ 40), options are a
 *   few words each, and every rep has a one-line takeaway.
 * - Exactly one option is defensible. If a careful reader could argue for a
 *   second option, rewrite the prompt.
 */

export type AuthoredTier = "recall" | "quick" | "exam";

export interface AuthoredChoice {
  kind: "choice";
  /** Unique within the exam. Becomes part of the rep id, so never reuse one. */
  key: string;
  objective: string;
  tier: AuthoredTier;
  prompt: string;
  /** Four options, correct one first. */
  options: readonly [string, string, string, string];
  takeaway: string;
  /** Options are short codes (ports) — set large in mono. */
  mono?: boolean;
}

export interface AuthoredTyped {
  kind: "typed";
  key: string;
  objective: string;
  tier: "recall";
  prompt: string;
  /** Short instruction shown by the input, e.g. "Type the port". */
  cue: string;
  answer: string;
  numeric?: boolean;
  takeaway: string;
}

export type AuthoredRep = AuthoredChoice | AuthoredTyped;

/** Shorthand used by the content files. */
export const choice = (
  key: string,
  objective: string,
  tier: AuthoredTier,
  prompt: string,
  options: readonly [string, string, string, string],
  takeaway: string,
  extra?: { mono?: boolean }
): AuthoredChoice => ({ kind: "choice", key, objective, tier, prompt, options, takeaway, ...extra });

export const typed = (
  key: string,
  objective: string,
  prompt: string,
  cue: string,
  answer: string,
  takeaway: string,
  extra?: { numeric?: boolean }
): AuthoredTyped => ({ kind: "typed", key, objective, tier: "recall", prompt, cue, answer, takeaway, ...extra });
