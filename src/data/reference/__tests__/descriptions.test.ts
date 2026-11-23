import { describe, expect, it } from "vitest";
import { referenceRegistry } from "..";

/**
 * Under a reference table's title the Reference page prints the table's
 * description. Each was a fragment ("Common ports and their associated
 * protocols, services, and transport layers."), and a few said what cannot be
 * shown ("tested on", "the official CompTIA 7-step", "the single most-tested
 * block"). Each is now one complete sentence that says what the table holds
 * and which exam it is for, and nothing about what the exam asks.
 *
 * The column headings are not read here. They are still in title case and
 * some join two words with a slash; the Recall decks that are built from a
 * table take their question words from them, so changing a heading changes
 * how a question is asked.
 */
const TABLES = Object.entries(referenceRegistry).flatMap(([cert, tables]) =>
  tables.map((table) => [cert, table.id, table.description, table.columnHeaders.map((column) => column.label)] as const)
);

/** How each exam is named in its tables' descriptions. */
const EXAM: Record<string, string> = {
  "security-plus-sy0-701": "for the Security+ SY0-701 exam",
  "network-plus-n10-009": "for the Network+ N10-009 exam",
  "a-plus-core1-220-1201": "for the CompTIA A+ 220-1201 exam",
  "a-plus-core2-220-1202": "for the CompTIA A+ 220-1202 exam",
};

/** "is not" and "it is" closed up. */
const CONTRACTION = /\b(?:[A-Za-z]+n't|(?:[Ii]t|[Tt]hat|[Tt]here)'s|[A-Za-z]+'(?:re|ve|ll|d|m))\b/;

describe("the description under a reference table's title", () => {
  it("is read for every table of every exam", () => {
    expect(Object.keys(referenceRegistry).sort()).toEqual(Object.keys(EXAM).sort());
    expect(TABLES.length).toBeGreaterThanOrEqual(24);
  });

  it.each(TABLES)("%s / %s: is one complete sentence that says what the table holds", (cert, _id, description) => {
    // A subject and a verb, where there was a noun phrase.
    expect(description).toMatch(/^This (?:table|chart) (?:lists|sets out|compares|gives) [a-zA-Z]/);
    expect(description).toMatch(/[a-z0-9]\.$/);
    expect(description.split(/(?<=[.!?])\s+/), description).toHaveLength(1);
    // Plain characters only: no dash, arrow, middle dot or curly quote.
    expect([...description].filter((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) > 126)).toEqual([]);
    // A colon or a semicolon joins a label to a fragment; a sentence uses a verb.
    expect(description).not.toMatch(/[:;&!()]/);
    expect(description).not.toMatch(/\.\.\.|\be\.g\.|\bi\.e\.|\betc\b/);
    expect(description).not.toMatch(CONTRACTION);
    expect(description, description).not.toMatch(/\s{2,}|^\s|\s$/);
    // Short enough to stand beside the button that opens the table in Recall.
    expect(description.split(/\s+/).length, description).toBeLessThanOrEqual(34);
    // It names the exam the table is for.
    expect(description).toContain(EXAM[cert]);
  });

  it.each(TABLES)("%s / %s: says nothing about what the exam asks", (_cert, _id, description) => {
    // What CompTIA tests, and how often, is not published. The table is for the exam; it is not the exam's list.
    expect(description).not.toMatch(/\btested\b|\bmost-tested\b|\bofficial\b|\bon the (?:\S+ ){0,4}exam\b/i);
    // A count of rows or steps in a sentence goes stale when a row is added.
    expect(description).not.toMatch(/\b\d+-(?:step|layer)\b/);
  });

  it("gives every table of an exam a description of its own", () => {
    for (const cert of Object.keys(referenceRegistry)) {
      const descriptions = referenceRegistry[cert].map((table) => table.description);
      expect(new Set(descriptions).size, cert).toBe(descriptions.length);
    }
  });
});
