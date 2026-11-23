import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { PBQ_EXAMPLE_PAGES, PRACTICE_TEST_PAGES } from "../cert-pages";
import { ROUNDUPS, VS_PAGES } from "../comparison-pages";
import { NETWORK_PLUS_CERT, OBJECTIVE_HUB_CERTS, SECURITY_PLUS_CERT, usesOfficialObjectiveNumbers } from "../exam-versions";

/**
 * "The study path covers every exam objective" is true of Security+ and A+,
 * whose steps follow CompTIA's objectives one by one. It cannot be shown for
 * Network+: the Network+ questions are grouped into topics of CertBench's own,
 * which are not CompTIA's N10-009 objectives (usesOfficialObjectiveNumbers in
 * ../exam-versions.ts).
 *
 * So the sentence is printed only where it is about Security+ or A+ alone. A
 * sentence about Network+ says "every topic". A sentence about every exam at
 * once says the one thing that is true of them all: the study path works
 * through the exam topic by topic.
 *
 * The checks read every string, template and piece of JSX text in the source
 * (comments are not copy), the two tables of page copy exam by exam, and the
 * summary written for AI assistants.
 */
const ROOT = process.cwd();

/** The sentence, in the forms it has been written in. "All 27 objectives" counts one exam's own and is not one of them. */
const CLAIMS: RegExp[] = [
  // "every exam objective", "every objective", "every other objective".
  /\bevery (?:other |single )?(?:exam |official |CompTIA )?objective\b/i,
  // "all exam objectives", "all of the objectives".
  /\ball (?:of )?(?:the |its )?(?:exam |official |CompTIA )?objectives\b/i,
  // "Each objective becomes a short step", and "goes through the exam objectives in order".
  /\beach (?:exam )?objective becomes\b/i,
  /\bthrough the exam objectives\b/i,
];

/** The one sentence about every exam at once, with the exam named as its sentence needs. */
const ONE_WORDING = /\bworks through (?:your exam|the exam|each exam|it) topic by topic\b/;

const claims = (text: string) => CLAIMS.some((claim) => claim.test(text));
/** A sentence in a page's source runs over several lines. */
const flat = (text: string) => text.replace(/\s+/g, " ");

/**
 * Questions, answers, labs and reference tables are about the subject, where
 * "every objective" is an ordinary phrase (an objective of a security program).
 */
const SUBJECT_MATTER = "src/data/";
/** The two tables of page copy hold pages for several exams each, so they are checked exam by exam below. */
const TABLES = ["src/lib/seo/cert-pages.ts", "src/lib/seo/comparison-pages.ts"];
/** The index of an exam's objectives. It exists only for the exams in OBJECTIVE_HUB_CERTS, which a check below holds to CompTIA's own. */
const OBJECTIVES_INDEX = "src/app/(marketing)/objectives/[cert]/page.tsx";

/**
 * Files that still print the sentence for Network+ or for every exam at once,
 * and belong to another package. Each was reported to the lead with its exact
 * correction on 22 November 2026. When a file is corrected, delete its line:
 * the guard then covers the file, and a check below fails until the line is
 * gone.
 */
const WAITING: Record<string, string> = {
};

/**
 * The same, in a file that another engineer is correcting in the same round of
 * work (22 November 2026). Such a file may be corrected at any moment, so no
 * check insists that it still needs its line. Delete the line once the file is
 * right.
 */
const IN_OTHER_HANDS: Record<string, string> = {
  "src/app/(path)/path/[cert]/page.tsx": "the description of each exam's study path, Network+ included",
};

interface Piece {
  rel: string;
  line: number;
  text: string;
  /**
   * The side of a choice by exam that the text is on: "official" where the
   * exam's steps are CompTIA's objectives, "other" where they are not, and
   * null where no such choice holds it.
   */
  branch: "official" | "other" | null;
}

/**
 * Which side of a choice by exam a node is on. The choice is written as
 * `official ? a : b`, as `official && a`, or as an `if` with or without an
 * `else`, and its condition is known by its name: `official`,
 * `usesOfficialObjectiveNumbers(cert)`. A sentence that follows an early
 * `return` is on neither side as far as this can tell: write it as one of
 * these, or choose only its one word (`every ${official ? "objective" : "topic"}`).
 */
