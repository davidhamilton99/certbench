/**
 * CertBench's house style has no dashes between words. Its own copy is written
 * without them; this is for text it shows but did not write for the occasion
 * (a question from the bank, a lab scenario), where a dash becomes the
 * punctuation a careful editor would have used:
 *
 *   - a pair around an aside becomes commas, or parentheses when the aside
 *     already has commas of its own;
 *   - a single dash becomes a comma where the words after it lean on the words
 *     before ("which", "typically", "allowing"), and a colon where they
 *     explain or list.
 *
 * A dash standing alone as a whole value (an empty table cell) is left as it
 * is, and a long dash between two numbers becomes a range.
 */

/** An em dash or horizontal bar with any spaces around it, or an en dash with a space on each side. */
const DASH = /[ \t]*[\u2014\u2015][ \t]*|[ \t]+\u2013[ \t]+/g;

const HAS_DASH = /[\u2014\u2015]|[ \t]\u2013[ \t]/;

/** Ends a sentence, so a dash on each side of it cannot be a pair. */
const SENTENCE_END = /[.!?]["')\]]?\s|\n/;

/** An aside longer than this is two separate thoughts, not a parenthesis. */
const MAX_ASIDE_WORDS = 22;

/** Words that lean on what came before: a comma joins them, not a colon. */
const LEANS = new Set([
  ...["and", "but", "or", "nor", "so", "yet", "not", "never", "no", "nothing", "none"],
  ...["which", "who", "whose", "whom", "even", "especially", "particularly", "including"],
  ...["typically", "usually", "often", "sometimes", "generally", "commonly", "normally"],
  ...["rather", "instead", "then", "plus", "also", "either", "neither", "both", "regardless"],
  ...["whether", "like", "such", "similarly", "thus", "thereby", "hence", "versus"],
  ...["making", "allowing", "requiring", "meaning", "ensuring", "causing", "giving", "leaving"],
  ...["providing", "preventing", "reducing", "resulting", "verifying", "enabling", "creating"],
  ...["forcing", "exposing", "indicating", "suggesting", "confirming", "eliminating", "limiting"],
  ...["letting", "keeping", "helping", "using", "followed", "based", "e.g", "i.e", "eg", "ie"],
  ...["namely", "specifically", "ideally", "ultimately", "effectively", "essentially"],
]);

/**
 * Words that lean on what came before when they finish the sentence ("because it
 * is encrypted."), but open a clause of their own when a comma follows ("when
 * worn, it lets two sheets through."): a comma for the first, a colon for the second.
 */
const LEANS_UNLESS_CLAUSE = new Set([
  ...["when", "while", "whereas", "where", "because", "since", "although", "though", "unless"],
  ...["until", "if", "as", "once", "in", "on", "at", "by", "from", "to", "of", "via", "through"],
  ...["after", "before", "during", "between", "across", "within", "per", "despite", "for", "with"],
  ...["without"],
]);

/** True when the words after a dash lean on the words before it. */
function leans(after: string): boolean {
  const word = firstWord(after);
  if (LEANS.has(word)) return true;
  if (!LEANS_UNLESS_CLAUSE.has(word)) return false;
  const restOfSentence = after.split(SENTENCE_END)[0];
  return !restOfSentence.includes(",");
}

/** The first word of a run of text, lower-cased, without its quotes or closing full stop. */
const firstWord = (s: string) =>
  (s.match(/^[("'\u201c\u2018]*([A-Za-z]+(?:\.[A-Za-z]+)*)/)?.[1] ?? "").toLowerCase();

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Joins the text on each side of one dash. */
function joinSingle(before: string, after: string): string {
  // A dash opening or closing a line was a bullet or a flourish: it goes, and nothing replaces it.
  if (/(^|\n)[ \t]*$/.test(before) || /^[ \t]*(\n|$)/.test(after)) return `${before}${after}`;
  // A range between two bare numbers ("10 to 20"), or two measures in the same unit ("1 TB to 20 TB").
  // A number that is part of a name ("MD5", "SHA-256") is not the start of a range.
  if (/(^|[\s(~$<>])\d[\d,.]*$/.test(before) && /^\d/.test(after)) return `${before} to ${after}`;
  const unit = before.match(/(?:^|[\s(])\d[\d,.]*\s?([A-Za-z%]{1,6})$/)?.[1];
  if (unit && new RegExp(`^\\d[\\d,.]*\\s?${unit}(?![A-Za-z])`).test(after)) return `${before} to ${after}`;
  // The words before already end in punctuation that does the joining.
  if (/[,;:(\u2026.!?]$/.test(before)) return `${before} ${after}`;
  return `${before}${leans(after) ? "," : ":"} ${after}`;
}

/** Joins the text around an aside that sat between two dashes. */
function joinPair(before: string, aside: string, after: string): string {
  if (/(^|\n)[ \t]*$/.test(before)) return joinSingle(`${before}${aside}`, after);
  const closed = /^[,.;:!?)]/.test(after) || after.trim() === "";
  if (/[,:]/.test(aside)) return `${before} (${aside})${closed ? "" : " "}${after}`;
  return closed ? `${before}, ${aside}${after}` : `${before}, ${aside}, ${after}`;
}

/**
 * The same text with its dashes between words replaced by commas, colons or
 * parentheses. Text without one comes back unchanged (and identical).
 */
export function plainDashes(text: string): string {
  if (!text || !HAS_DASH.test(text)) return text;
  if (/^\s*[\u2014\u2015\u2013]\s*$/.test(text)) return text;

  // Cut the text at every dash, keeping what lies between them.
  const parts: string[] = [];
  let last = 0;
  for (const m of text.matchAll(DASH)) {
    parts.push(text.slice(last, m.index));
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));

  let out = parts[0];
  let i = 1;
  while (i < parts.length) {
    const here = parts[i];
    const next = parts[i + 1];
    // Two dashes in one sentence, around a short run of words, are a pair.
    const pair =
      next !== undefined &&
      here.trim() !== "" &&
      !SENTENCE_END.test(here) &&
      // A semicolon inside means a list of "term, meaning; term, meaning", not an aside.
      !here.includes(";") &&
      wordCount(here) <= MAX_ASIDE_WORDS &&
      // The sentence carries on after the aside, or ends at once.
      (/^[,.;:!?)]/.test(next) || /^[^.!?\n]*[A-Za-z0-9]/.test(next));
    if (pair) {
      out = joinPair(out, here, next);
      i += 2;
    } else {
      out = joinSingle(out, here);
      i += 1;
    }
  }
  return out;
}

/** {@link plainDashes} over each string of a list. */
export const plainDashesAll = (texts: readonly string[]): string[] => texts.map(plainDashes);
