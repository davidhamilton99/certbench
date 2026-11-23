import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// The report of a fault, watched: nothing is sent anywhere from a test.
const report = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@/server/api/report-error", () => ({ reportServerError: report }));

import { recomputeAndSnapshotReadiness, updateQuestionPerformanceForAnswers } from "../submit-exam";

type Row = Record<string, unknown>;
interface Call {
  name: string;
  args: unknown[];
}

const CERT = "cert-sy0-801";
const USER = "user-1";

/**
 * A stand-in for the Supabase client over three tables. Like the real service
 * it answers one select with at most 1,000 rows and says nothing about the
 * rest, so a read that is not paged loses rows here exactly as it does there.
 * It sends the number of rows the whole select matches only when the select
 * asked for the exact count.
 */
function fakeDb(tables: Record<string, Row[]>, failFrom?: { table: string; fromRow: number }) {
  const queries: Call[][] = [];
  const inserted: { table: string; row: Row }[] = [];
  const answer = (table: string, calls: Call[]) => {
    const args = (name: string) => calls.filter((c) => c.name === name).map((c) => c.args);
    let found = [...(tables[table] ?? [])];
    for (const [column, value] of args("eq")) found = found.filter((r) => r[column as string] === value);
    for (const [column] of args("order")) {
      found.sort((a, b) => String(a[column as string]).localeCompare(String(b[column as string])));
    }
    const [range] = args("range");
    const first = (range?.[0] as number | undefined) ?? 0;
    if (failFrom && failFrom.table === table && first >= failFrom.fromRow) {
      return { data: null, error: { message: "canceling statement due to statement timeout" } };
    }
    const [select] = args("select");
    const count = (select?.[1] as { count?: string } | undefined)?.count === "exact" ? found.length : null;
    found = range ? found.slice(first, (range[1] as number) + 1) : found;
    return { data: found.slice(0, 1000), error: null, count };
  };
  const from = (table: string) => {
    const calls: Call[] = [{ name: "from", args: [table] }];
    queries.push(calls);
    const builder: Record<string, unknown> = {};
    for (const name of ["select", "eq", "order", "range"]) {
      builder[name] = (...args: unknown[]) => {
        calls.push({ name, args });
        return builder;
      };
    }
    builder.insert = (row: Row) => {
      inserted.push({ table, row });
      return Promise.resolve({ data: null, error: null });
    };
    builder.then = (resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) =>
      Promise.resolve(answer(table, calls)).then(resolve, reject);
    return builder;
  };
  /** What was chained to each select on one table, as "name(first argument)"; a range with both its ends, a select with its options. */
  const shown = (c: Call) => {
    if (c.name === "range") return c.args.join(",");
    return c.name === "select" && c.args[1] ? `${c.args[0]}; ${JSON.stringify(c.args[1])}` : c.args[0];
  };
  const chains = (table: string) =>
    queries
      .filter((calls) => calls[0].args[0] === table && calls.some((c) => c.name === "select"))
      .map((calls) => calls.slice(1).map((c) => `${c.name}(${shown(c)})`));
  return { db: { from } as unknown as SupabaseClient, inserted, chains };
}

const id = (i: number) => `q-${String(i).padStart(5, "0")}`;

/**
 * An exam of 1,008 questions. In id order the first 1,000 are in the first
 * domain and the last 8 are the whole of the second, so a read that stops at
 * 1,000 rows finds the second domain empty.
 */
function exam() {
  const questions: Row[] = [];
  const history: Row[] = [];
  for (let i = 1; i <= 1008; i++) {
    questions.push({ id: id(i), certification_id: CERT, domain_id: i <= 1000 ? "domain-1" : "domain-2", is_active: true });
    history.push({ question_id: id(i), user_id: USER, certification_id: CERT, times_seen: 1, times_correct: 1 });
  }
  return {
    cert_domains: [
      { id: "domain-1", certification_id: CERT, domain_number: "1.0", title: "First", exam_weight: 60, sort_order: 1 },
      { id: "domain-2", certification_id: CERT, domain_number: "2.0", title: "Second", exam_weight: 40, sort_order: 2 },
    ],
    cert_questions: questions,
    question_performance: history,
  };
}

