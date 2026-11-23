import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * Supabase answers one select with at most 1,000 rows and says nothing about
 * the rows it left out. An exam's question bank can hold more than that
 * (SY0-801 has 1,008 questions), and so can a member's answer history.
 *
 * So every select that can take the whole of `cert_questions` for an exam, or
 * the whole of `question_performance` for a member, has to say how many rows
 * it is prepared for. It does that in one of four ways:
 *
 *   - it is read a page at a time with `.range()` (see src/server/data/paging.ts);
 *   - it takes a fixed number of rows with `.limit()`, `.single()` or `.maybeSingle()`;
 *   - it asks for rows by id, or for one objective or one domain;
 *   - it counts and returns no rows (`{ count, head: true }`).
 *
 * This reads every source file and finds the selects that do none of those.
 *
 * Two more things are held here. A select that is read a page at a time asks
 * for the exact count with each page (`{ count: "exact" }`, written beside the
 * columns): the count is how the read knows that it has every row, whatever
 * number of rows the database gives to one answer, and without it every read
 * costs a request more. And a query on these tables is written as one chain
 * from `.from(table)`: one that is kept in a variable and finished elsewhere
 * cannot be read here, so it is refused.
 */
const ROOT = process.cwd();
const TABLES = new Set(["cert_questions", "question_performance"]);

/** A filter on one of these columns takes less than one exam's rows. */
const NARROWS = new Set(["id", "question_id", "sub_objective_id", "domain_id"]);
/** A select with one of these takes a fixed number of rows. */
const LIMITS = new Set(["range", "limit", "single", "maybeSingle"]);
/** A chain with one of these changes rows; any select on it returns only what it changed. */
const WRITES = new Set(["insert", "update", "upsert", "delete"]);

/**
 * Selects that are known to be unbounded and are waiting for their fix, as
 * "file: table". They are reported, not hidden: each one is a place where an
 * exam of more than 1,000 questions loses rows. None is waiting today: the two
 * selects behind every readiness score (recomputeAndSnapshotReadiness in
 * src/server/services/submit-exam.ts) were the last, and are paged.
 */
const KNOWN_UNBOUNDED: string[] = [];

interface Select {
  where: string;
  table: string;
  line: number;
  /** The methods chained after `.from(table)`, in order, with the first argument when it is a string. */
  chain: { name: string; first: string | null; args: readonly ts.Expression[] }[];
}

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "__tests__" ? [] : sources(child);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [child] : [];
  });
}

const stringOf = (node: ts.Expression | undefined): string | null =>
  node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : null;

/** Every `.from("cert_questions")` and `.from("question_performance")` in a file, with what is chained to it. */
function tableReads(path: string, source: string): Select[] {
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Select[] = [];
  const visit = (node: ts.Node) => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "from" &&
      TABLES.has(stringOf(node.arguments[0]) ?? "")
    ) {
      const chain: Select["chain"] = [];
      let link: ts.Node = node;
      // `a.from(t).select(c).eq(k, v)` is nested calls: each step outward is one more method.
      while (
        ts.isPropertyAccessExpression(link.parent) &&
        link.parent.expression === link &&
        ts.isCallExpression(link.parent.parent) &&
        link.parent.parent.expression === link.parent
      ) {
        const call = link.parent.parent;
        chain.push({ name: link.parent.name.text, first: stringOf(call.arguments[0]), args: call.arguments });
        link = call;
      }
      found.push({
        where: relative(ROOT, path).replace(/\\/g, "/"),
        table: stringOf(node.arguments[0]) as string,
        line: file.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        chain,
      });
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return found;
}

/** True for `.select(columns, { count: ..., head: true })`: a count that returns no rows. */
function countsOnly(select: Select["chain"][number]): boolean {
  const options = select.args[1];
  return (
    !!options &&
    ts.isObjectLiteralExpression(options) &&
    options.properties.some(
      (p) =>
        ts.isPropertyAssignment(p) &&
        p.name.getText() === "head" &&
        p.initializer.kind === ts.SyntaxKind.TrueKeyword
    )
  );
}

/** True for `.select(columns, { count: "exact" })`: the answer carries the number of rows the whole select matches. */
function asksForCount(select: Select["chain"][number]): boolean {
  const options = select.args[1];
  return (
    !!options &&
    ts.isObjectLiteralExpression(options) &&
    options.properties.some(
      (p) => ts.isPropertyAssignment(p) && p.name.getText() === "count" && stringOf(p.initializer) === "exact"
    )
  );
}

const names = (read: Select) => read.chain.map((c) => c.name);
const isSelect = (read: Select) => names(read).includes("select") && !names(read).some((n) => WRITES.has(n));
const isPaged = (read: Select) => isSelect(read) && names(read).includes("range");

