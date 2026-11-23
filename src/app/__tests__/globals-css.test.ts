import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The site's foundation lives in a few rules of globals.css that no component
 * test renders: the keyboard's ring, the scroll offset under the bar at the
 * top, the bar that lets go on a short screen, and the frames a Windows
 * contrast theme keeps. These tests read the file, so a rule that is deleted
 * or weakened turns a test red.
 */
const CSS = readFileSync(join(process.cwd(), "src", "app", "globals.css"), "utf8");
/** The file without its comments, so a rule named in a comment does not count as present. */
const RULES = CSS.replace(/\/\*[\s\S]*?\*\//g, "");

/** The text between the braces of the first block whose prelude matches `head`, or null. */
function block(source: string, head: RegExp): string | null {
  const match = head.exec(source);
  if (!match) return null;
  const open = source.indexOf("{", match.index + match[0].length - 1);
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}" && --depth === 0) return source.slice(open + 1, i);
  }
  return null;
}

/** Every top-level `@layer` block, as text. */
function layers(source: string): string[] {
  const found: string[] = [];
  const head = /@layer\s+[\w-]+\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = head.exec(source))) {
    const body = block(source.slice(match.index), /@layer\s+[\w-]+\s*\{/);
    if (body) found.push(body);
  }
  return found;
}

