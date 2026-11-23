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

const FILES = sources(join(ROOT, "src")).map((path) => relative(ROOT, path).replace(/\\/g, "/"));
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const PIECES = FILES.filter((rel) => !rel.startsWith(SUBJECT_MATTER) && !TABLES.includes(rel)).flatMap((rel) =>
  pieces(rel, read(rel))
);
const OFFENDERS = PIECES.filter((piece) => claims(piece.text) && !allowed(piece));
const where = ({ rel, line, text }: Piece) => `${rel}:${line}: ${text.trim().slice(0, 100)}`;

const LLMS = read("public/llms.txt").split("\n");

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

  it("allows the sentence in a file of one exam that is not Network+, by the file's address", () => {
    const sentence = 'const a = "Each version has its own study path, which sets out every objective.";';
    const at = (rel: string) => pieces(rel, sentence).filter((piece) => claims(piece.text) && !allowed(piece));
    expect(at("src/app/(marketing)/security-plus-sy0-801-vs-sy0-701/page.tsx")).toEqual([]);
    expect(at("src/app/(marketing)/a-plus-core-1-practice-test/page.tsx")).toEqual([]);
    expect(at("src/app/(marketing)/network-plus-practice-test/page.tsx")).toHaveLength(1);
    expect(at("src/app/(marketing)/help/page.tsx")).toHaveLength(1);
  });
});
