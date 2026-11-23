import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pbqRegistry } from "@/data/pbq";
import { FREE_LAB_COUNT, freeLabs } from "@/core/path/free-labs";
import { PBQ_EXAMPLE_PAGES } from "../cert-pages";

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
});