describe("recomputeAndSnapshotReadiness", () => {
  it("scores from every question and every answer of an exam that has more than 1,000", async () => {
    const { db } = fakeDb(exam());

    const readiness = await recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT });

    const second = readiness?.domain_scores.find((d) => d.domain_id === "domain-2");
    // The last eight questions, and the member's answers to them, are past the first page.
    expect(second).toMatchObject({ total_questions: 8, attempted: 8, correct: 8 });
    expect(readiness?.domain_scores.find((d) => d.domain_id === "domain-1")).toMatchObject({
      total_questions: 1000,
      attempted: 1000,
      correct: 1000,
    });
    expect(readiness?.total_questions_seen).toBe(1008);
  });

  it("reads both tables a page at a time, in a fixed order, asking for the count with each page", async () => {
    const { db, chains } = fakeDb(exam());

    await recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT });

    const questions = 'select(id, domain_id, is_active; {"count":"exact"})';
    const history = 'select(question_id, times_seen, times_correct; {"count":"exact"})';
    // Two pages for 1,008 rows, and no third request to find the end: the count says where it is.
    expect(chains("cert_questions")).toEqual([
      [questions, `eq(certification_id)`, "order(id)", "range(0,999)"],
      [questions, `eq(certification_id)`, "order(id)", "range(1000,1999)"],
    ]);
    expect(chains("question_performance")).toEqual([
      [history, "eq(user_id)", "eq(certification_id)", "order(question_id)", "range(0,999)"],
      [history, "eq(user_id)", "eq(certification_id)", "order(question_id)", "range(1000,1999)"],
    ]);
  });

  it("reads an exam and a history that fit in one page with one request each", async () => {
    const tables = exam();
    tables.cert_questions = tables.cert_questions.slice(0, 300);
    tables.question_performance = tables.question_performance.slice(0, 120);
    const { db, chains } = fakeDb(tables);

    const readiness = await recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT });

    expect(readiness?.total_questions_seen).toBe(120);
    expect(chains("cert_questions").map((chain) => chain.at(-1))).toEqual(["range(0,999)"]);
    expect(chains("question_performance").map((chain) => chain.at(-1))).toEqual(["range(0,999)"]);
  });

  it("writes the snapshot it returns", async () => {
    const { db, inserted } = fakeDb(exam());

    const readiness = await recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT });

    expect(inserted).toHaveLength(1);
    expect(inserted[0].table).toBe("readiness_snapshots");
    expect(inserted[0].row).toMatchObject({
      user_id: USER,
      certification_id: CERT,
      overall_score: readiness?.overall_score,
      total_questions_seen: 1008,
    });
  });

  it("computes no score, and records none, when a later page of the bank cannot be read", async () => {
    const { db, inserted } = fakeDb(exam(), { table: "cert_questions", fromRow: 1000 });

    await expect(recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT })).resolves.toBeNull();
    // Never a score from the first thousand rows alone.
    expect(inserted).toEqual([]);
  });

  it("computes no score, and records none, when the member's answers cannot be read", async () => {
    const { db, inserted } = fakeDb(exam(), { table: "question_performance", fromRow: 0 });

    await expect(recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT })).resolves.toBeNull();
    expect(inserted).toEqual([]);
  });

  it("leaves a retired question out of a domain's total and still counts the answers given to it", async () => {
    const tables = exam();
    tables.cert_questions[1007].is_active = false;
    const { db } = fakeDb(tables);

    const readiness = await recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT });

    expect(readiness?.domain_scores.find((d) => d.domain_id === "domain-2")).toMatchObject({
      total_questions: 7,
      attempted: 8,
    });
  });
});

