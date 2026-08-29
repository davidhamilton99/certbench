import type { ReferenceTable } from "@/data/reference/types";
import { acceptableAnswers, normalizeAnswer } from "./normalize";

/**
 * The Recall engine. Turns any verified {@link ReferenceTable} into an endless
 * rapid-fire drill by picking two of its columns — one shown as the cue, one
 * you have to recall. Pure and RNG-injectable so the generator can be swept
 * deterministically in tests; the UI passes `Math.random`.
 *
 * A deck drills the relationship between two columns ("acronym" ↔ "expansion",
 * "protocol" ↔ "port"). `choice` mode offers four options; `type` mode grades a
 * free-typed answer through {@link normalizeAnswer}. Bidirectional decks flip
 * the cue and answer at random so you're never just memorizing one direction.
 */

export type RecallMode = "choice" | "type";
export type Rng = () => number;

/** One drillable column: `key` indexes the table row, `label` frames the ask. */
export interface RecallField {
  key: string;
  /** Singular noun used in the prompt, e.g. "port", "acronym", "expansion". */
  label: string;
}

export interface RecallDeckConfig {
  id: string;
  /** Deck name in the picker. */
  label: string;
  /** One-line description under the deck name. */
  blurb?: string;
  /** Which reference table (by its `id`) this deck drills. */
  tableId: string;
  mode: RecallMode;
  /** The column shown as the cue in the default direction. */
  ask: RecallField;
  /** The column to recall in the default direction. */
  answer: RecallField;
  /** Randomly swap cue/answer so both directions get drilled. */
  bidirectional?: boolean;
  /** `type`-mode grading. `numeric-parts` accepts a single port of "20/21". */
  accept?: "exact" | "numeric-parts";
  /** Extra columns surfaced on reveal, for the "oh right" context. */
  detailKeys?: string[];
}

export interface ResolvedDeck {
  config: RecallDeckConfig;
  /** Rows that have a non-empty value for every field the deck touches. */
  rows: Array<Record<string, string>>;
}

export interface RecallQuestion {
  deckId: string;
  mode: RecallMode;
  /** The cue value shown big, e.g. "HTTPS" or "AES". */
  promptValue: string;
  /** Noun for the cue ("protocol") and for the answer ("port"). */
  askLabel: string;
  answerLabel: string;
  /** Canonical answer, for display on reveal. */
  answer: string;
  /** Normalized forms accepted in `type` mode. */
  acceptable: string[];
  /** Four shuffled options in `choice` mode; empty in `type` mode. */
  options: string[];
  /** Context line shown on reveal ("" when the deck defines no detail). */
  detail: string;
}

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Distinct values for a column across the deck's rows, preserving first seen. */
function distinctValues(rows: ResolvedDeck["rows"], key: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const v = row[key];
    if (v && !seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Resolve a deck config against its reference table: validate the columns
 * exist, keep only rows usable for the drill, and confirm there's enough
 * variety to build the deck. Throws with a specific message on misconfig so a
 * broken deck fails loudly at build/test time, never silently in front of a user.
 */
export function buildDeck(
  config: RecallDeckConfig,
  table: ReferenceTable
): ResolvedDeck {
  const columnKeys = new Set(table.columnHeaders.map((c) => c.key));
  const touched = [
    config.ask.key,
    config.answer.key,
    ...(config.detailKeys ?? []),
  ];
  for (const key of touched) {
    if (!columnKeys.has(key)) {
      throw new Error(
        `Recall deck "${config.id}": column "${key}" is not in table "${table.id}"`
      );
    }
  }

  const rows = table.entries
    .map((e) => e.columns)
    .filter((c) => c[config.ask.key] && c[config.answer.key]);

  if (rows.length < 4) {
    throw new Error(
      `Recall deck "${config.id}": only ${rows.length} usable rows (need ≥4)`
    );
  }

  // Choice mode needs four distinct options in every direction it can ask.
  if (config.mode === "choice") {
    const dirs = config.bidirectional
      ? [config.answer.key, config.ask.key]
      : [config.answer.key];
    for (const key of dirs) {
      const distinct = distinctValues(rows, key).length;
      if (distinct < 4) {
        throw new Error(
          `Recall deck "${config.id}": column "${key}" has ${distinct} distinct values (need ≥4 for choice mode)`
        );
      }
    }
  }

  return { config, rows };
}

/** Generate one question. `rng` defaults to `Math.random` for the live drill. */
export function generateRecallQuestion(
  deck: ResolvedDeck,
  rng: Rng = Math.random
): RecallQuestion {
  const { config, rows } = deck;

  // Direction: swap cue/answer for bidirectional decks half the time.
  const swap = config.bidirectional === true && rng() < 0.5;
  const askField = swap ? config.answer : config.ask;
  const ansField = swap ? config.ask : config.answer;

  const row = rows[Math.floor(rng() * rows.length)];
  const answer = row[ansField.key];
  const promptValue = row[askField.key];

  let options: string[] = [];
  if (config.mode === "choice") {
    const distractors = shuffle(
      distinctValues(rows, ansField.key).filter((v) => v !== answer),
      rng
    ).slice(0, 3);
    options = shuffle([answer, ...distractors], rng);
  }

  const detail = (config.detailKeys ?? [])
    .map((k) => row[k])
    .filter(Boolean)
    .join(" · ");

  return {
    deckId: config.id,
    mode: config.mode,
    promptValue,
    askLabel: askField.label,
    answerLabel: ansField.label,
    answer,
    acceptable:
      config.mode === "type" ? acceptableAnswers(answer, config.accept) : [],
    options,
    detail,
  };
}

/** Grade a typed answer (type mode) or a chosen option (choice mode). */
export function gradeRecall(question: RecallQuestion, input: string): boolean {
  if (question.mode === "type") {
    const norm = normalizeAnswer(input);
    return norm !== "" && question.acceptable.includes(norm);
  }
  return normalizeAnswer(input) === normalizeAnswer(question.answer);
}
