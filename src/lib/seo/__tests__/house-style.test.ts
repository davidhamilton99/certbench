import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { PRO_PRICES } from "@/lib/pricing/terms";

/**
 * CertBench's house style, held by a test so that it does not depend on
 * anyone remembering it.
 *
 * 1. No dash between words: an aside takes commas or parentheses, and an
 *    explanation takes a colon or a new sentence.
 * 2. No fragments joined by a middle dot or a bullet with a space on each
 *    side: they are written as a sentence.
 * 3. The interface uses one vocabulary: "Sign in", "Choose", "study path",
 *    "introductory questions", "practice exam".
 * 4. A link inside a sentence is underlined, so that it is not told apart by
 *    colour alone (WCAG 1.4.1).
 * 5. The price of Pro is worded once, in src/lib/pricing: no other file types
 *    one of its figures.
 *
 * The checks read everything written in the source: every string, template
 * and piece of JSX text, in every file a page or an email is built from. They
 * read the value as the visitor receives it, so an escape or an HTML entity
 * for a character counts as that character. Comments are not copy, so they are
 * not checked. Text from the question bank is set in house style when it is
 * loaded (src/core/text).
 */
const ROOT = process.cwd();
const EM_DASH = String.fromCharCode(0x2014);
const BAR = String.fromCharCode(0x2015);
const EN_DASH = String.fromCharCode(0x2013);
const MIDDLE_DOT = String.fromCharCode(0xb7);
const BULLET = String.fromCharCode(0x2022);
const DASH = new RegExp(`[${EM_DASH}${BAR}]|\\s${EN_DASH}\\s`);
const DOT_JOINED = new RegExp(`\\s[${MIDDLE_DOT}${BULLET}]\\s`);

/** The question sets that fed the database: stored text is set in house style when it is loaded, not here. */
const SEEDED = ["src/data/sy0-801/", "src/data/a-plus-v15/"];
/**
 * The rule itself has to name the characters. So does the repair of stored
 * text that lost a dash to a bad encoding: it puts the dash back, and the same
 * call then replaces it (repairText in src/core/path/text.ts).
 */
const RULE = ["src/core/text/", "src/core/path/text.ts"];
/**
 * Questions, answers and lab scenarios are about the subject, where "log in",
 * "pick" and "rehearsal" are ordinary words ("a logged-in session", "the
 * printer fails to pick up paper"). The vocabulary is for the interface.
 */
const SUBJECT_MATTER = ["src/data/"];
/** Where the price of Pro is worked out (ppp.ts) and worded (terms.ts). */
const PRICING = "src/lib/pricing/";
/** A competitor's price that happens to be one of CertBench's own figures (Boson, in the guides). */
const OTHER_PRICES = ["$99 a year for each exam"];

/** The entities that stand for a character one of these rules is about. */
const ENTITIES: Record<string, number> = {
  mdash: 0x2014,
  horbar: 0x2015,
  ndash: 0x2013,
  middot: 0xb7,
  bull: 0x2022,
  nbsp: 0xa0,
  amp: 0x26,
  apos: 0x27,
  quot: 0x22,
};

/** JSX text and JSX attribute strings as the browser receives them: entities become their characters. */
function decodeEntities(text: string): string {
  return text.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (whole, decimal, hex, name) => {
    const code = decimal ? Number(decimal) : hex ? parseInt(hex, 16) : ENTITIES[String(name).toLowerCase()];
    return code === undefined ? whole : String.fromCodePoint(code);
  });
}

interface Piece {
  rel: string;
  line: number;
  /** The text as it reaches the page: escapes cooked, entities decoded. */
  text: string;
  /** Whether a visitor reads it as words, as opposed to an identifier, a class list or a module name. */
  prose: boolean;
}

interface LooseLink {
  rel: string;
  line: number;
  tag: string;
}

/** Attributes whose value is read out or shown, whatever it looks like. */
const SPOKEN_ATTRIBUTES = new Set(["aria-label", "title", "alt", "placeholder", "label"]);
/** Helpers that take class names. */
const CLASS_HELPERS = new Set(["cn", "clsx", "cva", "twMerge"]);
const LINK_TAGS = new Set(["a", "Link", "IntentLink"]);

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

/** Whether a string is words for a visitor. An identifier ("rehearsal-intro", "path_rehearsal_started") has no space and no capital. */
function isProse(node: ts.Node, text: string): boolean {
  if (node.kind === ts.SyntaxKind.JsxText) return true;
  const parent = node.parent;
  if (ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent) || ts.isLiteralTypeNode(parent)) return false;
  if (ts.isCallExpression(parent)) {
    if (parent.expression.kind === ts.SyntaxKind.ImportKeyword) return false;
    if (ts.isIdentifier(parent.expression) && CLASS_HELPERS.has(parent.expression.text)) return false;
  }
  if (ts.isJsxAttribute(parent)) {
    const name = parent.name.getText();
    if (name === "className") return false;
    if (SPOKEN_ATTRIBUTES.has(name)) return true;
  }
  // The default of a prop is shown as it stands, even as one small word:
  // `noun = "rehearsal"` printed "Finish the rehearsal".
  if ((ts.isBindingElement(parent) || ts.isParameter(parent)) && parent.initializer === node) return true;
  // Otherwise words have a space between them or open with a capital.
  return /\s/.test(text) || /^[A-Z][a-z]/.test(text);
}

