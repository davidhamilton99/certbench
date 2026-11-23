import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

/**
 * The public frame and the reading pages are set by a few rules: the type
 * scale, three corner radii, one left edge, one colour for what can be
 * pressed, an arrow only on a button that starts or continues the study path,
 * and a price worded in one place. This reads the files those pages are built
 * from and holds them to the rules, so a later edit cannot quietly leave one.
 */
const ROOT = process.cwd();

const OWNED = [
  "src/components/marketing/MarketingHeader.tsx",
  "src/components/marketing/HeaderAccountLinks.tsx",
  "src/components/marketing/Footer.tsx",
  "src/components/marketing/IntentLink.tsx",
  "src/components/marketing/lander",
  "src/components/marketing/ExamVersionNote.tsx",
  "src/components/marketing/FaqSection.tsx",
  "src/components/marketing/PathCard.tsx",
  "src/components/marketing/RelatedLinks.tsx",
  "src/components/marketing/ReferenceFold.tsx",
  "src/components/marketing/Testimonials.tsx",
  "src/components/marketing/RoundupLanding.tsx",
  "src/components/marketing/ObjectiveLanding.tsx",
  "src/app/(marketing)/about",
  "src/app/(marketing)/educators",
  "src/app/(marketing)/help",
  "src/app/(marketing)/compare",
  "src/app/(marketing)/best-a-plus-practice-tests",
  "src/app/(marketing)/best-network-plus-practice-tests",
  "src/app/(marketing)/best-security-plus-practice-tests",
  "src/app/(marketing)/objectives",
  "src/app/(marketing)/security-plus-sy0-801",
  "src/app/(marketing)/security-plus-sy0-801-vs-sy0-701",
  "src/app/(marketing)/security-plus-sy0-801-ai-practice-questions",
];

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

interface Source {
  rel: string;
  text: string;
  /** Every string in the file, cooked: class lists and words alike. Comments are not among them. */
  strings: { line: number; text: string }[];
  /** The unprefixed `text-*` classes handed to each `cn()` call. */
  merged: { line: number; classes: string[] }[];
}

function read(path: string): Source {
  const text = readFileSync(path, "utf8");
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lineOf = (node: ts.Node) => file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const strings: Source["strings"] = [];
  const merged: Source["merged"] = [];

  const literals = (node: ts.Node, out: string[]) => {
    if (ts.isStringLiteralLike(node)) out.push(node.text);
    else if (ts.isTemplateExpression(node)) {
      out.push(node.head.text);
      for (const span of node.templateSpans) out.push(span.literal.text);
    } else ts.forEachChild(node, (child) => literals(child, out));
  };

  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      strings.push({ line: lineOf(node), text: node.text });
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "cn") {
      const parts: string[] = [];
      for (const arg of node.arguments) literals(arg, parts);
      const classes = parts
        .join(" ")
        .split(/\s+/)
        .filter((c) => /^text-/.test(c));
      if (classes.length > 1) merged.push({ line: lineOf(node), classes });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { rel: relative(ROOT, path).replace(/\\/g, "/"), text, strings, merged };
}

const SOURCES = OWNED.flatMap((path) => files(join(ROOT, path))).map(read);

/** Every string in the package that matches, as "file:line: text". */
function found(pattern: RegExp): string[] {
  return SOURCES.flatMap(({ rel, strings }) =>
    strings.filter(({ text }) => pattern.test(text)).map(({ line, text }) => `${rel}:${line}: ${text.replace(/\s+/g, " ").trim().slice(0, 100)}`)
  );
}

