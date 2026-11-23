import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pbqRegistry } from "@/data/pbq";
import { FREE_LAB_COUNT, freeLabs, LABS_WITHOUT_ACCOUNT } from "@/core/path/free-labs";
import { EXAMS_WITH_FREE_LABS, PBQ_EXAMPLE_PAGES } from "../cert-pages";

const root = join(__dirname, "../../../..");

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return e.name === "__tests__" || e.name === "node_modules" ? [] : files(p);
    return /\.(tsx?|txt)$/.test(e.name) ? [p] : [];
  });
}

describe("the free PBQs in public copy", () => {
  it("gives every PBQ page the number its title promises", () => {
    for (const page of PBQ_EXAMPLE_PAGES) {
      expect(freeLabs(pbqRegistry[page.certSlug] ?? [])).toHaveLength(FREE_LAB_COUNT);
      // Sentence case, like every title on the site, and a space before the exam's name.
      expect(page.metaTitle).toMatch(new RegExp(`^${FREE_LAB_COUNT} free interactive \\S.* PBQs \\(`));
    }
  });

  it(`says ${FREE_LAB_COUNT} wherever a page or llms.txt states how many PBQs are free`, () => {
    // "12 free interactive Security+ SY0-701 PBQs", "12 PBQs per exam"; not the 701 in "SY0-701 PBQs".
    const counts = /(?<![\w-])(?<!Core )(\d+) (?:free (?:interactive )?(?:\S+ ){0,4}PBQs|interactive PBQs|PBQs per (?:exam|core))\b/g;
    const claims: string[] = [];
    for (const file of [...files(join(root, "src")), join(root, "public/llms.txt")]) {
      for (const m of readFileSync(file, "utf8").matchAll(counts)) claims.push(`${m[1]} in ${file}`);
    }
    expect(claims.length).toBeGreaterThan(10);
    expect(claims.filter((c) => !c.startsWith(`${FREE_LAB_COUNT} in `))).toEqual([]);
  });

  it("says the same number wherever a sentence states how many of them need no account", () => {
    // The chooser, the page's summary and the help page take the figure from
    // LABS_WITHOUT_ACCOUNT. A sentence spells it as a word, which no constant
    // can type for it, so every such sentence is read here.
    const word = ["zero", "one", "two", "three", "four", "five"][LABS_WITHOUT_ACCOUNT];
    expect(word).toBe("three");
    // A count, as a word or a figure: "the first three need no account", "three of
    // them with no account", "three hands-on labs need no account".
    const n = "(one|two|three|four|five|six|seven|eight|nine|ten|\\d+)";
    const stated = new RegExp(
      `\\bfirst ${n}(?: hands-on labs| labs)? (?:need no account|with no account|without an account|do not require an account)|\\b${n} of them with no account|\\b${n} hands-on labs need no account`,
      "gi"
    );
    const claims: string[] = [];
    for (const file of [...files(join(root, "src")), join(root, "public/llms.txt")]) {
      // A sentence in a page's source can run over two lines.
      const text = readFileSync(file, "utf8").replace(/\s+/g, " ");
      for (const m of text.matchAll(stated)) claims.push(`${(m[1] ?? m[2] ?? m[3]).toLowerCase()} in ${file}`);
    }
    expect(claims.length).toBeGreaterThan(10);
    expect(claims.filter((c) => !c.startsWith(`${word} in `))).toEqual([]);
    // The comparisons state both figures in one sentence, the total as a figure.
    const comparisons = readFileSync(join(root, "src/lib/seo/comparison-pages.ts"), "utf8");
    expect(comparisons).toContain(`${word} hands-on labs need no account`);
    expect(comparisons.match(/opens (\d+) labs in all/)?.[1]).toBe(String(FREE_LAB_COUNT));
  });

  it("names the exams that have free labs, and Security+ SY0-801 is not one of them", () => {
    // SY0-801 has labs on its study path and no public page of labs, so none of
    // its labs is free. A sentence about the free labs names these exams.
    expect(EXAMS_WITH_FREE_LABS).toBe("Security+ SY0-701, Network+, A+ Core 1 and A+ Core 2");
    expect(PBQ_EXAMPLE_PAGES.map((p) => p.certSlug)).not.toContain("security-plus-sy0-801");
    expect(pbqRegistry["security-plus-sy0-801"].length).toBeGreaterThan(0);
    // No page of this package's says "for each exam" of the free labs.
    const pages = ["pricing", "about", "educators", "help"].map((name) =>
      readFileSync(join(root, "src/app/(marketing)", name, "page.tsx"), "utf8").replace(/\s+/g, " ")
    );
    for (const source of pages) {
      expect(source).not.toMatch(/labs(?: \(PBQs\))? for each exam|free for each exam|For each exam, \{FREE_LAB_COUNT\}|PBQ page for each exam/);
      expect(source).toContain("EXAMS_WITH_FREE_LABS");
    }
  });
});
