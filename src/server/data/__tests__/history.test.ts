import { describe, expect, it } from "vitest";
import type { Db } from "@/server/supabase/server";
import { listPerformance, listPerformanceWithDomains } from "../performance";
import { listMissedQuestions } from "../review";

type Row = Record<string, unknown>;
interface Call {
  name: string;
  args: unknown[];
}

/**
 * A stand-in for the Supabase client over two tables. Like the real service
 * it gives one answer at most `cap` rows, whatever range was asked for, and
 * sends the number of rows the whole select matches only when the select
 * asked for the exact count.
 */
function fakeDb(tables: Record<string, Row[]>, cap = 1000) {
  const queries: { table: string; calls: Call[] }[] = [];
  const answer = (table: string, calls: Call[]) => {
    const args = (name: string) => calls.filter((c) => c.name === name).map((c) => c.args);
    let found = [...(tables[table] ?? [])];
    for (const [column, value] of args("eq")) found = found.filter((r) => r[column as string] === value);
    for (const [column, value] of args("gt")) found = found.filter((r) => (r[column as string] as number) > (value as number));
    for (const [column, values] of args("in")) found = found.filter((r) => (values as unknown[]).includes(r[column as string]));
    for (const [column] of args("order")) {
      found.sort((a, b) => String(a[column as string]).localeCompare(String(b[column as string])));
    }
    const [select] = args("select");
    const count = (select?.[1] as { count?: string } | undefined)?.count === "exact" ? found.length : null;
    const [range] = args("range");
    if (range) found = found.slice(range[0] as number, (range[1] as number) + 1);
    return { data: found.slice(0, cap), count, error: null };
  };
  const from = (table: string) => {
    const calls: Call[] = [];
    queries.push({ table, calls });
    const builder: Record<string, unknown> = {};
    for (const name of ["select", "eq", "gt", "in", "order", "range"]) {
      builder[name] = (...args: unknown[]) => {
        calls.push({ name, args });
        return builder;
      };
    }
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(answer(table, calls)).then(resolve, reject);
    return builder;
  };
  /** The ranges asked of one table, in order. */
  const ranges = (table: string) =>
    queries.filter((q) => q.table === table).flatMap((q) => q.calls.filter((c) => c.name === "range").map((c) => c.args));
  return { db: { from } as unknown as Db, ranges };
}

const CERT = "cert-sy0-801";
const USER = "user-1";
const id = (i: number) => `q-${String(i).padStart(5, "0")}`;

/** One member's answer to question `i`: seen twice, both correct unless said otherwise. */
const answered = (i: number, overrides: Row = {}): Row => ({
  question_id: id(i),
  user_id: USER,
  certification_id: CERT,
  times_seen: 2,
  times_correct: 2,
  last_seen_at: "2026-11-20T10:00:00Z",
  srs_next_review_at: null,
  suspended_at: null,
  ...overrides,
});

const question = (i: number, overrides: Row = {}): Row => ({
  id: id(i),
  certification_id: CERT,
  domain_id: `domain-${(i % 5) + 1}`,
  sub_objective_id: null,
  question_text: `Question ${i}?`,
  options: [
    { text: "Right", is_correct: true },
    { text: "Wrong", is_correct: false },
  ],
  correct_index: 0,
  explanation: "Because.",
  difficulty: 2,
  is_active: true,
  ...overrides,
});

const many = (n: number, make: (i: number) => Row) => Array.from({ length: n }, (_, i) => make(i));

describe("a member's answer history for one exam", () => {
  it("is read whole when it runs past one page: 1,008 answers, not 1,000", async () => {
    const history = [
      ...many(1008, (i) => answered(i)),
      answered(5000, { user_id: "another-member" }),
      answered(6000, { certification_id: "another-exam" }),
    ];
    const { db, ranges } = fakeDb({ question_performance: history });

    const rows = await listPerformance(db, USER, CERT);

    expect(rows).toHaveLength(1008);
    expect(rows[0].question_id).toBe(id(0));
    expect(rows.at(-1)?.question_id).toBe(id(1007));
    expect(ranges("question_performance")).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("costs one request when it fits in one page, because the select asks for the count", async () => {
    const { db, ranges } = fakeDb({ question_performance: many(240, (i) => answered(i)) });
    expect(await listPerformance(db, USER, CERT)).toHaveLength(240);
    expect(ranges("question_performance")).toEqual([[0, 999]]);
  });

  it("is read whole when the database gives fewer rows to one answer than a page asks for", async () => {
    const { db } = fakeDb({ question_performance: many(1008, (i) => answered(i)) }, 300);
    const rows = await listPerformance(db, USER, CERT);
    expect(new Set(rows.map((r) => r.question_id)).size).toBe(1008);
  });

  it("carries each answer's domain, and leaves out an answer whose question no longer exists", async () => {
    const { db, ranges } = fakeDb({
      question_performance: [...many(1008, (i) => answered(i)), answered(9999)],
      cert_questions: many(1008, (i) => question(i)),
    });

    const rows = await listPerformanceWithDomains(db, USER, CERT);

    expect(rows).toHaveLength(1008);
    expect(rows.find((r) => r.question_id === id(1007))).toMatchObject({ domain_id: "domain-3", times_seen: 2, times_correct: 2 });
    expect(rows.some((r) => r.question_id === id(9999))).toBe(false);
    // Both tables a page at a time, and neither asked a third time to find its end.
    expect(ranges("question_performance")).toHaveLength(2);
    expect(ranges("cert_questions")).toHaveLength(2);
  });
});

describe("the questions a member has missed", () => {
  it("are found wherever they lie in a history of more than 1,000 answers, the least accurate first", async () => {
    const history = many(1008, (i) => answered(i));
    // Two misses past the first page, and one before it.
    history[1005] = answered(1005, { times_seen: 4, times_correct: 0 });
    history[1002] = answered(1002, { times_seen: 4, times_correct: 2 });
    history[7] = answered(7, { times_seen: 4, times_correct: 3 });
    const { db, ranges } = fakeDb({ question_performance: history, cert_questions: many(1008, (i) => question(i)) });

    const missed = await listMissedQuestions(db, USER, CERT);

    expect(missed.map((m) => [m.question.id, m.timesCorrect, m.timesSeen])).toEqual([
      [id(1005), 0, 4],
      [id(1002), 2, 4],
      [id(7), 3, 4],
    ]);
    expect(missed[0].question.question_text).toBe("Question 1005?");
    expect(ranges("question_performance")).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it("are read in one request from a history that fits in one page, and never include a question that was not seen", async () => {
    const history = [
      answered(1, { times_seen: 3, times_correct: 1 }),
      answered(2),
      answered(3, { times_seen: 0, times_correct: 0 }),
    ];
    const { db, ranges } = fakeDb({ question_performance: history, cert_questions: many(5, (i) => question(i)) });

    const missed = await listMissedQuestions(db, USER, CERT);

    expect(missed.map((m) => m.question.id)).toEqual([id(1)]);
    expect(ranges("question_performance")).toEqual([[0, 999]]);
  });

  it("keeps to the number asked for", async () => {
    const history = many(40, (i) => answered(i, { times_seen: 2, times_correct: 1 }));
    const { db } = fakeDb({ question_performance: history, cert_questions: many(40, (i) => question(i)) });
    expect(await listMissedQuestions(db, USER, CERT, 5)).toHaveLength(5);
  });
});
