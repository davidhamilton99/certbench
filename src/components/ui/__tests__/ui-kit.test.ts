import { readdirSync, readFileSync } from "node:fs";
import { join, parse } from "node:path";
import { describe, expect, it } from "vitest";
import { buttonVariants } from "../button";

/**
 * The shared kit holds only what a screen draws. A file that nothing imports
 * is kept in step with the design for nothing (a panel and a badge were, after
 * the last screen that drew them had gone).
 */
const SRC = join(process.cwd(), "src");
const UI = join(SRC, "components", "ui");

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("the shared kit in src/components/ui", () => {
  it("holds no file that nothing imports", () => {
    const text = sources(SRC)
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const kit = readdirSync(UI).filter((name) => /\.tsx?$/.test(name));
    const unused = kit
      .map((name) => parse(name).name)
      .filter((name) => !text.includes(`@/components/ui/${name}"`) && !text.includes(`./${name}"`));
    expect(kit.length).toBeGreaterThan(5);
    expect(unused).toEqual([]);
  });
});

describe("the button", () => {
  it("has one variant for what can be pressed, and no copy of it under another name", () => {
    const source = readFileSync(join(UI, "button.tsx"), "utf8");
    expect(source).not.toMatch(/^\s*accent:/m);
    expect(buttonVariants({})).toContain("bg-primary");
  });

  it("sets its small size in the type scale's note size", () => {
    expect(buttonVariants({ size: "sm" })).toContain("text-note");
    expect(buttonVariants({ size: "sm" })).not.toMatch(/text-\[/);
  });
});
