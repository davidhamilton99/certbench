import { describe, expect, it } from "vitest";
import { pbqRegistry } from "..";

/**
 * The words a lab shows as its own: its title, briefing and questions, the
 * answers to choose from, the bins and items of a sort, the two sides of a
 * match, and its explanations. Like every sentence on the site they write
 * "and" as a word, and "for example" or "such as" where an abbreviation stood.
 *
 * Three kinds of text keep their own notation and are not read here: a line of
 * evidence or of a log, a device's configuration, and the answers a typed
 * question accepts. One name keeps its ampersand wherever it stands: "Read &
 * Execute" is the Windows permission's own name.
 */
const KEEP_AS_WRITTEN = new Set(["evidence", "lines", "currentConfig", "acceptedValues", "logSource", "id"]);

/** Every string a lab shows in its own words, with where it stands. */
function wordsOf(value: unknown, at: string): { at: string; text: string }[] {
  if (typeof value === "string") return [{ at, text: value }];
  if (Array.isArray(value)) return value.flatMap((item, i) => wordsOf(item, `${at}[${i}]`));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, inner]) =>
    KEEP_AS_WRITTEN.has(key) || key.endsWith("_number") || key === "type" ? [] : wordsOf(inner, `${at}.${key}`)
  );
}

const WORDS = Object.entries(pbqRegistry).flatMap(([cert, labs]) => labs.flatMap((lab) => wordsOf(lab, `${cert}/${lab.id}`)));

/** The Windows permission, whose name is written with an ampersand. */
const PERMISSION = "Read & Execute";

describe("the words of a lab", () => {
  it("reads the words of every lab", () => {
    expect(WORDS.length).toBeGreaterThan(1000);
    // The answers and the bins are among them.
    expect(WORDS.some(({ at }) => /\.options\[\d+\]$/.test(at))).toBe(true);
    expect(WORDS.some(({ at }) => /\.zones\[\d+\]$/.test(at))).toBe(true);
  });

  it("writes 'and' as a word, never as an ampersand, except in the name of a Windows permission", () => {
    const offenders = WORDS.filter(({ text }) => /\s&\s/.test(text.split(PERMISSION).join(""))).map(
      ({ at, text }) => `${at}: ${text}`
    );
    expect(offenders).toEqual([]);
  });

  it("says 'for example' or 'such as', never 'e.g.'", () => {
    expect(WORDS.filter(({ text }) => /\be\.g\./i.test(text)).map(({ at, text }) => `${at}: ${text}`)).toEqual([]);
  });

  it("keeps the permission's own name where a lab shows it", () => {
    expect(WORDS.some(({ text }) => text.includes(PERMISSION))).toBe(true);
  });
});