/** The class names an element is given, or null when they cannot be read from the source. */
function classNames(element: ts.JsxOpeningElement): string | null {
  for (const attribute of element.attributes.properties) {
    if (ts.isJsxSpreadAttribute(attribute)) return null;
    if (attribute.name.getText() !== "className") continue;
    const value = attribute.initializer;
    if (!value) return "";
    if (ts.isStringLiteral(value)) return value.text;
    let text = "";
    let known = true;
    const visit = (node: ts.Node) => {
      if (ts.isStringLiteralLike(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
        text += ` ${node.text}`;
      } else if (ts.isIdentifier(node) && !CLASS_HELPERS.has(node.text)) {
        // A value from elsewhere: it may carry the underline.
        known = false;
      }
      ts.forEachChild(node, visit);
    };
    visit(value);
    return known ? text : /(?:^|\s)underline(?:\s|$)|\bcb-link\b/.test(text) ? text : null;
  }
  return "";
}

/** Every piece of text a file can show, and every link in it that sits among words without an underline. */
function parse(rel: string, source: string): { pieces: Piece[]; looseLinks: LooseLink[] } {
  const file = ts.createSourceFile(
    rel,
    source,
    ts.ScriptTarget.Latest,
    true,
    rel.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const lineOf = (node: ts.Node) => file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
  const pieces: Piece[] = [];
  const looseLinks: LooseLink[] = [];

  const visit = (node: ts.Node) => {
    const isText =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node);
    if (isText) {
      // `text` is the cooked value, so an escape for a dash is already the dash. JSX keeps entities as written.
      const inMarkup = ts.isJsxText(node) || ts.isJsxAttribute(node.parent);
      const text = inMarkup ? decodeEntities(node.text) : node.text;
      pieces.push({ rel, line: lineOf(node), text, prose: isProse(node, text) });
    }

    if (ts.isJsxElement(node) && LINK_TAGS.has(node.openingElement.tagName.getText())) {
      const parent = node.parent;
      const beside = ts.isJsxElement(parent) || ts.isJsxFragment(parent) ? parent.children : [];
      const amongWords = beside.some((sibling) => sibling !== node && ts.isJsxText(sibling) && /[A-Za-z]{2,}/.test(sibling.text));
      // A page that cannot load the stylesheet styles its links inline, and the browser's own underline stays.
      const inline = node.openingElement.attributes.properties.some(
        (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "style"
      );
      if (amongWords && !inline) {
        const classes = classNames(node.openingElement);
        const underlined = classes === null || /(?:^|\s)underline(?:\s|$)|\bcb-link\b/.test(classes);
        if (!underlined) looseLinks.push({ rel, line: lineOf(node), tag: node.openingElement.tagName.getText() });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return { pieces, looseLinks };
}

const FILES = sources(join(ROOT, "src")).map((path) =>
  parse(relative(ROOT, path).replace(/\\/g, "/"), readFileSync(path, "utf8"))
);
const PIECES = FILES.flatMap((file) => file.pieces);
const COPY = PIECES.filter(
  ({ rel }) => !RULE.some((path) => rel.startsWith(path)) && !SEEDED.some((dir) => rel.startsWith(dir))
);
const INTERFACE = COPY.filter(({ rel, prose }) => prose && !SUBJECT_MATTER.some((dir) => rel.startsWith(dir)));

const where = ({ rel, line, text }: Piece) => `${rel}:${line}: ${text.replace(/\s+/g, " ").trim().slice(0, 90)}`;

/** One of the three list prices of Pro as a figure ("$19"), and not the start of another figure ("$19.99"). */
const PRICE_FIGURES = Object.values(PRO_PRICES).map((figure) => figure.replace("$", "\\$"));
const TYPED_PRICE = new RegExp(`(?:${PRICE_FIGURES.join("|")})(?!\\d|[.,]\\d)`);
const withoutOtherPrices = (text: string) => OTHER_PRICES.reduce((rest, phrase) => rest.split(phrase).join(""), text);

/** Words the interface no longer uses, each with the words that replaced it. */
const RETIRED: { instead: string; pattern: RegExp }[] = [
  // "Log in" as a verb. "The audit log in the console" is a noun and stays.
  { instead: "Sign in", pattern: /\blog(?:s|ged|ging)?[ -]in\b(?! (?:the|a|an|this|that|each|every)\b)/i },
  // "Pick an exam". "It picks up from your score" is another verb.
  { instead: "Choose", pattern: /\bpick(?:s|ed|ing)?\b(?! up\b)/i },
  { instead: "study path", pattern: /\bguided (?:study )?paths?\b/i },
  { instead: "introductory questions", pattern: /\bwarm[- ]?ups?\b/i },
  { instead: "practice exam", pattern: /\brehearsals?\b/i },
];

describe("house style", () => {
  it("reads the whole source tree", () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(PIECES.length).toBeGreaterThan(5000);
  });

  it("has no dash between words in anything the site or its emails say", () => {
    expect(COPY.filter(({ text }) => DASH.test(text)).map(where)).toEqual([]);
  });

  it("joins no fragments with a middle dot or a bullet", () => {
    expect(COPY.filter(({ text }) => DOT_JOINED.test(text)).map(where)).toEqual([]);
  });

  it("uses one vocabulary in the interface", () => {
    const found = INTERFACE.flatMap((piece) =>
      RETIRED.filter(({ pattern }) => pattern.test(piece.text)).map(({ instead }) => `${where(piece)} (the word is "${instead}")`)
    );
    expect(found).toEqual([]);
  });

  it("underlines every link that sits inside a sentence", () => {
    const loose = FILES.flatMap((file) => file.looseLinks).map(({ rel, line, tag }) => `${rel}:${line}: <${tag}>`);
    expect(loose).toEqual([]);
  });

  it("types the price of Pro in one place, so that no page can state an old figure", () => {
    const found = PIECES.filter(({ rel }) => !rel.startsWith(PRICING) && !SUBJECT_MATTER.some((dir) => rel.startsWith(dir)))
      .filter(({ text }) => TYPED_PRICE.test(withoutOtherPrices(text)))
      .map(where);
    expect(PRICE_FIGURES).toHaveLength(3);
    expect(found).toEqual([]);
  });

  it("holds the summary written for AI assistants to the same rules", () => {
    const summary = readFileSync(join(ROOT, "public", "llms.txt"), "utf8");
    expect(DASH.test(summary)).toBe(false);
    expect(DOT_JOINED.test(summary)).toBe(false);
  });
});

// The reader is itself checked, so that a pass above means the text was read and found clean.
describe("the house-style reader", () => {
  const BACKSLASH = String.fromCharCode(92);
  const texts = (source: string) => parse("sample.tsx", source).pieces.map((piece) => piece.text);

  it("sees a dash that is written as an escape", () => {
    const found = texts(`const a = "left ${BACKSLASH}u2014 right";`);
    expect(found.filter((text) => DASH.test(text))).toHaveLength(1);
  });

  it("sees a dash or a middle dot that is written as an entity, in text and in an attribute", () => {
    const found = texts(
      'const a = <p>left &mdash; right</p>; const b = <p title="one &middot; two">one &#183; two</p>; const c = <p>plain</p>;'
    );
    expect(found.filter((text) => DASH.test(text))).toHaveLength(1);
    expect(found.filter((text) => DOT_JOINED.test(text))).toHaveLength(2);
  });

  it("allows an en dash in a range of figures, and a middle dot that joins nothing a visitor reads", () => {
    expect(DASH.test(`pages 3${EN_DASH}5`)).toBe(false);
    expect(DOT_JOINED.test(`a${MIDDLE_DOT}b`)).toBe(false);
  });

  it("knows the retired words from their ordinary uses", () => {
    const flagged = (text: string) => RETIRED.some(({ pattern }) => pattern.test(text));
    expect(
      ["Log in to continue", "You are logged in", "Pick an exam", "the guided path", "Warm-up", "Finish the rehearsal"].filter(flagged)
    ).toHaveLength(6);
    expect(["Read the log in the console", "It picks up from your score", "Sign in", "Choose your exam"].filter(flagged)).toEqual([]);
  });

  it("knows the price of Pro from another price", () => {
    expect(TYPED_PRICE.test(`Pro costs ${PRO_PRICES.monthly} a month.`)).toBe(true);
    expect(TYPED_PRICE.test(`The pack costs ${PRO_PRICES.monthly}.99.`)).toBe(false);
    expect(TYPED_PRICE.test(withoutOtherPrices(OTHER_PRICES[0]))).toBe(false);
  });

  it("takes a prop's default and a spoken attribute as words, and an identifier as an identifier", () => {
    const { pieces } = parse(
      "sample.tsx",
      `import { run } from "./rehearsal-run";
       const kind = "rehearsal";
       track("path_rehearsal_started");
       function Player({ noun = "rehearsal" }) {
         return <button aria-label="Open the rehearsal" className="rehearsal" data-kind="rehearsal">Finish the {noun}</button>;
       }`
    );
    expect(pieces.filter((piece) => piece.prose).map((piece) => piece.text.trim())).toEqual([
      "rehearsal",
      "Open the rehearsal",
      "Finish the",
    ]);
  });

  it("finds a link among words that has no underline, and leaves a link that stands alone", () => {
    const { looseLinks } = parse(
      "sample.tsx",
      `const a = <p>Read the <a href="/terms" className="text-primary hover:underline">terms</a> first.</p>;
       const b = <p>Read the <a href="/terms" className="cb-link">terms</a> first.</p>;
       const c = <p>Read the <Link href="/terms" className="underline underline-offset-4">terms</Link> first.</p>;
       const d = <li><a href="/pricing" className="text-primary hover:underline">Pricing</a></li>;`
    );
    expect(looseLinks.map((link) => link.line)).toEqual([1]);
  });
});