/**
 * True for a `.from(table)` with nothing chained to it: the query is kept in
 * a variable, or handed on, and finished where this check cannot follow it.
 */
const bare = (read: Select) => read.chain.length === 0;

/** True for a select read a page at a time that does not ask for the exact count beside its columns. */
function pagedWithoutCount(read: Select): boolean {
  if (!isPaged(read)) return false;
  const select = read.chain.find((c) => c.name === "select");
  return !select || !asksForCount(select) || countsOnly(select);
}

/** True when nothing in the chain says how many rows the select is prepared for. */
function unbounded(read: Select): boolean {
  if (!isSelect(read)) return false;
  const select = read.chain.find((c) => c.name === "select");
  if (select && countsOnly(select)) return false;
  if (read.chain.some((c) => LIMITS.has(c.name))) return false;
  if (read.chain.some((c) => (c.name === "eq" || c.name === "in") && NARROWS.has(c.first ?? ""))) return false;
  return true;
}

const reads = sources(join(ROOT, "src")).flatMap((path) => {
  const source = readFileSync(path, "utf8");
  return /cert_questions|question_performance/.test(source) ? tableReads(path, source) : [];
});
const label = (read: Select) => `${read.where}: ${read.table}`;

describe("the check itself", () => {
  /** What the check makes of one statement, written as a file's whole text. */
  const verdict = (statement: string) => tableReads(join(ROOT, "src", "made-up.ts"), statement).map(unbounded);

  it("objects to a select that takes every question of an exam, or every answer of a member", () => {
    expect(verdict('db.from("cert_questions").select("id, domain_id").eq("certification_id", certId);')).toEqual([true]);
    expect(
      verdict('db.from("question_performance").select("question_id").eq("user_id", userId).eq("certification_id", certId);')
    ).toEqual([true]);
    expect(verdict('db.from("question_performance").select("*").eq("user_id", userId);')).toEqual([true]);
    // An order alone does not bound anything, and a count that also returns rows is still a select of rows.
    expect(verdict('db.from("cert_questions").select("id").eq("certification_id", certId).order("id");')).toEqual([true]);
    expect(verdict('db.from("cert_questions").select("id", { count: "exact" }).eq("certification_id", certId);')).toEqual([true]);
  });

  it("accepts a select that is paged, limited, asked for by id, narrowed to an objective, or only a count", () => {
    const fine = [
      'db.from("cert_questions").select("id").eq("certification_id", certId).order("id").range(from, to);',
      'db.from("cert_questions").select("id").eq("certification_id", certId).order("id").limit(10);',
      'db.from("cert_questions").select("id, correct_index").eq("certification_id", certId).in("id", ids);',
      'db.from("cert_questions").select("id").eq("sub_objective_id", subObjectiveId).eq("is_active", true);',
      'db.from("cert_questions").select("id", { count: "exact", head: true }).eq("certification_id", certId);',
      'db.from("question_performance").select("streak").eq("user_id", userId).eq("question_id", questionId).maybeSingle();',
      'db.from("question_performance").select("id").eq("user_id", userId).in("question_id", questionIds);',
    ];
    for (const statement of fine) expect(verdict(statement), statement).toEqual([false]);
  });

  it("leaves writes and other tables alone", () => {
    expect(verdict('db.from("question_performance").update({ streak: 0 }).eq("user_id", userId);')).toEqual([false]);
    expect(verdict('db.from("question_performance").upsert(row, { onConflict: "user_id,question_id" }).select();')).toEqual([false]);
    expect(verdict('db.from("cert_domains").select("id").eq("certification_id", certId);')).toEqual([]);
  });

  it("sees a select inside a callback and one that is split over lines", () => {
    const text = [
      "const rows = await allRows((from, to) =>",
      "  db",
      '    .from("cert_questions")',
      '    .select("id")',
      '    .eq("certification_id", certId)',
      ");",
    ].join("\n");
    expect(verdict(text)).toEqual([true]);
  });

  /** Everything the check objects to in each query of some source text. */
  const faults = (text: string) =>
    tableReads(join(ROOT, "src", "made-up.ts"), text).map((read) =>
      [unbounded(read) && "unbounded", pagedWithoutCount(read) && "no count", bare(read) && "bare"].filter(Boolean)
    );

  it("objects to a paged select that does not ask for the exact count", () => {
    const paged = (select: string) =>
      `db.from("cert_questions").select(${select}).eq("certification_id", certId).order("id").range(from, to);`;
    expect(faults(paged('"id"'))).toEqual([["no count"]]);
    // A planned or estimated count is not the number of rows, and a head count returns no rows to page through.
    expect(faults(paged('"id", { count: "planned" }'))).toEqual([["no count"]]);
    expect(faults(paged('"id", { count: "exact", head: true }'))).toEqual([["no count"]]);
    // The count is read where it is written: options held in a constant cannot be checked.
    expect(faults(paged('"id", COUNTED'))).toEqual([["no count"]]);

    expect(faults(paged('"id", { count: "exact" }'))).toEqual([[]]);
    expect(faults(paged('COLUMNS, { count: "exact" }'))).toEqual([[]]);
    // A select that is not paged owes no count.
    expect(faults('db.from("cert_questions").select("id").eq("certification_id", certId).limit(10);')).toEqual([[]]);
    expect(faults('db.from("question_performance").select("id").eq("user_id", userId).in("question_id", ids);')).toEqual([[]]);
  });

  it("objects to a query that is kept in a variable and finished elsewhere", () => {
    const text = [
      'const table = db.from("cert_questions");',
      'const { data } = await table.select("id").eq("certification_id", certId);',
    ].join("\n");
    expect(faults(text)).toEqual([["bare"]]);
    expect(faults('const history = () => db.from("question_performance");')).toEqual([["bare"]]);
    expect(faults('run(db.from("cert_questions"));')).toEqual([["bare"]]);
    // A select that is kept in a variable before its range is judged as far as it is written.
    expect(faults('const query = db.from("cert_questions").select("id").eq("certification_id", certId);')).toEqual([
      ["unbounded"],
    ]);
    // Other tables are not this guard's business, however they are written.
    expect(faults('const table = db.from("cert_domains");')).toEqual([]);
  });
});