describe("the keyboard's ring", () => {
  const base = layers(RULES).find((layer) => /:focus-visible/.test(layer)) ?? "";

  it("is one outline on everything that takes the keyboard, in the pressable ink, outside the control", () => {
    expect(block(base, /(?:^|\n)\s*:focus-visible\s*\{/)).toMatch(
      /outline:\s*2px solid var\(--ring\);\s*outline-offset:\s*2px;/
    );
  });

  it("is left off only what takes the focus to be read: a region, a heading, a result", () => {
    expect(block(base, /\[tabindex="-1"\]:focus-visible\s*\{/)).toMatch(/outline:\s*none/);
    // Nothing else in the stylesheet takes the outline away, except the skip link, which draws its own ring.
    const removed = [...RULES.matchAll(/([^{}]+)\{[^{}]*outline:\s*none[^{}]*\}/g)].map((m) => m[1].trim().split(/\s*,\s*/)).flat();
    expect(removed.sort()).toEqual(['.cb-skip:focus', ".cb-skip:focus-visible", '[tabindex="-1"]:focus-visible']);
  });
});

describe("a screen too short to spare the bar at the top", () => {
  it("lets the bar scroll away with the page instead of covering it", () => {
    expect(block(RULES, /@media\s*\(max-height:\s*480px\)\s*\{/)).toMatch(
      /\.glass-nav\s*\{\s*position:\s*static !important;\s*\}/
    );
  });
});

describe("what the browser scrolls into view", () => {
  it("stops below the bar at the top through one offset, on html", () => {
    expect(block(RULES, /(?:^|\n)\s*html\s*\{/)).toMatch(/scroll-padding-top:\s*5rem/);
  });

  it("adds no second offset of its own to every element with an id, which doubled the gap", () => {
    expect(RULES).not.toMatch(/scroll-margin-top/);
  });
});

describe("a link in running text (.cb-link)", () => {
  const link = block(RULES, /\.cb-link\s*\{/);
  const hover = block(RULES, /\.cb-link:hover\s*\{/);

  it("draws its underline in the link's own colour, which stands at over 3:1 against the page in both themes", () => {
    expect(link).toMatch(/text-decoration:\s*underline/);
    expect(link).toMatch(/text-decoration-color:\s*currentColor/);
    // A faded mix of the link colour drew the line at under 2:1.
    expect(link).not.toMatch(/text-decoration-color:\s*color-mix/);
    expect(link).toMatch(/text-decoration-thickness:\s*from-font/);
  });

  it("answers a pointer by thickening the line, at once", () => {
    expect(hover).toMatch(/text-decoration-thickness:\s*2px/);
    expect(link).not.toMatch(/transition/);
  });
});

/** Every source file under src that is not a test, and not this stylesheet. */
function sources(dir = join(process.cwd(), "src")): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(path);
    return /\.(?:tsx?|mjs|js)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** The file with every `@layer` block taken out: what is left is outside every layer. */
function outsideLayers(source: string): string {
  let rest = source;
  for (;;) {
    const match = /@layer\s+[\w-]+\s*\{/.exec(rest);
    if (!match) return rest;
    const body = block(rest.slice(match.index), /@layer\s+[\w-]+\s*\{/) ?? "";
    const end = match.index + rest.slice(match.index).indexOf("{") + body.length + 2;
    rest = rest.slice(0, match.index) + rest.slice(end);
  }
}

describe("what globals.css declares", () => {
  it("is used: every cb-, rv-, path- and animate- class it styles is written somewhere in the source", () => {
    const declared = [...new Set([...RULES.matchAll(/\.((?:cb|rv|path|animate)-[\w-]+)/g)].map((m) => m[1]))];
    expect(declared.length).toBeGreaterThan(15);
    const text = sources()
      .map((path) => readFileSync(path, "utf8"))
      .join("\n");
    const unused = declared.filter((name) => !new RegExp(`(?<![\\w-])${name}(?![\\w-])`).test(text));
    expect(unused).toEqual([]);
  });

  it("keeps its classes in a layer, so a utility on the same element wins over them", () => {
    // Left outside on purpose: the reduced-motion rule, the short-screen rule and the contrast theme's frames.
    // `.cb-paper` stands beside `:root` in the two blocks of tokens, which declare only custom properties.
    const outside = outsideLayers(RULES).replace(/:root,\s*\.cb-paper\s*\{/, "").replace(/\.dark\s+\.cb-paper\s*\{/, "");
    expect([...outside.matchAll(/\.((?:cb|rv|path)-[\w-]+)/g)].map((m) => m[1])).toEqual([]);
  });

  it("names no token that nothing reads", () => {
    for (const token of [
      "--font-display",
      "--ease-in-out",
      "--text-6xl",
      "--text-7xl",
      "--text-8xl",
      "--sidebar-primary",
      "--sidebar-accent",
      "--sidebar-border",
      "--sidebar-ring",
      "--danger-foreground",
      "--color-danger",
      "--rv-",
    ]) {
      expect(RULES, token).not.toContain(token);
    }
  });

  // A score below the target was drawn in --danger, a second name for the same
  // red, written out once and aliased twice. The band now names --destructive.
  it("holds one red, --destructive, with no second name for it", () => {
    expect(RULES).not.toMatch(/--danger\b/);
    expect(block(RULES, /(?:^|\n):root,\s*\.cb-paper\s*\{/)).toMatch(/--destructive:\s*oklch\(0\.48 0\.16 27\)/);
  });
});

describe("globals.css under a Windows contrast theme", () => {
  const forced = block(RULES, /@media\s*\(forced-colors:\s*active\)\s*\{/);

  it("draws the chosen, pressed, checked, selected and current states as a frame in the theme's highlight colour", () => {
    expect(forced).not.toBeNull();
    for (const state of [
      '[aria-pressed="true"]',
      '[aria-checked="true"]',
      '[aria-selected="true"]',
      ':is(a, button)[aria-current]:not([aria-current="false"])',
      '[data-state="chosen"]',
    ]) {
      expect(forced, state).toContain(state);
    }
    expect(forced).toMatch(/border-color:\s*Highlight/);
    expect(forced).toMatch(/outline:\s*2px solid Highlight/);
    // Inside the control's own edge, so nothing moves and no parent clips it.
    expect(forced).toMatch(/outline-offset:\s*-3px/);
  });

  it("keeps the frame and adds the keyboard's ring on a chosen control that has the focus", () => {
    // Chromium paints the border of every focused control in Highlight, and an
    // element has one outline: a frame that moved outside on focus left a
    // focused chosen control looking like any other focused control.
    const focused = block(forced ?? "", /\):focus-visible\s*\{/) ?? "";
    const double = /outline:\s*(\d+)px double Highlight;\s*outline-offset:\s*(-\d+)px;/.exec(focused);
    expect(double).not.toBeNull();
    const width = Number(double![1]);
    const offset = Number(double![2]);
    // Chromium draws each line of a double outline (width + 1) / 3 pixels wide, rounded down.
    const line = Math.floor((width + 1) / 3);
    // The inner line is the frame, where it stands without the focus: 2px wide, from 3px inside the edge.
    expect(line).toBe(2);
    expect(offset).toBe(-3);
    // The outer line is the ring, where every other control's ring stands: 2px wide, 2px outside the edge.
    expect(width + offset).toBe(2 + 2);
  });

  it("keeps that rule outside every layer, so the utilities that draw the states in colour cannot override it", () => {
    for (const layer of layers(RULES)) expect(layer).not.toContain("forced-colors");
  });
});
