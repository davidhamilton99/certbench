import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Everything under src/server reads the database, holds a secret or builds
 * questions together with their answers. Each module there begins with
 * `import "server-only"`, which makes a build fail if a client file ever
 * imports it, by any path. Lint forbids the import by its alias; this guard
 * also stops a relative import, and stops the answer key reaching a browser.
 */
const ROOT = process.cwd();
const SERVER = join(ROOT, "src", "server");

function modules(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : modules(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

/** The first statement of a file, after a byte order mark, its comments and its blank lines. */
function firstStatement(source: string): string {
  const text = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
  const withoutComments = text.replace(/^(?:\s*\/\*[\s\S]*?\*\/|\s*\/\/[^\n]*\n)*/, "");
  return withoutComments.trimStart().split(/\r?\n/)[0].trim();
}

describe("the server layer", () => {
  it("has modules to guard", () => {
    expect(modules(SERVER).length).toBeGreaterThan(40);
  });

  it('begins every module with import "server-only"', () => {
    const unguarded = modules(SERVER)
      .filter((path) => firstStatement(readFileSync(path, "utf8")) !== 'import "server-only";')
      .map((path) => relative(ROOT, path).replace(/\\/g, "/"));
    expect(unguarded).toEqual([]);
  });

  it("is never imported by a client component under src/app", () => {
    const app = join(ROOT, "src", "app");
    const offenders = modules(app)
      .filter((path) => {
        const source = readFileSync(path, "utf8");
        return /^\s*["']use client["']/.test(source) && /from\s+["'](?:@\/server\/|(?:\.\.\/)+server\/)/.test(source);
      })
      .map((path) => relative(ROOT, path).replace(/\\/g, "/"));
    expect(offenders).toEqual([]);
  });
});
