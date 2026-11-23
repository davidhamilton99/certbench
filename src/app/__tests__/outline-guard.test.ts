import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * The keyboard's ring is one outline, drawn on everything that takes the focus
 * (src/app/globals.css). Taking it away hides where the keyboard is, so the
 * class that does so, `outline-none` (with or without a variant such as
 * `focus:`), may stand only on an element that takes the focus to be read and
 * cannot be pressed: one with `tabIndex={-1}`, such as a page's main region.
 *
 * This reads every component and page under src/components and src/app, finds
 * each element whose class list holds the class (directly, or through a
 * constant of class names declared in the same file or exported from another),
 * and checks that element. A string that holds the class and reaches no
 * element's class list is reported as well, so the class cannot travel to an
 * element by a road this test does not follow.
 */
const ROOT = process.cwd();
const DIRS = [join(ROOT, "src", "components"), join(ROOT, "src", "app")];
const OUTLINE_NONE = /(?:^|\s)(?:[\w-]+:)*outline-none(?=\s|$)/;

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : files(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

interface Literal {
  id: string;
  text: string;
}

interface Parsed {
  rel: string;
  file: ts.SourceFile;
  /** Constants of the file: their name and every string their value holds. */
  consts: Map<string, Literal[]>;
  /** Every string in the file that holds the class. */
  holding: Literal[];
}

/** Every string literal under a node, with an id that places it in its file. */
function strings(node: ts.Node, rel: string, out: Literal[] = []): Literal[] {
  if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
    out.push({ id: `${rel}:${node.getStart()}`, text: node.text });
  }
  ts.forEachChild(node, (child) => void strings(child, rel, out));
  return out;
}

function parse(path: string): Parsed {
  const rel = relative(ROOT, path).replace(/\\/g, "/");
  const text = readFileSync(path, "utf8");
  const file = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const consts = new Map<string, Literal[]>();
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      consts.set(node.name.text, strings(node.initializer, rel));
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  const holding = strings(file, rel).filter((s) => OUTLINE_NONE.test(s.text));
  return { rel, file, consts, holding };
}

const PARSED = DIRS.flatMap(files).map(parse);
/** Constants exported by one file and imported by another, found by name. */
const EXPORTED = new Map<string, Literal[]>();
for (const { consts } of PARSED) for (const [name, literals] of consts) EXPORTED.set(name, [...(EXPORTED.get(name) ?? []), ...literals]);

/** Walks every element of every file, and returns what breaks the rule and which strings reached an element. */
function survey() {
  const offenders: string[] = [];
  const reached = new Set<string>();
  for (const { rel, file, consts } of PARSED) {
    const visit = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const attributes = node.attributes.properties.filter(ts.isJsxAttribute);
        const named = (name: string) => attributes.find((a) => a.name.getText() === name);
        const className = named("className");
        if (className?.initializer) {
          // The classes this element can be given: its own strings and those of the constants it names.
          const own = strings(className.initializer, rel);
          const identifiers = new Set<string>();
          const names = (n: ts.Node) => {
            if (ts.isIdentifier(n)) identifiers.add(n.text);
            ts.forEachChild(n, names);
          };
          names(className.initializer);
          const via = [...identifiers].flatMap((name) => consts.get(name) ?? EXPORTED.get(name) ?? []);
          const classes = [...own, ...via].filter((s) => OUTLINE_NONE.test(s.text));
          for (const s of classes) reached.add(s.id);
          if (classes.length > 0) {
            const tab = named("tabIndex")?.initializer?.getText().replace(/\s+/g, "");
            if (tab !== "{-1}" && tab !== '"-1"') {
              const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
              offenders.push(`${rel}:${line}: <${node.tagName.getText()}> has outline-none and no tabIndex={-1}`);
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  return { offenders, reached };
}

describe("the keyboard's ring in the components and pages", () => {
  const { offenders, reached } = survey();

  it("is taken away only on an element that takes the focus to be read, with tabIndex -1", () => {
    expect(offenders).toEqual([]);
    // The main regions that the skip link moves to are the ones that take it away today.
    expect(reached.size).toBeGreaterThanOrEqual(8);
  });

  it("is never taken away by a string that reaches no element's class list where this test can see it", () => {
    const loose = PARSED.flatMap(({ holding }) => holding).filter((s) => !reached.has(s.id));
    expect(loose.map((s) => `${s.id}: ${s.text.trim().slice(0, 80)}`)).toEqual([]);
  });
});