describe("the public frame and the reading pages", () => {
  it("reads every file of the package", () => {
    for (const path of OWNED) expect(existsSync(join(ROOT, path)), path).toBe(true);
    expect(SOURCES.length).toBeGreaterThanOrEqual(28);
  });

  it("sets type on the scale: no size, leading or tracking of a file's own", () => {
    expect(found(/(?:^|\s)(?:[a-z-]+:)*text-\[/)).toEqual([]);
    expect(found(/(?:^|\s)(?:[a-z-]+:)*(?:leading|tracking)-/)).toEqual([]);
    // `text-xl` is the lede's size under a page title from the sm width, and nothing else is.
    expect(found(/(?:^|\s)(?:[a-z-]+:)*text-(?:xs|sm|base|lg|2xl|3xl|4xl|5xl)(?:\s|$)/)).toEqual([]);
    // A heading has a class of the scale: the display face is for a figure, and these pages have none.
    expect(found(/\bcb-display\b/)).toEqual([]);
  });

  it("uses the three radii, and squares the end of every bar", () => {
    expect(found(/\brounded-(?:[a-z]{1,2}-)?(?:xl|2xl|3xl|full)\b/)).toEqual([]);
  });

  it("keeps to one left edge: nothing is centred", () => {
    expect(found(/\b(?:text-center|justify-items-center|place-items-center)\b/)).toEqual([]);
    // A page gets its ground and its frame from the layout.
    expect(found(/\baurora-bg\b/)).toEqual([]);
    expect(SOURCES.filter(({ text }) => /<main\b|<Footer\b|<MarketingHeader\b/.test(text)).map(({ rel }) => rel)).toEqual([]);
  });

  it("appends an arrow only through LinkArrow, on a button that starts or continues the study path", () => {
    const direct = SOURCES.filter(({ text }) => /\bArrow(?:Up)?Right\b/.test(text)).map(({ rel }) => rel);
    expect(direct).toEqual([]);
    const withArrow = SOURCES.filter(({ text }) => /<LinkArrow\b/.test(text)).map(({ rel }) => rel);
    expect(withArrow.sort()).toEqual([
      "src/app/(marketing)/about/page.tsx",
      "src/app/(marketing)/security-plus-sy0-801-vs-sy0-701/page.tsx",
      "src/components/marketing/PathCard.tsx",
    ]);
  });

  it("moves only what answers a press, and draws focus with the page's one ring", () => {
    expect(found(/\btransition-all\b/)).toEqual([]);
    expect(found(/\boutline-none\b|focus-visible:ring|focus:outline|focus:ring/)).toEqual([]);
  });

  it("colours with tokens: no hex value and no palette colour", () => {
    expect(found(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/).filter((line) => !/href|#class-access|#\$\{/.test(line))).toEqual([]);
    expect(
      found(/\b(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|pink|rose)-\d{2,3}\b/)
    ).toEqual([]);
  });

  it("types no price by hand: the price is worded once, in src/lib/pricing/terms.ts", () => {
    expect(found(/\$\d/)).toEqual([]);
  });

  it("underlines a link in a sentence with the one link class", () => {
    expect(found(/\bhover:underline\b/).filter((line) => !line.startsWith("src/components/marketing/Footer.tsx"))).toEqual([]);
    expect(found(/text-primary underline/)).toEqual([]);
  });

  it("hands the class merger no size and colour that it would take for the same thing", () => {
    // tailwind-merge reads a `text-*` class it does not know as a colour, so a
    // size of the site's own beside a colour can be thrown away: the header's
    // links, the version note and the outline rows were all drawn a size too
    // large that way. Whatever the merger knows, no cn() call here passes one
    // of the four sizes together with another `text-*` class that it would
    // merge with it.
    const SIZES = ["text-note", "text-small", "text-body", "text-lede"];
    const lost = SOURCES.flatMap(({ rel, merged }) =>
      merged.flatMap(({ line, classes }) => {
        const sizes = classes.filter((c) => SIZES.includes(c));
        const others = classes.filter((c) => !SIZES.includes(c));
        return sizes.flatMap((size) =>
          others
            .filter((other) => cn(`${size} ${other}`) !== `${size} ${other}` || cn(`${other} ${size}`) !== `${other} ${size}`)
            .map((other) => `${rel}:${line}: cn() cannot hold ${size} and ${other} together`)
        );
      })
    );
    expect(lost).toEqual([]);
  });
});
