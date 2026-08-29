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

  if (rows.length < 3) {
    throw new Error(
      `Recall deck "${config.id}": only ${rows.length} usable rows (need ≥3)`
    );
  }

  // Choice mode needs at least one distractor (≥2 distinct) in every direction
  // it can ask. Rich tables yield the full four options; sparse ones fewer.
  if (config.mode === "choice") {
    const dirs = config.bidirectional
      ? [config.answer.key, config.ask.key]
      : [config.answer.key];
    for (const key of dirs) {
      const distinct = distinctValues(rows, key).length;
      if (distinct < 2) {
        throw new Error(
          `Recall deck "${config.id}": column "${key}" has ${distinct} distinct values (need ≥2 for choice mode)`
        );
      }
    }
  }

  return { config, rows };
}

/** Longer than this and a column makes poor (unreadable) answer options. */
const MAX_ANSWER_LEN = 64;

function avgLen(rows: ResolvedDeck["rows"], key: string): number {
  const vals = rows.map((r) => r[key]?.trim() ?? "").filter(Boolean);
  if (vals.length === 0) return 0;
  return vals.reduce((sum, v) => sum + v.length, 0) / vals.length;
}

/** A column usable as an answer: enough distinct values, not too long to read. */
function isAnswerable(rows: ResolvedDeck["rows"], key: string): boolean {
  return distinctValues(rows, key).length >= 3 && avgLen(rows, key) <= MAX_ANSWER_LEN;
}

/**
 * Derive a sensible deck for any reference table without a hand-written config
 * — the cue is the table's first (identifying) column and the answer is its
 * most informative short column. Bidirectional when both sides read cleanly as
 * options. Returns null for tables too thin to drill. This is what lets Recall
 * cover every reference table, curated or not.
 */
export function autoDeckConfig(table: ReferenceTable): RecallDeckConfig | null {
  const cols = table.columnHeaders;
  if (cols.length < 2) return null;
  const rows = table.entries.map((e) => e.columns);

  let candidates = cols.filter((c) => isAnswerable(rows, c.key));
  if (candidates.length === 0) {
    // Fall back to any column with enough variety, even if long.
    candidates = cols.filter((c) => distinctValues(rows, c.key).length >= 3);
  }
  if (candidates.length === 0) return null;

  // Answer = the most informative candidate (most distinct values).
  const answerCol = candidates.reduce((best, c) =>
    distinctValues(rows, c.key).length > distinctValues(rows, best.key).length ? c : best
  );
  // Cue = the first column that identifies a row, distinct from the answer.
  const promptCol = cols.find((c) => c.key !== answerCol.key);
  if (!promptCol) return null;

  const bidirectional = isAnswerable(rows, promptCol.key);
  const detailKeys = cols
    .filter((c) => c.key !== answerCol.key && c.key !== promptCol.key)
    .map((c) => c.key);

  return {
    id: `auto-${table.id}`,
    label: table.title,
    blurb: table.description,
    tableId: table.id,
    mode: "choice",
    ask: { key: promptCol.key, label: promptCol.label.toLowerCase() },
    answer: { key: answerCol.key, label: answerCol.label.toLowerCase() },
    bidirectional,
    detailKeys,
  };
}

/** Whether {@link autoDeckConfig} can produce a drill for this table. */
export function canAutoDrill(table: ReferenceTable): boolean {
  return autoDeckConfig(table) !== null;
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