describe("selects that can take a whole exam's questions, or a member's whole history", () => {
  it("finds the selects it is meant to check", () => {
    // If the tables were renamed, or the client were used in another way, this
    // guard would pass by finding nothing. These are the two it must always see.
    const where = reads.filter(isSelect).map((read) => read.where);
    expect(where).toContain("src/server/data/questions.ts");
    expect(where).toContain("src/server/path/bank.ts");
    expect(reads.filter(isSelect).length).toBeGreaterThanOrEqual(15);
    // The same for the selects read a page at a time, which the count is asked of.
    expect(reads.filter(isPaged).length).toBeGreaterThanOrEqual(11);
  });

  it("says, in every one, how many rows it is prepared for", () => {
    const offenders = reads
      .filter(unbounded)
      .filter((read) => !KNOWN_UNBOUNDED.includes(label(read)))
      .map((read) => `${read.where}:${read.line}: an unbounded select on ${read.table}`);
    expect(offenders).toEqual([]);
  });

  it("lists as waiting for a fix only selects that still need one", () => {
    // When one of these is paged, delete its line from KNOWN_UNBOUNDED so that
    // the guard covers the file from then on.
    const stillUnbounded = reads.filter(unbounded).map(label);
    expect(KNOWN_UNBOUNDED.filter((known) => !stillUnbounded.includes(known))).toEqual([]);
  });

  it("puts the rows of every paged select in a fixed order", () => {
    // Without an order, two pages can overlap or skip a row.
    const unordered = reads
      .filter((read) => isPaged(read) && !names(read).includes("order"))
      .map((read) => `${read.where}:${read.line}: .range() without .order() on ${read.table}`);
    expect(unordered).toEqual([]);
  });

  it("asks for the exact count in every paged select", () => {
    // The count is how allRows knows that it has every row. Without it the
    // read goes on until a page comes back empty: one request more each time.
    const uncounted = reads
      .filter(pagedWithoutCount)
      .map((read) => `${read.where}:${read.line}: .range() without { count: "exact" } beside the columns, on ${read.table}`);
    expect(uncounted).toEqual([]);
  });

  it("can read every query on these tables: none is kept in a variable and finished elsewhere", () => {
    const hidden = reads
      .filter(bare)
      .map((read) => `${read.where}:${read.line}: .from("${read.table}") with nothing chained to it`);
    expect(hidden).toEqual([]);
  });

  it("pages the selects that feed the study path, the practice exams and the readiness check", () => {
    // The whole-exam reads that exist today, each a page at a time.
    const paged = reads
      .filter(isPaged)
      .map(label);
    expect(new Set(paged)).toEqual(
      new Set([
        "src/server/path/bank.ts: cert_questions",
        "src/server/data/questions.ts: cert_questions",
        "src/server/data/performance.ts: question_performance",
        "src/server/data/review.ts: question_performance",
        "src/server/services/submit-exam.ts: question_performance",
        "src/server/services/submit-exam.ts: cert_questions",
      ])
    );
  });
});