function branchOf(node: ts.Node): Piece["branch"] {
  for (let child = node, parent = node.parent; parent; child = parent, parent = parent.parent) {
    let condition: ts.Expression | null = null;
    let whenTrue = false;
    if (ts.isConditionalExpression(parent) && parent.condition !== child) {
      condition = parent.condition;
      whenTrue = parent.whenTrue === child;
    } else if (ts.isIfStatement(parent) && parent.expression !== child) {
      condition = parent.expression;
      whenTrue = parent.thenStatement === child;
    } else if (
      ts.isBinaryExpression(parent) &&
      parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken &&
      parent.right === child
    ) {
      condition = parent.left;
      whenTrue = true;
    }
    if (!condition) continue;
    const text = condition.getText().trim();
    if (!/official/i.test(text)) continue;
    return whenTrue !== text.startsWith("!") ? "official" : "other";
  }
  return null;
}

/** Every piece of text that a file can show. */
function pieces(rel: string, source: string): Piece[] {
  const file = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Piece[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node) ||
      ts.isJsxText(node)
    ) {
      found.push({
        rel,
        line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        text: flat(node.text),
        branch: branchOf(node),
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** Whether a sentence names Security+ or A+, by name or by exam code, and does not name Network+. */
const aboutOneOfficialExam = (text: string) =>
  /Security\+|\bA\+|\bSY0-\d{3}\b|\b220-\d{4}\b/.test(text) && !/Network\+|\bN10-\d{3}\b/.test(text);

/** Whether a file is a page or a part of one exam that is not Network+, by its address. */
const forOneOfficialExam = (rel: string) => /security-plus|a-plus/.test(rel) && !/network-plus/.test(rel);

/** Whether a piece of text that carries the sentence is printed only for Security+ or A+. */
function allowed(piece: Piece): boolean {
  if (piece.branch) return piece.branch === "official";
  return aboutOneOfficialExam(piece.text) || forOneOfficialExam(piece.rel) || piece.rel === OBJECTIVES_INDEX;
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

/**
 * A count of an exam's objectives is the same claim when the count comes from
 * the data ("covers all {objectiveCount} objectives"): the sentence is then
 * printed for whichever exam is shown, Network+ included, whose 27 are
 * CertBench's own topics. That was the readiness check's estimate (WF-04).
 * One piece of text cannot show it, because the count is an expression between
 * two pieces, so the sentences below are read whole, with every expression in
 * them written as {n}. A word chosen by exam (`{official ? "objectives" :
 * "topics"}`) is an expression too, so it never makes the claim.
 */
const COUNTED = /\ball \{n\}(?:\s+\{n\})*\s+(?:exam |official |CompTIA )?objectives\b/i;
/**
 * A count written as a figure belongs to one exam's page or link ("All 36
 * objectives, each with its own practice questions" on an A+ link), so it is
 * allowed unless it names Network+.
 */
const COUNTED_FIGURE = /\ball \d+ (?:exam |official |CompTIA )?objectives\b/i;
const namesNetworkPlus = (piece: Piece) => /Network\+|\bN10-\d{3}\b/.test(piece.text) || /network-plus/.test(piece.rel);

/**
 * Files that print a counted sentence for one exam only by the way they are
 * used, which this reader cannot see, each with where it is used. Each was
 * reported to the lead with the change that makes it choose its word by exam
 * (23 November 2026). When a file is changed, delete its line: a check below
 * fails until the line is gone.
 */
const COUNT_WAITING: Record<string, string> = {};

/** Each sentence a file prints whole: a JSX element's text, or a template, with every expression in it written as {n}. */
function sentences(rel: string, source: string): Piece[] {
  const file = ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, rel.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Piece[] = [];
  const visit = (node: ts.Node) => {
    let text: string | null = null;
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      text = node.children
        .map((child) => {
          if (ts.isJsxText(child)) return child.text;
          if (ts.isJsxExpression(child)) {
            const value = child.expression;
            // An empty expression is a comment in markup, which is not copy.
            if (!value) return "";
            return ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value) ? value.text : "{n}";
          }
          // An element inside is read as a sentence of its own.
          return "{e}";
        })
        .join("");
    } else if (ts.isTemplateExpression(node)) {
      text = node.head.text + node.templateSpans.map((span) => `{n}${span.literal.text}`).join("");
    }
    if (text !== null) {
      found.push({ rel, line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1, text: flat(text), branch: branchOf(node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** Whether a whole sentence counts an exam's objectives from the data where that exam may not have CompTIA's own. */
const countsWrongly = (sentence: Piece) => COUNTED.test(sentence.text) && !allowed(sentence);
/** Whether a sentence or a piece of text gives Network+ a count of objectives as a figure. */
const figureWrongly = (text: Piece) => COUNTED_FIGURE.test(text.text) && namesNetworkPlus(text) && text.branch !== "official";

/** The offenders of both kinds, from whole sentences and from single pieces of text, each once. */
function countOffenders(found: { sentences: Piece[]; pieces: Piece[] }): Piece[] {
  const seen = new Set<string>();
  return [...found.sentences.filter((s) => countsWrongly(s) || figureWrongly(s)), ...found.pieces.filter(figureWrongly)].filter(
    (p) => {
      const key = `${p.rel}:${p.line}:${p.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
  );
}

const FILES = sources(join(ROOT, "src")).map((path) => relative(ROOT, path).replace(/\\/g, "/"));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const PIECES = FILES.filter((rel) => !rel.startsWith(SUBJECT_MATTER) && !TABLES.includes(rel)).flatMap((rel) =>
  pieces(rel, read(rel))
);
const OFFENDERS = PIECES.filter((piece) => claims(piece.text) && !allowed(piece));
const SENTENCES = FILES.filter((rel) => !rel.startsWith(SUBJECT_MATTER) && !TABLES.includes(rel)).flatMap((rel) =>
  sentences(rel, read(rel))
);
const COUNT_OFFENDERS = countOffenders({ sentences: SENTENCES, pieces: PIECES });
const where = ({ rel, line, text }: Piece) => `${rel}:${line}: ${text.trim().slice(0, 100)}`;

const LLMS = read("public/llms.txt").split(/\r?\n/);

/** The exams of a guide to practice tests: those of the practice-test page that it leads to. */
const guideExams = (practiceTestPath: string) =>
  PRACTICE_TEST_PAGES.find((page) => page.path === practiceTestPath)?.certSlugs ?? [];

describe("the sentence that the study path covers every exam objective", () => {
  it("is looked for in the whole source tree", () => {
    expect(FILES.length).toBeGreaterThan(300);
    expect(PIECES.length).toBeGreaterThan(5000);
    // It is still said, where it is true. If the check found it nowhere, it would be reading nothing.
    expect(PIECES.filter((piece) => claims(piece.text) && allowed(piece)).length).toBeGreaterThanOrEqual(3);
  });

  it("is printed only where it is about Security+ or A+ alone", () => {
    const known = new Set([...Object.keys(WAITING), ...Object.keys(IN_OTHER_HANDS)]);
    expect(OFFENDERS.filter((piece) => !known.has(piece.rel)).map(where)).toEqual([]);
  });

  it("is listed as waiting for a correction only in files that still need one", () => {
    // When one of these files is corrected, delete its line from WAITING so
    // that the guard covers the file from then on.
    const stillNeeded = new Set(OFFENDERS.map((piece) => piece.rel));
    expect(Object.keys(WAITING).filter((rel) => !stillNeeded.has(rel))).toEqual([]);
    for (const rel of [...Object.keys(WAITING), ...Object.keys(IN_OTHER_HANDS)]) expect(existsSync(join(ROOT, rel)), rel).toBe(true);
  });

  it("is said on the index of an exam's objectives because every such exam has CompTIA's own objectives", () => {
    expect(OBJECTIVE_HUB_CERTS.length).toBeGreaterThan(0);
    expect(OBJECTIVE_HUB_CERTS.filter((cert) => !usesOfficialObjectiveNumbers(cert))).toEqual([]);
  });

  it("is on no practice-test page or lab page of an exam whose topics are CertBench's own", () => {
    for (const page of PRACTICE_TEST_PAGES) {
      if (!page.certSlugs.every(usesOfficialObjectiveNumbers)) expect(claims(JSON.stringify(page)), page.path).toBe(false);
    }
    for (const page of PBQ_EXAMPLE_PAGES) {
      if (!usesOfficialObjectiveNumbers(page.certSlug)) expect(claims(JSON.stringify(page)), page.path).toBe(false);
    }
    // The check reads these tables: the Security+ page says it, and the Network+ pages were looked at.
    expect(claims(JSON.stringify(PRACTICE_TEST_PAGES.find((page) => page.certSlugs.includes(SECURITY_PLUS_CERT))))).toBe(true);
    expect(PRACTICE_TEST_PAGES.some((page) => page.certSlugs.includes(NETWORK_PLUS_CERT))).toBe(true);
    expect(PBQ_EXAMPLE_PAGES.some((page) => page.certSlug === NETWORK_PLUS_CERT)).toBe(true);
  });

  it("is in a guide to practice tests only where every exam of the guide has CompTIA's own objectives", () => {
    for (const guide of ROUNDUPS) {
      const exams = guideExams(guide.practiceTestPath);
      // The guide's closing card chooses its words by these exams (RoundupLanding).
      expect(exams.length, guide.path).toBeGreaterThan(0);
      if (!exams.every(usesOfficialObjectiveNumbers)) expect(claims(JSON.stringify(guide)), guide.path).toBe(false);
    }
    expect(ROUNDUPS.some((guide) => guideExams(guide.practiceTestPath).includes(NETWORK_PLUS_CERT))).toBe(true);
  });

  it("is in a comparison with another product only where the comparison's title names Security+ or A+", () => {
    for (const page of VS_PAGES) {
      if (!claims(JSON.stringify(page))) continue;
      // A comparison that is not about one exam speaks for every exam, Network+ included.
      expect(aboutOneOfficialExam(page.metaTitle), page.slug).toBe(true);
      expect(`${page.metaTitle} ${page.metaDescription} ${page.h1}`, page.slug).not.toMatch(/Network\+/);
    }
  });

  it("is in the summary for AI assistants only on a line about Security+ or A+", () => {
    const lines = LLMS.filter(claims);
    expect(lines.filter((line) => !aboutOneOfficialExam(line))).toEqual([]);
  });
});

describe("a count of an exam's objectives", () => {
  it("is read in whole sentences across the source tree", () => {
    expect(SENTENCES.length).toBeGreaterThan(1000);
    // Counts are still printed where they are true. If the check found none, it would be reading nothing.
    expect(SENTENCES.filter((s) => COUNTED.test(s.text) && allowed(s)).length).toBeGreaterThanOrEqual(3);
    expect(PIECES.filter((p) => COUNTED_FIGURE.test(p.text)).length).toBeGreaterThanOrEqual(2);
  });

  it("is printed for Network+ nowhere, and from the data only where the exam's objectives are CompTIA's own", () => {
    const known = new Set(Object.keys(COUNT_WAITING));
    expect(COUNT_OFFENDERS.filter((s) => !known.has(s.rel)).map(where)).toEqual([]);
  });

  it("is listed as waiting for a change only in files that still need one", () => {
    const stillNeeded = new Set(COUNT_OFFENDERS.map((s) => s.rel));
    expect(Object.keys(COUNT_WAITING).filter((rel) => !stillNeeded.has(rel))).toEqual([]);
  });

  it("is in no practice-test page, lab page or guide of an exam whose topics are CertBench's own", () => {
    const count = (value: unknown) => COUNTED_FIGURE.test(JSON.stringify(value));
    for (const page of PRACTICE_TEST_PAGES) {
      if (!page.certSlugs.every(usesOfficialObjectiveNumbers)) expect(count(page), page.path).toBe(false);
    }
    for (const page of PBQ_EXAMPLE_PAGES) {
      if (!usesOfficialObjectiveNumbers(page.certSlug)) expect(count(page), page.path).toBe(false);
    }
    for (const guide of ROUNDUPS) {
      if (!guideExams(guide.practiceTestPath).every(usesOfficialObjectiveNumbers)) expect(count(guide), guide.path).toBe(false);
    }
    // The A+ pages do count their objectives, which are CompTIA's: the check reads the tables.
    expect(count(PRACTICE_TEST_PAGES.filter((page) => page.certSlugs.every(usesOfficialObjectiveNumbers)))).toBe(true);
  });
});

describe("the one sentence that is true of every exam", () => {
  /** Where a sentence speaks of every exam at once: each says that the study path works through the exam topic by topic. */
  const EVERY_EXAM = [
    "src/app/layout.tsx",
    "src/app/(marketing)/page.tsx",
    "src/app/(marketing)/pricing/page.tsx",
    "src/app/(marketing)/help/page.tsx",
    "src/app/(marketing)/educators/page.tsx",
    "src/app/(marketing)/tools/port-numbers-quiz/page.tsx",
    "src/server/email/templates.ts",
  ];

  it("is used wherever a page, an email or the site's description speaks of them all", () => {
    for (const rel of EVERY_EXAM) {
      expect(PIECES.some((piece) => piece.rel === rel && ONE_WORDING.test(piece.text)), rel).toBe(true);
    }
  });

  it("is used in the comparisons that are not about one exam", () => {
    const general = VS_PAGES.filter((page) => !aboutOneOfficialExam(page.metaTitle));
    expect(general.length).toBeGreaterThan(0);
    for (const page of general) {
      const row = page.rows.find((r) => r.feature === "Study path");
      expect(row?.certbench, page.slug).toMatch(ONE_WORDING);
    }
  });

  it("opens the summary for AI assistants, which names every exam", () => {
    expect(LLMS[2]).toMatch(/^> CertBench is an independent study program /);
    expect(LLMS[2]).toContain("Network+");
    expect(LLMS[2]).toMatch(ONE_WORDING);
  });
});

// The reader is itself checked, so that a pass above means the text was read and found clean.
describe("the reader of these checks", () => {
  const texts = (source: string) => pieces("src/components/sample.tsx", source);
  const offending = (source: string) => texts(source).filter((piece) => claims(piece.text) && !allowed(piece));

  it("knows the sentence in each of its forms, and a count of one exam's objectives from it", () => {
    const said = [
      "The study path covers every exam objective in short steps.",
      "It sets out every objective as a short step.",
      "Study this and every other objective.",
      "It covers all of the exam objectives.",
      "Each objective becomes a short step.",
      "The study path goes through the exam objectives in order.",
    ];
    expect(said.filter(claims)).toEqual(said);
    const notSaid = [
      "The study path covers all 27 objectives in short steps.",
      "The study path covers every topic in short steps.",
      "The study path works through the exam topic by topic, in short steps.",
      "Each objective opens its own practice questions.",
      "Every question is written against the published exam objectives.",
    ];
    expect(notSaid.filter(claims)).toEqual([]);
  });

  it("reads strings, templates and JSX text that runs over two lines, and not comments", () => {
    const source = [
      "// The study path covers every exam objective.",
      "/** It covers every objective. */",
      'const a = "The study path covers every exam objective.";',
      "const b = `For ${exam}, it covers every objective.`;",
      "const c = <p>The study path covers every exam",
      "  objective in short steps.</p>;",
    ].join("\n");
    expect(texts(source).filter((piece) => claims(piece.text)).map((piece) => piece.line)).toEqual([3, 4, 5]);
  });

  it("allows the sentence on the side of a choice by exam where the objectives are CompTIA's own, and not on the other", () => {
    const chosen = 'const a = official ? "It covers every exam objective." : "It covers every topic.";';
    expect(offending(chosen)).toEqual([]);
    const wrongSide = 'const a = official ? "Study it and every other objective" : "Study this and every other objective";';
    expect(offending(wrongSide).map((piece) => piece.text)).toEqual(["Study this and every other objective"]);
    const negated = 'const a = !usesOfficialObjectiveNumbers(cert) ? "It covers every topic." : "It covers every objective.";';
    expect(offending(negated)).toEqual([]);
    const negatedWrong = 'const a = !official ? "It covers every objective." : "It covers every topic.";';
    expect(offending(negatedWrong)).toHaveLength(1);
    // A sentence whose one word is chosen never holds the whole claim.
    const byWord = 'const a = <p>It covers every {official ? "exam objective" : "topic"} in short steps.</p>;';
    expect(texts(byWord).filter((piece) => claims(piece.text))).toEqual([]);
    // A choice by something else is no choice by exam.
    const other = 'const a = signedIn ? "It covers every exam objective." : "It covers every topic.";';
    expect(offending(other)).toHaveLength(1);
  });

  it("knows the same choice written with && in markup, and as an if with an else", () => {
    const shown = "const a = <div>{official && <p>It covers every exam objective.</p>}{!official && <p>It covers every topic.</p>}</div>;";
    expect(offending(shown)).toEqual([]);
    const shownWrong = "const a = <div>{!official && <p>It covers every exam objective.</p>}</div>;";
    expect(offending(shownWrong)).toHaveLength(1);
    const statement = [
      "function covers(cert: string) {",
      '  if (usesOfficialObjectiveNumbers(cert)) return "It covers every exam objective.";',
      '  else return "It covers every topic.";',
      "}",
    ].join("\n");
    expect(offending(statement)).toEqual([]);
    const statementWrong = [
      "function covers(official: boolean) {",
      '  if (official) { return "It covers every topic."; } else { return "It covers every objective."; }',
      "}",
    ].join("\n");
    expect(offending(statementWrong)).toHaveLength(1);
  });

  it("allows the sentence where it names Security+ or A+, and not where it names Network+ or no exam", () => {
    expect(offending('const a = "Your Security+ study path covers every objective.";')).toEqual([]);
    expect(offending('const a = "The 220-1202 study path covers every objective.";')).toEqual([]);
    expect(offending('const a = "Every objective of CompTIA Security+, Network+, and A+, as a study path.";')).toHaveLength(1);
    expect(offending('const a = "The Network+ study path covers every objective.";')).toHaveLength(1);
    expect(offending('const a = "Your study path covers every exam objective.";')).toHaveLength(1);
  });

  /** What the tree-wide check would report for one file. */
  const counted = (source: string) =>
    countOffenders({ sentences: sentences("src/components/sample.tsx", source), pieces: texts(source) });

  it("reads a count of objectives across the expression that holds it, and lets a word chosen by exam stand", () => {
    // The readiness check's estimate before WF-04: the count and the word split the sentence into two pieces.
    const estimate = 'const a = <p>The {shortCertName} study path covers all {objectiveCount}{" "}\n  objectives, one step at a time.</p>;';
    expect(texts(estimate).filter((piece) => claims(piece.text))).toEqual([]);
    expect(counted(estimate).map((s) => s.text)).toEqual(["The {n} study path covers all {n} objectives, one step at a time."]);
    // The same sentence once its word is chosen by exam.
    expect(counted('const a = <p>It covers all {objectiveCount} {official ? "objectives" : "topics"} in short steps.</p>;')).toEqual([]);
    // A template, with the count and the exam's code as expressions.
    expect(counted("const a = `The ${exam} study path covers all ${n} ${code} exam objectives.`;")).toHaveLength(1);
    expect(counted("const a = official ? `It covers all ${n} objectives.` : `It covers all ${n} topics.`;")).toEqual([]);
    // A sentence that names Security+ or A+ may count from the data.
    expect(counted("const a = `Your Security+ study path covers all ${n} objectives.`;")).toEqual([]);
  });

  it("allows a count written as a figure unless it names Network+, in markup and in a string alike", () => {
    expect(counted('const a = { note: "All 36 objectives, each with its own practice questions" };')).toEqual([]);
    expect(counted("const a = <p>The Network+ study path covers all 27 objectives.</p>;")).toHaveLength(1);
    expect(counted('const a = "The Network+ study path covers all 27 objectives.";')).toHaveLength(1);
    expect(counted('const a = official ? "It covers all 27 objectives." : "It covers all 27 topics.";')).toEqual([]);
  });

  it("allows the sentence in a file of one exam that is not Network+, by the file's address", () => {
    const sentence = 'const a = "Each version has its own study path, which sets out every objective.";';
    const at = (rel: string) => pieces(rel, sentence).filter((piece) => claims(piece.text) && !allowed(piece));
    expect(at("src/app/(marketing)/security-plus-sy0-801-vs-sy0-701/page.tsx")).toEqual([]);
    expect(at("src/app/(marketing)/a-plus-core-1-practice-test/page.tsx")).toEqual([]);
    expect(at("src/app/(marketing)/network-plus-practice-test/page.tsx")).toHaveLength(1);
    expect(at("src/app/(marketing)/help/page.tsx")).toHaveLength(1);
  });
});
