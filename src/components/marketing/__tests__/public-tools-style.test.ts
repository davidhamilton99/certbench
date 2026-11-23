import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The public tools, drills and labs are held to the same few rules as the
 * rest of the public pages: the type scale, three corner radii, one focus
 * ring, tokens for colour, no arrows on plain links, and nothing that moves
 * every property at once. This reads the files those pages are built from, so
 * a later edit cannot quietly leave a rule. Comments are not read.
 */
const ROOT = process.cwd();

const OWNED = [
  "src/components/marketing/ReadinessCheck.tsx",
  "src/components/marketing/SubnettingDrill.tsx",
  "src/components/marketing/SubnettingDrillLazy.tsx",
  "src/components/marketing/SubnettingPractice.tsx",
  "src/components/marketing/SubnetCalculator.tsx",
  "src/components/marketing/PortQuiz.tsx",
  "src/components/marketing/AcronymDrill.tsx",
  "src/components/marketing/DrillPlayer.tsx",
  "src/components/marketing/DrillRound.tsx",
  "src/components/marketing/useDrillRounds.ts",
  "src/components/marketing/ToolEmailCapture.tsx",
  "src/components/marketing/PbqLab.tsx",
  "src/components/marketing/PbqExampleLanding.tsx",
  "src/app/(marketing)/tools",
  "src/app/(marketing)/readiness-check",
  "src/app/(marketing)/security-plus-pbq-examples",
  "src/app/(marketing)/network-plus-pbq-examples",
  "src/app/(marketing)/a-plus-core-1-pbq-examples",
  "src/app/(marketing)/a-plus-core-2-pbq-examples",
  "src/lib/tools/subnet-mode-names.ts",
  "src/lib/tools/subnet-calculator.ts",
  "src/lib/tools/readiness-estimate.ts",
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
  /** Every string in the file, cooked: class lists and words alike. */
  strings: { line: number; text: string }[];
  /** What the file imports, by module. */
  imports: { module: string; names: string[] }[];
}

function read(path: string): Source {
  const text = readFileSync(path, "utf8");
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const strings: Source["strings"] = [];
  const imports: Source["imports"] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings;
      imports.push({
        module: node.moduleSpecifier.text,
        names: bindings && ts.isNamedImports(bindings) ? bindings.elements.map((e) => e.name.text) : [],
      });
      return;
    }
    if (
      ts.isStringLiteralLike(node) ||
      node.kind === ts.SyntaxKind.TemplateHead ||
      node.kind === ts.SyntaxKind.TemplateMiddle ||
      node.kind === ts.SyntaxKind.TemplateTail ||
      node.kind === ts.SyntaxKind.JsxText
    ) {
      const cooked = node.kind === ts.SyntaxKind.JsxText ? node.getText() : (node as ts.StringLiteralLike).text;
      strings.push({ line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: cooked });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { rel: relative(ROOT, path).replace(/\\/g, "/"), strings, imports };
}

const SOURCES = OWNED.flatMap((p) => files(join(ROOT, p))).map(read);

/** Every string in these files where `rule` finds something, as "file:line: what". */
function offenders(rule: RegExp): string[] {
  return SOURCES.flatMap((s) =>
    s.strings.flatMap(({ line, text }) => {
      const hit = text.match(rule);
      return hit ? [`${s.rel}:${line}: ${hit[0]}`] : [];
    })
  );
}

describe("public tools, drills and labs: the rules of the page", () => {
  it("reads every file of the package", () => {
    expect(SOURCES.length).toBeGreaterThanOrEqual(OWNED.length);
  });

  it("sets text on the type scale, never at a size of its own", () => {
    // An arbitrary size, or the two small Tailwind sizes the scale replaced. (A
    // port in a small tile is the one place a mono code is set at `text-xs`.)
    expect(offenders(/(?<![\w-])text-\[[^\]]*(px|rem|em)\]/)).toEqual([]);
    expect(offenders(/(?<![\w:-])text-sm(?![\w-])/)).toEqual([]);
    expect(offenders(/(?<![\w-])(leading|tracking)-\[/)).toEqual([]);
    expect(offenders(/(?<![\w-])font-display(?![\w-])/)).toEqual([]);
  });

  it("uses the three corner radii and no others", () => {
    expect(offenders(/(?<![\w-])rounded(-[trbl]{1,2})?-(sm|xl|2xl|3xl|full)(?![\w-])/)).toEqual([]);
  });

  it("leaves the focus ring to the page's one outline", () => {
    expect(offenders(/(?<![\w-])(focus-visible:|focus:)?outline-none(?![\w-])/)).toEqual([]);
    expect(offenders(/focus(-visible)?:ring/)).toEqual([]);
  });

  it("moves only what it names: nothing transitions every property", () => {
    expect(offenders(/(?<![\w-])transition-all(?![\w-])/)).toEqual([]);
    expect(offenders(/(?<![\w-])animate-(pulse|bounce|ping|tile|gauge|bar)(?![\w-])/)).toEqual([]);
  });

  it("takes its colours from the tokens", () => {
    // One name for red (`destructive`), and no colour from the Tailwind palette or a hex value.
    expect(offenders(/(?<![\w-])(text|bg|border|ring|fill|stroke)-danger(?![\w-])/)).toEqual([]);
    expect(
      offenders(
        /(?<![\w-])(text|bg|border|ring|fill|stroke|from|to|via)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}(?![\w-])/
      )
    ).toEqual([]);
    expect(offenders(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/)).toEqual([]);
  });

  it("puts an arrow only on a button that starts or continues the study path", () => {
    // The arrow comes from LinkArrow, inside a link to the study path. No file
    // here draws an arrow of its own on a row, a tile or a text link.
    const drawn = SOURCES.flatMap((s) =>
      s.imports
        .filter((i) => i.module === "lucide-react")
        .flatMap((i) => i.names.filter((n) => /^Arrow/.test(n)).map((n) => `${s.rel}: ${n}`))
    );
    expect(drawn).toEqual([]);
  });

  it("never cuts a name short with an ellipsis", () => {
    expect(offenders(/(?<![\w-])(truncate|line-clamp-\d)(?![\w-])/)).toEqual([]);
  });

  it("keeps the schema library and the sign-in client out of a page's first load", () => {
    // Endpoints are named through @/contracts/client, the sign-in client is
    // loaded on first use, and an error class comes from the module that has
    // no schemas. A type may still be imported from a contract module.
    const heavy = SOURCES.flatMap((s) =>
      s.imports
        .filter((i) => ["@/lib/supabase-browser", "@/contracts/common", "zod"].includes(i.module))
        .map((i) => `${s.rel}: ${i.module}`)
    );
    expect(heavy).toEqual([]);
  });
});
