import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PATH_CERTS } from "@/core/path/types";
import { EXAM_CODES } from "@/core/path/versions";
import { EXAM_NAMES } from "@/data/path/titles";

/**
 * The repository is public, so its README and its documents are read as pages
 * of CertBench. These tests hold them to what the code does today and to the
 * house style (docs/HOUSE-STYLE.md), the way house-style.test.ts holds the
 * site's own text.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const README = read("README.md");
const ARCHITECTURE = read("docs/ARCHITECTURE.md");
const HOUSE_STYLE = read("docs/HOUSE-STYLE.md");

// The same characters as src/lib/seo/__tests__/house-style.test.ts.
const EM_DASH = String.fromCharCode(0x2014);
const BAR = String.fromCharCode(0x2015);
const EN_DASH = String.fromCharCode(0x2013);
const MIDDLE_DOT = String.fromCharCode(0xb7);
const BULLET = String.fromCharCode(0x2022);
const DASH = new RegExp(`[${EM_DASH}${BAR}]|\\s${EN_DASH}\\s`);
const DOT_JOINED = new RegExp(`\\s[${MIDDLE_DOT}${BULLET}]\\s`);
/** "don't", "it's", "we're" and the like. A possessive ("CompTIA's") is not one. */
const CONTRACTION = /\b(?:\w+n't|it's|that's|there's|what's|who's|let's|i'm|\w+'re|\w+'ll|\w+'ve|\w+'d)\b/i;

/** The lines of a document that break the house style, with their numbers. */
function styleFaults(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line, k) => ({ line, number: k + 1 }))
    .filter(({ line }) => DASH.test(line) || DOT_JOINED.test(line) || CONTRACTION.test(line))
    .map(({ line, number }) => `${number}: ${line.trim().slice(0, 90)}`);
}

/** The text of one "## " section of a Markdown document, or "" when it is missing. */
function section(text: string, heading: string): string {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line === `## ${heading}`);
  if (start < 0) return "";
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith("## "));
  return (end < 0 ? rest : rest.slice(0, end)).join("\n");
}

/**
 * The code spans of a piece of Markdown: what is written between single
 * backticks. Fenced blocks go first, or their backticks would pair with the
 * spans that follow them.
 */
const codeSpans = (text: string) =>
  [...text.replace(/```[\s\S]*?```/g, " ").matchAll(/`([^`]+)`/g)].map((match) => match[1]);

/** Every source file under src, tests left out: where an identifier that a document names must exist. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sourceFiles(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}
const SOURCE = sourceFiles(join(ROOT, "src"))
  .map((file) => readFileSync(file, "utf8"))
  .join("\n");
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const inSource = (identifier: string) => new RegExp(`\\b${escapeRegExp(identifier)}\\b`).test(SOURCE);

/** The names of the browser's analytics events: the keys of EventMap in src/lib/analytics.ts. */
function eventNames(): Set<string> {
  const analytics = read("src/lib/analytics.ts");
  const start = analytics.indexOf("type EventMap = {");
  const end = analytics.indexOf("\n};", start);
  expect(start).toBeGreaterThan(-1);
  return new Set([...analytics.slice(start, end).matchAll(/^ {2}([a-z_]+):/gm)].map((match) => match[1]));
}

describe("the README", () => {
  it("opens with what CertBench is today, in the words of the site's own description", () => {
    const site = read("src/app/layout.tsx");
    const opening = README.split(/\r?\n/).find((line) => line.trim() !== "" && !line.startsWith("#")) ?? "";
    for (const phrase of ["study program for the CompTIA Security+, Network+ and A+ exams", "topic by topic"]) {
      expect(site, phrase).toContain(phrase);
      expect(opening, phrase).toContain(phrase);
    }
  });

  it("no longer offers the retired AI tool, the daily plan or the old adaptive claims", () => {
    expect(README).not.toMatch(/\bAI\b|daily (study )?plan|adaptive|personali[sz]ed|confidence-penali[sz]ed|SM-2/i);
  });

  it("names every exam that has a study path, with its code", () => {
    for (const cert of PATH_CERTS) expect(README, cert).toContain(`${EXAM_NAMES[cert]} ${EXAM_CODES[cert]}`);
  });

  it("links the house style, and every file it links to exists", () => {
    expect(README).toContain("(docs/HOUSE-STYLE.md)");
    const links = [...README.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]).filter((href) => !/^[a-z]+:/i.test(href));
    expect(links.length).toBeGreaterThan(2);
    for (const href of links) expect(existsSync(join(ROOT, href.split("#")[0])), href).toBe(true);
  });

  it("is written in house style", () => {
    expect(styleFaults(README)).toEqual([]);
  });
});

describe("the architecture document", () => {
  it("does not list the retired AI tool in the server layer", () => {
    expect(ARCHITECTURE).not.toMatch(/\bAI\b/);
  });

  it("says that the app keeps state in localStorage, and names files that do", () => {
    expect(ARCHITECTURE).not.toMatch(/there is no localStorage/i);
    const named = codeSpans(ARCHITECTURE).filter((span) => /^src\/.+\.tsx?$/.test(span) && /local-path|rehearsal-run/.test(span));
    expect(named).toEqual(["src/components/path/local-path.ts", "src/components/path/rehearsal-run.ts"]);
    for (const file of named) expect(read(file), file).toContain("localStorage");
  });
});

describe("the architecture document's account of a build and a rollback", () => {
  const builds = section(ARCHITECTURE, "Builds read the production database");

  it("says that a build reads the production database, that a failed read stops it, and how to roll back", () => {
    expect(builds).toContain("`next build` reads the production database");
    expect(builds).toContain("it throws, and the build stops");
    expect(builds).toContain("the deployment that is live stays live");
    expect(builds).toContain("`vercel rollback <deployment-url-or-id>`");
    // A rollback stops new deployments from going live until one is promoted.
    expect(builds).toContain("`vercel promote <deployment-url-or-id>`");
  });

  it("counts the study path pages that a build makes", () => {
    const count = ["no", "one", "two", "three", "four", "five", "six", "seven"][PATH_CERTS.length];
    expect(builds).toContain(`the ${count} study path pages`);
  });

  it("names files that exist", () => {
    const files = codeSpans(builds).filter((span) => /^(?:src|\.github)\/\S+$/.test(span));
    expect(files).toEqual([
      ".github/workflows/ci.yml",
      "src/server/path/inventory.ts",
      "src/server/path/bank.ts",
      "src/app/sitemap.ts",
    ]);
    for (const file of files) expect(existsSync(join(ROOT, file)), file).toBe(true);
    expect(existsSync(join(ROOT, "src/app/(marketing)/educators/page.tsx"))).toBe(true);
  });

  it("is the section that the README links to", () => {
    // GitHub makes the anchor from the heading: lower case, a hyphen for each space.
    const anchor = "Builds read the production database".toLowerCase().replace(/ /g, "-");
    expect(README).toContain(`(docs/ARCHITECTURE.md#${anchor})`);
  });

  it("is written in house style", () => {
    expect(builds).not.toBe("");
    expect(styleFaults(builds)).toEqual([]);
  });
});

