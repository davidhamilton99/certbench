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
  /**
   * Column whose value groups confusable distractors: options are drawn from
   * the answer's own category first (e.g. other crypto acronyms), so the right
   * answer can't be spotted by elimination.
   */
  distractorGroupKey?: string;
  /** Extra columns surfaced on reveal, for the "oh right" context. */
  detailKeys?: string[];
  /**
   * Which rows to drill, when a table mixes kinds of row: a speed deck skips
   * RAID levels, whose "max speed" is a description. The rest stay in the
   * reference table, just not in the drill.
   */
  only?: (row: Record<string, string>) => boolean;
  /**
   * How the deck explains an answer in sentences. A deck without it keeps the
   * note form ("SSH: 22 (Secure Shell)").
   */
  explain?: RecallExplanation;
}

/**
 * A deck's explanation of an answer, in sentences. The question card prints it
 * straight after its verdict ("Correct." or "Incorrect. The correct answer is
 * 22."), so it has to read on from either one: "SSH uses port 22." Plain data,
 * like the rest of a deck's configuration, so it crosses from a server page to
 * a client component with the deck.
 */
export interface RecallExplanation {
  /**
   * The sentence, or two, that a row gets. A column's key in braces is replaced
   * by the row's cell as the table has it: "{protocol} uses port {port}." A
   * cell that opens with a capital can be set inside a sentence:
   * "{purpose:lowerFirst}" gives "list directory contents" for "List directory
   * contents".
   */
  template: string;
  /**
   * Rows whose cells do not fit the template as they stand (a pair of ports
   * written "67/68", a speed written "Up to 40 Gbps (TB4)", a purpose with a
   * colon in it). Each has sentences of its own here, under its cell in the
   * `by` column, and they are filled like the template. The reference table
   * keeps its cells as they are, for where it is shown as a table.
   */
  rows?: Record<string, string>;
  /**
   * The column that names a row in `rows`: one whose cells differ from row to
   * row. Left out, it is the cue column.
   */
  by?: string;
}

/** A data rate like "1 Gbps", "100+ Gbps" or "~550 MB/s", for decks that ask a speed. */
export function isDataRate(value: string | undefined): boolean {
  return !!value && /\d\+?\s*(?:[KMGT]bps|[KMGT]B\/s)/i.test(value);
}

/**
 * A built deck's config: plain data, with no `only`. Recall and the acronym
 * quiz hand decks from a server page to a client component, and a function
 * can't cross that line (the page fails to render), so `only` is applied in
 * {@link buildDeck} and left behind. `never` makes passing it on a type error.
 */
export type ResolvedDeckConfig = Omit<RecallDeckConfig, "only"> & { only?: never };

export interface ResolvedDeck {
  config: ResolvedDeckConfig;
  /** Rows with a real value (not blank, not "N/A") in both drilled columns. */
  rows: Array<Record<string, string>>;
  /** Column labels by key, for naming a bare number in the detail line. */
  labels?: Record<string, string>;
  /** Distinct drillable items (by the cue column) — the deck's mastery total. */
  itemCount: number;
  /** Answers short enough to type — enables the active-recall "type it" mode. */
  typeable: boolean;
}

export interface RecallQuestion {
  deckId: string;
  /** The reference table this deck drills — the mastery bucket key. */
  tableId: string;
  /**
   * Stable identity of the fact being drilled (the cue-column value in the
   * deck's canonical orientation), so mastery counts an item once regardless
   * of which direction it was asked.
   */
  itemId: string;
  mode: RecallMode;
  /** The cue value shown big, e.g. "HTTPS" or "AES". */
  promptValue: string;
  /** Noun for the cue ("protocol") and for the answer ("port"). */
  askLabel: string;
  answerLabel: string;
  /** Canonical answer, for display on reveal. */
  answer: string;
  /**
   * Normalized accepted forms, which grade both typed answers and chosen options.
   * Where the cue names more than one row (RADIUS has a row for its ports and a
   * row for its legacy ports), the forms of every such row are accepted, with
   * those of the row that was dealt first: a typed "1812" is a correct port
   * for RADIUS whichever row the question drew.
   */
  acceptable: string[];
  /** Up to four shuffled options (the answer plus distractors). */
  options: string[];
  /**
   * Context for the reveal: one entry for each detail column that has a value
   * in this row, in the deck's order (none when the deck defines no detail).
   */
  details: string[];
  /**
   * The answer explained in sentences, for a deck that has an explanation
   * template. Left out for every other deck, and for a row whose template
   * names a cell the row does not have.
   */
  explanation?: string;
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
    ...(config.distractorGroupKey ? [config.distractorGroupKey] : []),
    ...(config.detailKeys ?? []),
  ];
  for (const key of touched) {
    if (!columnKeys.has(key)) {
      throw new Error(
        `Recall deck "${config.id}": column "${key}" is not in table "${table.id}"`
      );
    }
  }

  // A placeholder isn't a fact to recall: a pin-out standard has no "max
  // speed", and "N/A" would only ever be a giveaway or a junk distractor.
  const { only, ...settings } = config;
  const rows = table.entries
    .map((e) => e.columns)
    .filter((c) => isValue(c[config.ask.key]) && isValue(c[config.answer.key]))
    .filter((c) => only?.(c) ?? true);

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

  return {
    config: settings,
    rows,
    labels: Object.fromEntries(table.columnHeaders.map((c) => [c.key, c.label])),
    itemCount: distinctValues(rows, config.ask.key).length,
    // Short answers (ports, etc.) can be typed; long ones (definitions) can't.
    typeable: avgLen(rows, config.answer.key) <= 8,
  };
}

