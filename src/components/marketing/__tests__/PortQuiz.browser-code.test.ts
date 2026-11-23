import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The port quiz is a client component: every module it imports as a value, and
 * every module those import, is sent to the browser. The sentences it prints
 * after an answer come from the recall decks and the reference tables, which
 * are worked out on the server and handed over with the list of ports
 * (`explanation` on an entry). So the quiz's own code must reach no deck and
 * no table. It once imported the lookup itself, which put two tables and two
 * decks into the page's browser code to print 35 sentences that the server
 * already knew.
 *
 * This follows the imports from PortQuiz.tsx through the project's own files.
 * An import of types only costs nothing and is not followed.
 */
const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ENTRY = join(SRC, "components/marketing/PortQuiz.tsx");

/** The modules a file imports as values: static imports, re-exports and `import()`. */
function valueImports(path: string): string[] {
  const text = readFileSync(path, "utf8");
  const kind = path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const named = clause?.namedBindings;
      const onlyTypes =
        clause?.isTypeOnly === true ||
        (clause !== undefined &&
          clause.name === undefined &&
          named !== undefined &&
          ts.isNamedImports(named) &&
          named.elements.length > 0 &&
          named.elements.every((element) => element.isTypeOnly));
      if (!onlyTypes) found.push(node.moduleSpecifier.text);
      return;
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      if (!node.isTypeOnly) found.push(node.moduleSpecifier.text);
      return;
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const [target] = node.arguments;
      if (target && ts.isStringLiteralLike(target)) found.push(target.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** The project file a module name stands for; null for a package. */
function resolve(from: string, specifier: string): string | null {
  const base = specifier.startsWith("@/")
    ? join(SRC, specifier.slice(2))
    : specifier.startsWith(".")
      ? join(dirname(from), specifier)
      : null;
  if (!base) return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

/** Every project file the entry reaches through value imports, as paths from the project root. */
function reached(entry: string): string[] {
  const seen = new Set<string>([entry]);
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (!/\.tsx?$/.test(file)) continue;
    for (const specifier of valueImports(file)) {
      const target = resolve(file, specifier);
      if (target && !seen.has(target)) {
        seen.add(target);
        queue.push(target);
      }
    }
  }
  return [...seen].map((file) => relative(ROOT, file).replace(/\\/g, "/")).sort();
}

describe("the port quiz's browser code", () => {
  const files = reached(ENTRY);

  it("follows the quiz's imports through the project", () => {
    expect(files).toContain("src/components/marketing/PortQuiz.tsx");
    // The question maker and the card it is played on are part of it.
    expect(files).toContain("src/lib/tools/port-quiz.ts");
    expect(files).toContain("src/components/marketing/DrillPlayer.tsx");
    expect(files.length).toBeGreaterThan(10);
  });

  it("reaches no recall deck, no reference table and no lookup of either", () => {
    // (src/lib/recall/normalize.ts, which the card uses to mark a typed answer, holds no data.)
    const heavy = files.filter(
      (file) =>
        file.startsWith("src/data/recall/") ||
        file.startsWith("src/data/reference/") ||
        file === "src/lib/recall/port-explanations.ts" ||
        file === "src/lib/recall/recall-deck.ts" ||
        file === "src/lib/tools/port-quiz-data.ts"
    );
    expect(heavy).toEqual([]);
  });

  it("takes only the type of an entry from the module that builds the list", () => {
    const text = readFileSync(ENTRY, "utf8");
    expect(text).toMatch(/import type \{ PortEntry \} from "@\/lib\/tools\/port-quiz-data";/);
    expect(valueImports(ENTRY)).not.toContain("@/lib/tools/port-quiz-data");
    expect(valueImports(ENTRY)).not.toContain("@/lib/recall/port-explanations");
  });
});