describe("updateQuestionPerformanceForAnswers", () => {
  interface Write {
    op: "update" | "upsert";
    values: Row;
    id?: unknown;
  }

  /**
   * A stand-in for the member's history table: one select of the existing
   * rows, then an update or an upsert for each answer. `read` is what the
   * select answers; `failWrites` makes every write answer with an error, as
   * the real client does (it does not throw).
   */
  function historyDb(read: { data: Row[] | null; error: { message: string } | null }, failWrites = false) {
    const writes: Write[] = [];
    const written = () => Promise.resolve({ data: null, error: failWrites ? { message: "permission denied" } : null });
    const from = () => {
      const select: Record<string, unknown> = {};
      select.eq = () => select;
      select.in = () => Promise.resolve(read);
      return {
        select: () => select,
        update: (values: Row) => ({
          eq: (_column: string, id: unknown) => {
            writes.push({ op: "update", values, id });
            return written();
          },
        }),
        upsert: (values: Row) => {
          writes.push({ op: "upsert", values });
          return written();
        },
      };
    };
    return { db: { from } as unknown as SupabaseClient, writes };
  }

  const QUESTIONS = [
    { id: "q-1", correct_index: 0 },
    { id: "q-2", correct_index: 1 },
  ];
  const ANSWERS = [
    { questionId: "q-1", selectedIndex: 0 },
    { questionId: "q-2", selectedIndex: 3 },
  ];
  const record = (db: SupabaseClient, upsertNew = true) =>
    updateQuestionPerformanceForAnswers(db, {
      userId: USER,
      certificationId: CERT,
      answers: ANSWERS,
      questions: QUESTIONS,
      upsertNew,
    });

  beforeEach(() => {
    report.mockClear();
  });

  it("adds to a question's existing history and begins one for a question that is new", async () => {
    const { db, writes } = historyDb({
      data: [{ id: "row-1", question_id: "q-1", times_seen: 4, times_correct: 3, streak: 2, srs_interval_days: 6, srs_ease_factor: 2.5 }],
      error: null,
    });

    await expect(record(db)).resolves.toBe(true);

    expect(writes).toHaveLength(2);
    expect(writes[0]).toMatchObject({ op: "update", id: "row-1", values: { times_seen: 5, times_correct: 4 } });
    expect(writes[1]).toMatchObject({
      op: "upsert",
      values: { user_id: USER, question_id: "q-2", certification_id: CERT, times_seen: 1, times_correct: 0 },
    });
    expect(report).not.toHaveBeenCalled();
  });

  // The defect: a read that failed (a refusal, or the eight second limit) was
  // taken as "no history", and the upsert then replaced the member's counts,
  // streak and review schedule for every question answered.
  it("writes nothing when the member's history cannot be read, and says so", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, writes } = historyDb({ data: null, error: { message: "canceling statement due to statement timeout" } });

    await expect(record(db)).resolves.toBe(false);

    expect(writes).toEqual([]);
    expect(report).toHaveBeenCalledOnce();
    // The report names the service and carries none of the database's words.
    const [fault, place] = report.mock.calls[0] as unknown as [Error, { route: string }];
    expect(fault.message).toBe("Answer history could not be read");
    expect(place.route).toBe("service:submit-exam");
    consoleError.mockRestore();
  });

  it("writes nothing when the read answers with neither rows nor an error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, writes } = historyDb({ data: null, error: null });
    await expect(record(db)).resolves.toBe(false);
    expect(writes).toEqual([]);
    consoleError.mockRestore();
  });

  it("does not begin a history for a review answer whose question has none", async () => {
    const { db, writes } = historyDb({ data: [], error: null });
    await expect(record(db, false)).resolves.toBe(true);
    expect(writes).toEqual([]);
  });

  it("reports writes that failed, by their number, and does not send them again", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { db, writes } = historyDb({ data: [], error: null }, true);

    await expect(record(db)).resolves.toBe(true);

    expect(writes).toHaveLength(2);
    expect(consoleError).toHaveBeenCalledWith("[answers] 2 of 2 history writes failed");
    expect(report).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });

  it("does nothing at all when there are no answers", async () => {
    const { db, writes } = historyDb({ data: [], error: null });
    await expect(
      updateQuestionPerformanceForAnswers(db, { userId: USER, certificationId: CERT, answers: [], questions: [], upsertNew: true })
    ).resolves.toBe(true);
    expect(writes).toEqual([]);
  });
});