/** A real cell value: not blank, not a placeholder like "N/A (analog signal)". */
function isValue(v: string | undefined): boolean {
  const t = v?.trim() ?? "";
  return t !== "" && !/^(n\/a\b|[—–-]+$)/i.test(t);
}

/** "Usable Hosts" → "usable hosts", keeping acronyms ("Default AD" → "default AD"). */
function noun(label: string): string {
  return label
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");
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

  // A low-cardinality attribute column makes a good distractor group (a
  // category), so auto-decks also draw confusable options rather than random.
  const groupKey = detailKeys
    .map((k) => ({ key: k, n: distinctValues(rows, k).length }))
    .filter(
      (c) =>
        c.n >= 2 &&
        c.n <= Math.max(2, Math.floor(rows.length / 2)) &&
        avgLen(rows, c.key) <= 24
    )
    .sort((a, b) => a.n - b.n)[0]?.key;

  return {
    id: `auto-${table.id}`,
    label: table.title,
    blurb: table.description,
    tableId: table.id,
    mode: "choice",
    ask: { key: promptCol.key, label: promptCol.label.toLowerCase() },
    answer: { key: answerCol.key, label: answerCol.label.toLowerCase() },
    bidirectional,
    distractorGroupKey: groupKey,
    detailKeys,
  };
}

/** Whether {@link autoDeckConfig} can produce a drill for this table. */
export function canAutoDrill(table: ReferenceTable): boolean {
  return autoDeckConfig(table) !== null;
}

/** A place in an explanation template: "{port}", or "{purpose:lowerFirst}". */
const PLACE = /\{(\w+)(:lowerFirst)?\}/g;

/**
 * A cell that opens a line in its table, set inside a sentence: "List directory
 * contents" becomes "list directory contents". A first word in capitals ("DNS
 * records") is an acronym and stays as it is.
 */
function lowerFirst(cell: string): string {
  return /^[A-Z][a-z]/.test(cell) ? cell[0].toLowerCase() + cell.slice(1) : cell;
}

const has = (record: object, key: string) => Object.prototype.hasOwnProperty.call(record, key);

/**
 * A row's explanation in sentences: the row's own sentences where the deck has
 * written some, the deck's template otherwise, with every place filled from
 * the row. Null for a deck that has no template, and for a row that lacks a
 * cell its sentence names: the question card then keeps the note form, which
 * is better than a sentence with a hole in it. A test holds every row of every
 * deck that has a template to complete sentences (explanations.test.ts).
 */
export function explainRow(
  config: Pick<RecallDeckConfig, "ask" | "explain">,
  row: Record<string, string>
): string | null {
  const explain = config.explain;
  if (!explain) return null;
  const name = row[explain.by ?? config.ask.key];
  const sentences =
    explain.rows && name !== undefined && has(explain.rows, name) ? explain.rows[name] : explain.template;
  // A brace that is not part of a place is a place written wrongly
  // ("{port:plural}"): it would be printed as it stands.
  let whole = !/[{}]/.test(sentences.replace(PLACE, ""));
  const text = sentences.replace(PLACE, (_place, key: string, inside?: string) => {
    const cell = has(row, key) && isValue(row[key]) ? row[key].trim() : "";
    if (!cell) whole = false;
    return inside ? lowerFirst(cell) : cell;
  });
  return whole ? text : null;
}

/**
 * The other answers to a cue that names more than one row, in the table's
 * order. A cue stands for one row in nearly every deck, and for two where the
 * table has them: RADIUS has a row for its ports and a row for its legacy
 * ports. `cue` and `answer` are the two cells a question showed, whichever way
 * round it was asked, so a card can ask this of the question it holds. Empty
 * when the cue has one row, and when the two cells are not a row of the deck.
 */
export function otherAnswers(deck: ResolvedDeck, cue: string, answer: string): string[] {
  const { ask, answer: recalled, bidirectional } = deck.config;
  const ways = [[ask.key, recalled.key], ...(bidirectional ? [[recalled.key, ask.key]] : [])];
  for (const [cueKey, answerKey] of ways) {
    const sameCue = deck.rows.filter((row) => row[cueKey] === cue);
    if (sameCue.some((row) => row[answerKey] === answer)) {
      return distinctValues(sameCue, answerKey).filter((value) => value !== answer);
    }
  }
  return [];
}

