import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The pass guarantee only holds after 30 days on Pro, so a bare "pass
 * guarantee" overpromises. Every file that mentions it must say it with the
 * conditions worded once in guarantee.ts. The Terms of Service is where those
 * conditions live in full.
 */
const SRC = join(process.cwd(), "src");
const EXEMPT = new Set(["lib/pricing/guarantee.ts", "app/(marketing)/terms/page.tsx"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("the pass guarantee", () => {
  it("is never promised without its conditions", () => {
    const bare = sourceFiles(SRC)
      .map((path) => ({ path: relative(SRC, path).replace(/\\/g, "/"), text: readFileSync(path, "utf8") }))
      .filter(({ path }) => !EXEMPT.has(path))
      .filter(({ text }) => /pass guarantee|money[- ]back/i.test(text))
      .filter(({ text }) => !/PASS_GUARANTEE_(?:TERMS|SHORT)\b/.test(text))
      .map(({ path }) => path);
    expect(bare).toEqual([]);
  });
});
