import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputeAndSnapshotReadiness } from "../submit-exam";

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
    found = range ? found.slice(first, (range[1] as number) + 1) : found;
    return { data: found.slice(0, 1000), error: null };
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
  /** What was chained to each select on one table, as "name(first argument)". */
  const chains = (table: string) =>
    queries
      .filter((calls) => calls[0].args[0] === table && calls.some((c) => c.name === "select"))
      .map((calls) => calls.slice(1).map((c) => `${c.name}(${c.name === "range" ? c.args.join(",") : c.args[0]})`));
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

  it("reads both tables a page at a time, in a fixed order", async () => {
    const { db, chains } = fakeDb(exam());

    await recomputeAndSnapshotReadiness(db, { userId: USER, certificationId: CERT });

    expect(chains("cert_questions")).toEqual([
      ["select(id, domain_id, is_active)", `eq(certification_id)`, "order(id)", "range(0,999)"],
      ["select(id, domain_id, is_active)", `eq(certification_id)`, "order(id)", "range(1000,1999)"],
    ]);
    expect(chains("question_performance")).toEqual([
      ["select(question_id, times_seen, times_correct)", "eq(user_id)", "eq(certification_id)", "order(question_id)", "range(0,999)"],
      ["select(question_id, times_seen, times_correct)", "eq(user_id)", "eq(certification_id)", "order(question_id)", "range(1000,1999)"],
    ]);
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
