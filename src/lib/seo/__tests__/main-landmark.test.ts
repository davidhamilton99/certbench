import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every page has one main region, and the "Skip to main content" link at the
 * top of the document (src/app/layout.tsx) leads to it. The link points at
 * `#main-content`, so a `<main>` without that id is a page where the first
 * thing a keyboard reaches does nothing.
 *
 * The public pages get theirs from one place, src/app/(marketing)/layout.tsx,
 * with the header and the footer. A page under that layout that drew its own
 * would give the document two main regions and two headers.
 */

const SRC = join(process.cwd(), "src");

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      sources(path, out);
    } else if (entry.name.endsWith(".tsx") && !entry.name.endsWith(".test.tsx")) {
      out.push(path);
    }
  }
  return out;
}

const rel = (file: string) => relative(process.cwd(), file).replace(/\\/g, "/");

/** The opening tag starting at `from`, braces and all: `<main className={cn(a, b)}>`. */
function openingTag(source: string, from: number): string {
  let depth = 0;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    else if (ch === ">" && depth === 0) return source.slice(from, i + 1);
  }
  return source.slice(from);
}

function mainTags(): { file: string; tag: string }[] {
  const found: { file: string; tag: string }[] = [];
  for (const file of sources(SRC)) {
    const source = readFileSync(file, "utf8");
    const pattern = /<main\b/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(source))) {
      found.push({ file: rel(file), tag: openingTag(source, match.index) });
    }
  }
  return found;
}

describe("main landmark and skip link", () => {
  const tags = mainTags();

  it("finds the main regions", () => {
    expect(tags.length).toBeGreaterThanOrEqual(6);
  });

  it("gives every <main> the id the skip link points at", () => {
    const missing = tags.filter((t) => !/\bid="main-content"/.test(t.tag)).map((t) => t.file);
    expect(missing).toEqual([]);
  });

  it("lets every <main> take the focus, so the skip link moves it there in every browser", () => {
    const missing = tags.filter((t) => !/tabIndex=\{-1\}/.test(t.tag)).map((t) => t.file);
    expect(missing).toEqual([]);
  });

  it("keeps the skip link as the first thing in the document", () => {
    const layout = readFileSync(join(SRC, "app", "layout.tsx"), "utf8");
    const body = layout.indexOf("<body");
    const skip = layout.indexOf('href="#main-content"');
    expect(skip).toBeGreaterThan(body);
    // Nothing that can take the keyboard comes before it: the only control
    // between <body> and the link's address is the link itself.
    const between = layout.slice(body, skip);
    expect((between.match(/<(a|button|input|select|textarea)\b/g) ?? []).length).toBe(1);
    expect(layout).toContain("Skip to main content");
  });

  it("draws the public frame once, in the (marketing) layout", () => {
    const layout = readFileSync(join(SRC, "app", "(marketing)", "layout.tsx"), "utf8");
    expect(layout).toContain("<MarketingHeader");
    expect(layout).toContain("<Footer");
    expect(layout).toMatch(/<main\b[^>]*id="main-content"/);

    // No page under it, and no part of the page kit, draws a frame of its own.
    const framed = [
      ...sources(join(SRC, "app", "(marketing)")),
      ...sources(join(SRC, "components", "marketing", "lander")),
    ]
      .filter((file) => !rel(file).endsWith("(marketing)/layout.tsx"))
      .filter((file) => /<main\b|<MarketingHeader\b|<Footer\b/.test(readFileSync(file, "utf8")))
      .map(rel);
    expect(framed).toEqual([]);
  });

  it("gives the pages outside the public frame a main region of their own", () => {
    const own = [
      "app/(auth)/layout.tsx",
      "app/not-found.tsx",
      "app/error.tsx",
      "app/global-error.tsx",
      "app/story/page.tsx",
      "app/share/[setId]/page.tsx",
      "app/readiness/[token]/page.tsx",
      "app/(path)/start/page.tsx",
      "components/path/PathApp.tsx",
      "components/workspace/WorkspaceShell.tsx",
    ];
    const missing = own.filter((file) => !/<main\b/.test(readFileSync(join(SRC, ...file.split("/")), "utf8")));
    expect(missing).toEqual([]);
  });
});
