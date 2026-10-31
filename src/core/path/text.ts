/**
 * Turning bank explanations into the path's two layers: a one-line takeaway
 * shown right after answering, and the rest folded behind "Why, in full".
 */

/**
 * Some stored explanations lost a dash or apostrophe to a bad encoding and
 * carry U+FFFD instead. Spaced on both sides it was a dash; inside a word, an
 * apostrophe.
 */
export function repairText(text: string): string {
  return text
    .replace(/\s�\s/g, " — ")
    .replace(/(\w)�(\w)/g, "$1’$2")
    .replace(/�/g, "—");
}

/** "Why B is correct:" — bank explanations open by naming the option letter. */
const LEAD = /^\s*why\s+(?:option\s+)?[a-d]\s+is\s+(?:the\s+)?correct(?:\s+answer)?\s*[:.\-—]\s*/i;

/** Sentence breaks: end punctuation, then whitespace, then a capital or digit. */
const SENTENCE = /(?<=[.!?])\s+(?=[A-Z0-9“"(])/;

export function splitExplanation(explanation: string): { takeaway: string; rest: string } {
  const text = repairText(explanation).replace(LEAD, "").trim();
  if (!text) return { takeaway: "", rest: "" };
  const [first, ...more] = text.split(SENTENCE);
  return { takeaway: first.trim(), rest: more.join(" ").trim() };
}

/**
 * Whether an explanation (after its "Why B is correct:" lead is dropped) still
 * names options by letter — "Option A describes…". Those questions keep their
 * stored option order; every other bank question is shuffled, because the
 * stored order puts the answer at B far more often than chance.
 */
const LETTER_REF =
  /\b(?:[Oo]ption|[Aa]nswer|[Cc]hoice)\s+[A-D]\b|\(\s*[A-D]\s*\)|\b[Ww]hy\s+[A-D]\s+is\b|\b[A-D]\s+is\s+(?:wrong|incorrect)\b/;

export function mentionsOptionLetter(text: string): boolean {
  return LETTER_REF.test(text);
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}
