import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The signed-in workspace is drawn with the same few parts as the public
 * site: the type scale, three radii, one focus ring, tokens for colour, and
 * sentences for every message. This reads the workspace's own source (the
 * screens, the quiz and recall players, the score report) and fails on the
 * shortcuts that those rules replaced, so that a screen which only members
 * see cannot drift back.
 *
 * The lab players in components/workspace are another package's, with their
 * own tests, and are not read here.
 */

const ROOT = process.cwd();

const FOLDERS = [
  "src/components/workspace",
  "src/components/quiz",
  "src/components/recall",
  "src/components/instrument",
  "src/components/analytics",
  "src/app/(workspace)",
];

/** Shared parts that the lead owns. A score's figure is sized where it is used, which the rule on text sizes allows. */
const SHARED_PARTS = new Set(["src/components/instrument/ScoreLevel.tsx", "src/components/quiz/AnswerOption.tsx"]);

const LAB_PLAYERS = new Set(
  [
    "LabKit.tsx",
    "PbqPlayer.tsx",
    "PbqScenarios.tsx",
    "SimCaseFile.tsx",
    "SimMoves.tsx",
    "SimulationPlayer.tsx",
    "ThreatHuntPlayer.tsx",
    "TopologyDiagram.tsx",
    "TopologyPlayer.tsx",
    "pbq-host.ts",
    "pbq-upsell.tsx",
  ].map((name) => `src/components/workspace/${name}`)
);

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "__tests__") sources(path, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(path);
    }
  }
  return out;
}

const rel = (file: string) => relative(ROOT, file).replace(/\\/g, "/");

/** The code of a file with its comments blanked out, line for line. */
function code(source: string): string[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (block) => block.replace(/[^\n]/g, " "))
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/ .*$/, ""));
}

const FILES = FOLDERS.flatMap((folder) => sources(join(ROOT, ...folder.split("/"))))
  .filter((file) => statSync(file).isFile())
  .filter((file) => !LAB_PLAYERS.has(rel(file)) && !SHARED_PARTS.has(rel(file)));

function offenders(pattern: RegExp, allow: (file: string, line: string) => boolean = () => false): string[] {
  return FILES.flatMap((file) =>
    code(readFileSync(file, "utf8")).flatMap((line, i) =>
      pattern.test(line) && !allow(rel(file), line) ? [`${rel(file)}:${i + 1}: ${line.trim().slice(0, 100)}`] : []
    )
  );
}

const MIDDLE_DOT = String.fromCharCode(0x00b7);
const BULLET = String.fromCharCode(0x2022);
const ELLIPSIS = String.fromCharCode(0x2026);

describe("the workspace's own source", () => {
  it("is read", () => {
    expect(FILES.length).toBeGreaterThanOrEqual(50);
  });

  it("joins no fragments with a dot and trails no sentence off", () => {
    expect(offenders(new RegExp(`[${MIDDLE_DOT}${BULLET}${ELLIPSIS}]`))).toEqual([]);
    // Three full stops after a word, as in a placeholder that trails off. (A spread is not preceded by a word.)
    expect(offenders(/\w\.\.\.(?=["<`\s]|$)/)).toEqual([]);
  });

  it("never shows a machine's own error text", () => {
    expect(offenders(/\b(err|error|e)\.message\b/)).toEqual([]);
    expect(offenders(/Something went wrong/)).toEqual([]);
  });

  it("sizes text from the type scale", () => {
    expect(offenders(/text-\[[0-9.]+(px|rem|em)\]/)).toEqual([]);
    expect(offenders(/\bcb-display\b/)).toEqual([]);
  });

  it("uses the three radii", () => {
    expect(offenders(/rounded-(xl|2xl|3xl|full)\b/)).toEqual([]);
  });

  it("leaves the focus ring to the page: no control removes or redraws it", () => {
    expect(offenders(/focus:outline-none|focus-visible:ring-|focus:ring-/)).toEqual([]);
    // The one exception is a region that takes the focus only to be read.
    expect(offenders(/outline-none/, (_file, line) => /<main\b/.test(line))).toEqual([]);
  });

  it("animates named properties only, and no entrance that starts from nothing", () => {
    expect(offenders(/transition-all/)).toEqual([]);
    expect(offenders(/animate-(bar|gauge|tile|pulse|bounce|ping)|rv-(rise|fill|pop)|path-(rise|pop|drain)/)).toEqual([]);
  });

  it("takes its colours from the tokens", () => {
    expect(
      offenders(
        /\b(text|bg|border|ring|fill|stroke)-(amber|emerald|rose|red|green|blue|yellow|orange|sky|indigo|violet|purple|pink|slate|gray|zinc|neutral|stone|teal|cyan|lime|fuchsia)-\d{2,3}\b/
      )
    ).toEqual([]);
    expect(offenders(/\b(text|bg|border|fill|stroke)-(white|black)\b/)).toEqual([]);
    expect(offenders(/#[0-9a-fA-F]{6}\b/)).toEqual([]);
  });

  it("keeps the trailing arrow for the study path", () => {
    expect(offenders(/\b(ArrowRight|ArrowUpRight)\b/, (_file, line) => /e\.key/.test(line))).toEqual([]);
  });

  it("never merges a type-scale size with a text colour in one cn() call", () => {
    // The class merger (tailwind-merge in src/lib/utils.ts) does not know the
    // type scale's own sizes. It reads `text-note`, `text-small`, `text-body`
    // and `text-lede` as colours, so beside a real text colour in the same
    // call one of the two is silently dropped: the text comes out at the wrong
    // size or in the wrong ink. Until the merger is taught the scale, a size
    // and a colour are never passed through one call.
    const SIZE = /(^|\s)text-(note|small|body|lede)(\s|$)/;
    const COLOUR =
      /(^|\s)text-(foreground|muted-foreground|primary|primary-foreground|card-foreground|popover-foreground|success|destructive|danger|warning|warning-ink|current|inherit)(\/\d+)?(\s|$)/;
    const clashes = FILES.flatMap((file) => {
      const source = code(readFileSync(file, "utf8")).join("\n");
      const found: string[] = [];
      let at = 0;
      while ((at = source.indexOf("cn(", at)) !== -1) {
        let depth = 0;
        let end = at + 2;
        for (; end < source.length; end++) {
          if (source[end] === "(") depth++;
          else if (source[end] === ")" && --depth === 0) break;
        }
        const literals = [...source.slice(at, end + 1).matchAll(/"([^"]*)"/g)].map((m) => m[1]).join(" ");
        if (SIZE.test(literals) && COLOUR.test(literals)) {
          found.push(`${rel(file)}:${source.slice(0, at).split("\n").length}`);
        }
        at = end;
      }
      return found;
    });
    expect(clashes).toEqual([]);
  });

  it("uses the product's words", () => {
    expect(offenders(/\b(Log in|guided path|Warm-up)\b/)).toEqual([]);
    expect(offenders(/\bstreak\b/i, (file) => file.endsWith("contracts/srs.ts"))).toEqual([]);
    expect(offenders(/PBQ lab\b/)).toEqual([]);
  });
});
