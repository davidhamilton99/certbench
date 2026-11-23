import { describe, expect, it } from "vitest";
import { referenceRegistry } from "..";
import { getRecallDecks } from "@/data/recall";
import { recallToRep } from "@/lib/path/fact-reps";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import type { Rep } from "@/core/path/types";

/**
 * A reference table's column headings are printed over its columns, and the
 * Recall decks built from a table take words from them: the "Which ...?" of a
 * question, and the name of a figure in the sentence after an answer. Those
 * words are lowered before they are used, so the case a heading is written in
 * changes no question, no answer and no question's id. The headings were in
 * title case and are now in sentence case; this holds that the change was
 * safe, and that a heading's case can never come to matter unnoticed.
 *
 * A heading's words are another matter: rewording one ("Service / use" into
 * "Service or use") can change how a question is asked, so the slashes stay.
 */

/** Every word capitalized, as the headings were written before. */
const titleCase = (label: string) => label.replace(/(^|[\s(/-])([a-z])/g, (_, before: string, letter: string) => before + letter.toUpperCase());

/** A fixed draw, so that two builds of a deck can be asked the same questions. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The exam's Recall decks, built from its tables with each heading recased. */
function decksWith(cert: string, recase: (label: string) => string): ResolvedDeck[] {
  const tables = referenceRegistry[cert];
  const saved = tables.map((t) => t.columnHeaders);
  try {
    for (const t of tables) t.columnHeaders = t.columnHeaders.map((c) => ({ ...c, label: recase(c.label) }));
    return getRecallDecks(cert);
  } finally {
    tables.forEach((t, i) => {
      t.columnHeaders = saved[i];
    });
  }
}

/** Every question each deck asks, with each item drawn several times, as a choice and (where it can be) typed. */
function questions(decks: ResolvedDeck[]): Rep[] {
  return decks.flatMap((deck) => {
    const items = [...new Set(deck.rows.map((r) => r[deck.config.ask.key]).filter(Boolean))];
    return items.flatMap((item, i) =>
      [1, 2, 3].flatMap((draw) =>
        (deck.typeable ? [false, true] : [false]).map((typed) =>
          recallToRep(deck, item, "objective", seeded(i * 7 + draw), typed)
        )
      )
    );
  });
}

const CERTS = Object.keys(referenceRegistry);

describe.each(CERTS)("%s: the case of a reference table's column headings", (cert) => {
  it("changes no Recall deck, no question, no answer and no id", () => {
    const asWritten = decksWith(cert, (label) => label);
    const inTitleCase = decksWith(cert, titleCase);
    expect(asWritten.length).toBeGreaterThan(0);
    expect(inTitleCase.map((d) => d.config)).toEqual(asWritten.map((d) => d.config));
    const before = questions(inTitleCase);
    const after = questions(asWritten);
    expect(after.length).toBeGreaterThan(0);
    expect(after).toEqual(before);
  });
});

describe("the column headings of the reference tables", () => {
  const HEADINGS = Object.values(referenceRegistry)
    .flat()
    .flatMap((t) => t.columnHeaders.map((c) => ({ table: t.id, label: c.label })));

  it("are read for every table", () => {
    expect(HEADINGS.length).toBeGreaterThan(90);
  });

  it("are in sentence case: a capital to begin, and after it only acronyms are in capitals", () => {
    const offenders = HEADINGS.filter(({ label }) =>
      label
        .split(/\s+/)
        .slice(1)
        // Each word after the first, on either side of a slash: lower case, or an acronym ("CIDR").
        .some((word) => /^[A-Z][a-z]/.test(word))
    ).map(({ table, label }) => `${table}: ${label}`);
    expect(offenders).toEqual([]);
    for (const { label } of HEADINGS) expect(label[0], label).toMatch(/[A-Z]/);
  });
});