/**
 * What a card says after the explanation of the row it dealt, when its cue
 * names other rows too: which answer the question asked for, and that the
 * other is correct as well. A typed answer from any of the cue's rows is
 * accepted, so without this a learner who types 1812 for RADIUS could be told
 * "Correct." above two sentences about ports 1645 and 1646 and nothing else.
 * Null when the cue has no other answer.
 */
export function otherAnswersSentence(cue: string, answer: string, others: readonly string[]): string | null {
  if (others.length === 0) return null;
  const also =
    others.length === 1
      ? `Another correct answer for ${cue} is ${others[0]}.`
      : `Other correct answers for ${cue} are ${others.slice(0, -1).join(", ")} and ${others[others.length - 1]}.`;
  return `This question asked for ${answer}. ${also}`;
}

/**
 * Generate one question. `rng` defaults to `Math.random` for the live drill.
 * Every question carries both multiple-choice `options` and the accepted typed
 * `acceptable` forms, so the UI can render it either way. Pass `noSwap` (used by
 * typed mode) to always ask in the deck's default direction, and `itemId` to
 * ask about a specific item (a planned round) instead of a random one.
 */
export function generateRecallQuestion(
  deck: ResolvedDeck,
  rng: Rng = Math.random,
  opts?: { noSwap?: boolean; itemId?: string }
): RecallQuestion {
  const { config, rows } = deck;

  // Direction: swap cue/answer for bidirectional decks half the time.
  const swap =
    config.bidirectional === true && !opts?.noSwap && rng() < 0.5;
  const askField = swap ? config.answer : config.ask;
  const ansField = swap ? config.ask : config.answer;

  const candidates = opts?.itemId
    ? rows.filter((r) => r[config.ask.key] === opts.itemId)
    : [];
  const pickFrom = candidates.length > 0 ? candidates : rows;
  const row = pickFrom[Math.floor(rng() * pickFrom.length)];
  const answer = row[ansField.key];
  const promptValue = row[askField.key];

  // A cue can map to more than one row (e.g. two RADIUS ports). Exclude every
  // answer that's valid for THIS cue from the distractors, so exactly one option
  // is ever correct — the question is never ambiguous.
  const alsoValid = new Set(
    rows
      .filter((r) => r[askField.key] === promptValue)
      .map((r) => r[ansField.key])
  );
  // A typed answer has no options to keep apart: an answer from any of the
  // cue's rows is a correct answer to it, and is accepted. The dealt row's
  // forms come first.
  const acceptable = [
    ...new Set([answer, ...alsoValid].flatMap((valid) => acceptableAnswers(valid, config.accept))),
  ];
  const pool = distinctValues(rows, ansField.key).filter((v) => !alsoValid.has(v));
  // Prefer confusable distractors — same category as the answer — so the right
  // option can't be found by elimination ("the only crypto term"). Fall back to
  // the rest when a category has too few other members.
  const groupKey = config.distractorGroupKey;
  let distractors: string[];
  if (groupKey && row[groupKey]) {
    const sameGroup = new Set(
      rows
        .filter((r) => r[groupKey] === row[groupKey])
        .map((r) => r[ansField.key])
    );
    distractors = shuffle(pool.filter((v) => sameGroup.has(v)), rng)
      .concat(shuffle(pool.filter((v) => !sameGroup.has(v)), rng))
      .slice(0, 3);
  } else {
    distractors = shuffle(pool, rng).slice(0, 3);
  }
  const options = shuffle([answer, ...distractors], rng);

  // A bare number means nothing on its own, so it's named. A count reads
  // number first ("2 usable hosts"), an identifier label first ("port 49").
  const details = (config.detailKeys ?? [])
    .map((k) => {
      const v = row[k];
      if (!v || !/^[\d,.]+$/.test(v)) return v;
      const label = noun(deck.labels?.[k] ?? k);
      return /[^sui]s$/i.test(label) ? `${v} ${label}` : `${label} ${v}`;
    })
    .filter((v): v is string => Boolean(v));
  const explanation = explainRow(config, row);

  return {
    deckId: config.id,
    tableId: config.tableId,
    itemId: row[config.ask.key],
    mode: config.mode,
    promptValue,
    askLabel: askField.label,
    answerLabel: ansField.label,
    answer,
    acceptable,
    options,
    details,
    ...(explanation ? { explanation } : {}),
  };
}

/**
 * Grade an answer — a typed string or a chosen option. Both are checked against
 * the same accepted forms, so the caller doesn't need to know the display mode.
 */
export function gradeRecall(question: RecallQuestion, input: string): boolean {
  const norm = normalizeAnswer(input);
  return norm !== "" && question.acceptable.includes(norm);
}
