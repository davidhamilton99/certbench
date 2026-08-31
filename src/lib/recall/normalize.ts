/**
 * Answer normalization for the Recall drill's typed mode. Keep this the single
 * source of truth for "do these two strings mean the same answer?" — the drill
 * feels broken the instant a correct answer reads as wrong, so the rules here
 * are deliberately forgiving about the things a hurried typist varies (case,
 * spacing, surrounding punctuation) and strict about everything else.
 */

/** Lowercase, collapse internal whitespace, strip surrounding punctuation. */
export function normalizeAnswer(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // Punctuation that never distinguishes one answer from another. Keeps
    // internal separators like "/" and "-" (they matter for ports).
    .replace(/[.,;:!?'"`’()]/g, "")
    .trim();
}

/**
 * Acceptable normalized forms for a canonical answer.
 *
 * - `exact` — just the answer itself.
 * - `numeric-parts` — for compound port answers ("20/21", "137-139", "161/162"),
 *   also accept each individual number, since "which port is FTP?" → "21" is a
 *   completely correct answer a candidate would type.
 */
export function acceptableAnswers(
  answer: string,
  accept: "exact" | "numeric-parts" = "exact"
): string[] {
  const forms = new Set<string>([normalizeAnswer(answer)]);
  if (accept === "numeric-parts") {
    for (const part of answer.split(/[/,\-]/)) {
      const n = normalizeAnswer(part);
      if (n) forms.add(n);
    }
  }
  return [...forms].filter(Boolean);
}