describe("the icon script", () => {
  const script = read("scripts/render-icons.mjs");
  /** The comment at the top of the file, before its first import. */
  const header = script.slice(0, script.indexOf("\nimport "));

  it("says in its header that it needs sharp, where sharp comes from, and how to run it", () => {
    expect(script).toMatch(/^import sharp from "sharp";$/m);
    expect(header).toContain("sharp, which package.json does not list");
    expect(header).toContain("npm install --no-save sharp");
    expect(header).toContain("node scripts/render-icons.mjs");
  });

  it("can count on Next.js to install sharp for as long as package.json does not list it", () => {
    const pkg = JSON.parse(read("package.json"));
    const declared = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
    const lock = JSON.parse(read("package-lock.json"));
    // If Next.js stops bringing sharp in, the script needs it in package.json, and its header must say so.
    const fromNext = lock.packages?.["node_modules/next"]?.optionalDependencies?.sharp;
    expect(declared.sharp ?? fromNext).toBeDefined();
    if (!declared.sharp) expect(lock.packages["node_modules/sharp"]).toBeDefined();
  });
});

describe("the house-style document", () => {
  const glossary = section(HOUSE_STYLE, "Visible words, identifiers and analytics names");
  /** The table's rows, as [visible word, identifiers, analytics names]. */
  const rows = glossary
    .split("\n")
    .filter((line) => line.startsWith("| ") && !line.startsWith("| ---") && !line.startsWith("| Visible word"))
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));

  it("says that analytics names are frozen", () => {
    expect(glossary).toContain("Analytics names are frozen.");
    expect(glossary).toContain("src/lib/analytics.ts");
  });

  it("maps the visible words to the names the code and the analytics kept", () => {
    expect(rows.length).toBeGreaterThan(8);
    const row = (word: string) => rows.find(([visible]) => visible === word);
    expect(row("step")?.[1]).toContain("`stop`");
    expect(row("step")?.[2]).toContain("`path_stop_completed`");
    expect(row("introductory questions")?.[1]).toContain("`warmup`");
    expect(row("practice exam, on the study path")?.[1]).toContain("`rehearsal`");
    expect(row("practice exam, on the study path")?.[2]).toContain("`path_rehearsal_started`");
  });

  it("names only analytics events that exist", () => {
    const events = eventNames();
    expect(events.size).toBeGreaterThan(30);
    const named = rows.flatMap(([, , analytics]) => codeSpans(analytics));
    expect(named.length).toBeGreaterThan(20);
    expect(named.filter((name) => !events.has(name))).toEqual([]);
  });

  it("names only identifiers that exist in the code", () => {
    const named = rows.flatMap(([, identifiers]) => codeSpans(identifiers));
    expect(named.length).toBeGreaterThan(15);
    expect(named.filter((name) => !inSource(name))).toEqual([]);
  });

  it("names files that exist", () => {
    const files = codeSpans(HOUSE_STYLE).filter((span) => /^(?:src|public|docs)\/\S+\.\w+$/.test(span));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) expect(existsSync(join(ROOT, file)), file).toBe(true);
    // The folders it names as well.
    for (const folder of ["src/data/pbq", "src/data/path", "src/lib/pricing"]) {
      expect(existsSync(join(ROOT, folder)), folder).toBe(true);
    }
  });

  it("is written in house style", () => {
    expect(styleFaults(HOUSE_STYLE)).toEqual([]);
  });
});
