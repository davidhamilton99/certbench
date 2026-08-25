import type { ReferenceTable } from "@/data/reference/types";

/**
 * Turns any structured reference table into rapid-fire multiple-choice
 * questions — the port-quiz format applied to every lookup table, with zero
 * new content authoring. A question shows one column's value and asks for a
 * different column's value; distractors are drawn from other rows.
 *
 * Everything takes an injectable RNG so the generator is deterministically
 * testable across the whole reference corpus.
 */

export type Rng = () => number;

export interface ReferenceQuestion {
  /** Column shown as the cue, e.g. "Attack". */
  promptLabel: string;
  promptValue: string;
  promptMono: boolean;
  /** Column being asked for, e.g. "Category". */
  answerLabel: string;
  answer: string;
  answerMono: boolean;
  /** 2–4 options including the answer, shuffled. */
  options: string[];
}

/** Longer than this and a column makes poor (unreadable) answer options. */
const MAX_ANSWER_LEN = 64;

function distinctValues(table: ReferenceTable, key: string): string[] {
  const seen = new Set<string>();
  for (const e of table.entries) {
    const v = e.columns[key]?.trim();
    if (v) seen.add(v);
  }
  return [...seen];
}

function avgLen(table: ReferenceTable, key: string): number {
  const vals = table.entries
    .map((e) => e.columns[key]?.trim() ?? "")
    .filter(Boolean);
  if (vals.length === 0) return 0;
  return vals.reduce((s, v) => s + v.length, 0) / vals.length;
}

/** Columns that can serve as the answer: enough distinct values, not too long. */
function answerableColumns(table: ReferenceTable): ReferenceTable["columnHeaders"] {
  const short = table.columnHeaders.filter(
    (c) => distinctValues(table, c.key).length >= 3 && avgLen(table, c.key) <= MAX_ANSWER_LEN
  );
  if (short.length > 0) return short;
  // Fallback: allow long columns rather than fail to drill at all.
  return table.columnHeaders.filter((c) => distinctValues(table, c.key).length >= 3);
}

/** A table can be drilled when it has ≥2 columns and a usable answer column. */
export function canDrillTable(table: ReferenceTable): boolean {
  return table.columnHeaders.length >= 2 && answerableColumns(table).length > 0;
}

function pick<T>(rng: Rng, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function sample<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  const pool = [...arr];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, n);
}

/**
 * Generate one question from a table, or null if it can't be drilled.
 * Direction is randomised for variety (term→attribute and attribute→term).
 */
export function generateReferenceQuestion(
  table: ReferenceTable,
  rng: Rng = Math.random
): ReferenceQuestion | null {
  const answerCols = answerableColumns(table);
  if (table.columnHeaders.length < 2 || answerCols.length === 0) return null;

  const answerCol = pick(rng, answerCols);
  const promptCols = table.columnHeaders.filter((c) => c.key !== answerCol.key);
  if (promptCols.length === 0) return null;
  const promptCol = pick(rng, promptCols);

  // Rows with both cells populated.
  const rows = table.entries.filter(
    (e) => e.columns[promptCol.key]?.trim() && e.columns[answerCol.key]?.trim()
  );
  if (rows.length === 0) return null;
  const row = pick(rng, rows);

  const answer = row.columns[answerCol.key].trim();
  const distractPool = distinctValues(table, answerCol.key).filter((v) => v !== answer);
  const distractors = sample(rng, distractPool, Math.min(3, distractPool.length));
  if (distractors.length === 0) return null;

  const options = [answer, ...distractors];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return {
    promptLabel: promptCol.label,
    promptValue: row.columns[promptCol.key].trim(),
    promptMono: promptCol.mono ?? false,
    answerLabel: answerCol.label,
    answer,
    answerMono: answerCol.mono ?? false,
    options,
  };
}
