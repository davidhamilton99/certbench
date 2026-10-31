/**
 * Rep ids. Every rep a path can ask has a stable id that says where it came
 * from and which objective it belongs to, so progress (stored per id) can be
 * rolled up into the exam map without a lookup:
 *
 *   a|<objective>|<key>             hand-written rep          a|1.1|c3
 *   q|<objective>|<question uuid>   question from the bank    q|2.4|9f1c…
 *   r|<objective>|<deck>|<hash>     recall fact from a deck   r|1.5|net-ports|1a2b3c4d
 *
 * Ids stay within MAX_ITEM_ID (64) so they fit the progress blob's limits.
 */

export type RepSource = "a" | "q" | "r";

export interface ParsedRepId {
  source: RepSource;
  objective: string;
  /** Authored key, question uuid, or `<deck>|<hash>` for recall. */
  key: string;
}

export const authoredRepId = (objective: string, key: string) => `a|${objective}|${key}`;
export const bankRepId = (objective: string, questionId: string) => `q|${objective}|${questionId}`;
export const recallRepId = (objective: string, deckId: string, itemId: string) =>
  `r|${objective}|${deckId}|${shortHash(itemId)}`;

export function parseRepId(id: string): ParsedRepId | null {
  const first = id.indexOf("|");
  const second = id.indexOf("|", first + 1);
  if (first !== 1 || second < 0) return null;
  const source = id[0];
  if (source !== "a" && source !== "q" && source !== "r") return null;
  const objective = id.slice(first + 1, second);
  const key = id.slice(second + 1);
  if (!objective || !key) return null;
  return { source, objective, key };
}

/** The bank question uuid behind a `q|` id, or null. */
export function questionIdOf(id: string): string | null {
  const parsed = parseRepId(id);
  return parsed?.source === "q" ? parsed.key : null;
}

/** 32-bit FNV-1a, as 8 hex chars — short, stable ids for long recall cues. */
export function shortHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
