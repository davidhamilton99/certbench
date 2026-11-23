import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * makeOnlyActiveEnrollment against a stand-in for the user_enrollments table.
 *
 * The table holds one row per account and exam, and nothing in it stops an
 * account from having several active rows. Every active row is an exam that
 * Pro opens (canAccessCert), so "only one active" has to hold however the
 * statements of requests sent at the same moment are interleaved. Until
 * November 2026 the others were switched off before this exam was switched on:
 * two requests at once left two exams active, and five left all five.
 */

type Row = { user_id: string; certification_id: string; is_active: boolean; exam_date: string | null };

const h = vi.hoisted(() => {
  const state = {
    rows: [] as Row[],
    /** Microtask turns a statement waits before the database applies it. */
    delay: () => 0,
    /** Every statement in the order the database applied it. */
    log: [] as string[],
    /** Applies a statement after a few turns of the microtask queue, as a round trip to the database would. */
    applyLater: async <T,>(statement: () => T): Promise<T> => {
      for (let turns = state.delay(); turns > 0; turns--) await Promise.resolve();
      return statement();
    },
  };
  return state;
});

vi.mock("@/server/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "user_enrollments") throw new Error(`unexpected table ${table}`);
      return {
        update: (patch: Partial<Row>) => {
          const filters: ((row: Row) => boolean)[] = [];
          const query = {
            eq: (column: keyof Row, value: unknown) => {
              filters.push((row) => row[column] === value);
              return query;
            },
            neq: (column: keyof Row, value: unknown) => {
              filters.push((row) => row[column] !== value);
              return query;
            },
            then: (resolve: (value: { error: null }) => unknown, reject: (reason: unknown) => unknown) =>
              h.applyLater(() => {
                for (const row of h.rows) if (filters.every((keep) => keep(row))) Object.assign(row, patch);
                h.log.push(`update ${JSON.stringify(patch)}`);
                return { error: null };
              }).then(resolve, reject),
          };
          return query;
        },
        upsert: (row: Partial<Row> & { user_id: string; certification_id: string }) => ({
          then: (resolve: (value: { error: null }) => unknown, reject: (reason: unknown) => unknown) =>
            h.applyLater(() => {
              // On a conflict only the columns sent are changed, as PostgREST merges them.
              const existing = h.rows.find(
                (r) => r.user_id === row.user_id && r.certification_id === row.certification_id
              );
              if (existing) Object.assign(existing, row);
              else h.rows.push({ is_active: false, exam_date: null, ...row });
              h.log.push(`upsert ${row.certification_id}`);
              return { error: null };
            }).then(resolve, reject),
        }),
      };
    },
  }),
}));

import { makeOnlyActiveEnrollment } from "../enrollment-writes";

const EXAMS = ["sec-701", "sec-801", "net-009", "a-1201", "a-1202"];

/** The exams the account has active, which are the exams Pro opens. */
const activeExams = (userId = "user-1") =>
  h.rows.filter((row) => row.user_id === userId && row.is_active).map((row) => row.certification_id);

/** A small seeded generator (0 to 3 turns), so that every run tries the same interleavings. */
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state % 4;
  };
}

beforeEach(() => {
  h.rows = [];
  h.log = [];
  h.delay = () => 0;
});

describe("makeOnlyActiveEnrollment", () => {
  it("makes the exam the account's only active one and keeps the others as inactive rows", async () => {
    await makeOnlyActiveEnrollment("user-1", "sec-701", "2027-03-01");
    await makeOnlyActiveEnrollment("user-1", "net-009", undefined);

    expect(activeExams()).toEqual(["net-009"]);
    // Switched off, never deleted.
    expect(h.rows.map((row) => row.certification_id).sort()).toEqual(["net-009", "sec-701"]);
  });

  it("switches this exam on before it switches the others off", async () => {
    await makeOnlyActiveEnrollment("user-1", "sec-701", undefined);
    expect(h.log).toEqual(["upsert sec-701", 'update {"is_active":false}']);
  });

  it("keeps the exam date the enrollment had when no date is sent, and sets one that is sent", async () => {
    await makeOnlyActiveEnrollment("user-1", "sec-701", "2027-03-01");
    await makeOnlyActiveEnrollment("user-1", "sec-701", undefined);
    expect(h.rows[0].exam_date).toBe("2027-03-01");

    await makeOnlyActiveEnrollment("user-1", "sec-701", null);
    expect(h.rows[0].exam_date).toBeNull();
  });

  it("leaves the exams of other accounts as they are", async () => {
    h.rows = [{ user_id: "user-2", certification_id: "net-009", is_active: true, exam_date: null }];
    await makeOnlyActiveEnrollment("user-1", "sec-701", undefined);
    expect(activeExams("user-2")).toEqual(["net-009"]);
    expect(activeExams("user-1")).toEqual(["sec-701"]);
  });
});

describe("makeOnlyActiveEnrollment: requests sent at the same moment", () => {
  it("leaves at most one exam active when two requests run in step", async () => {
    await Promise.all([
      makeOnlyActiveEnrollment("user-1", "sec-701", undefined),
      makeOnlyActiveEnrollment("user-1", "net-009", undefined),
    ]);
    expect(activeExams().length).toBeLessThanOrEqual(1);
  });

  it("leaves at most one exam active when five requests run in step", async () => {
    await Promise.all(EXAMS.map((exam) => makeOnlyActiveEnrollment("user-1", exam, undefined)));
    expect(activeExams().length).toBeLessThanOrEqual(1);
  });

  it("leaves at most one exam active however two or five requests interleave", async () => {
    for (let seed = 1; seed <= 200; seed++) {
      for (const count of [2, 5]) {
        h.rows = [];
        h.delay = seeded(seed * 7 + count);
        // An account that already studies one exam, as most do.
        h.rows.push({ user_id: "user-1", certification_id: "a-1202", is_active: true, exam_date: null });

        await Promise.all(EXAMS.slice(0, count).map((exam) => makeOnlyActiveEnrollment("user-1", exam, undefined)));

        expect(activeExams().length, `seed ${seed}, ${count} requests: ${activeExams().join(", ")}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it("makes the exam active again when the same account then enrolls on its own", async () => {
    await Promise.all(EXAMS.map((exam) => makeOnlyActiveEnrollment("user-1", exam, undefined)));
    await makeOnlyActiveEnrollment("user-1", "sec-801", undefined);
    expect(activeExams()).toEqual(["sec-801"]);
  });
});

// Accounts may only read their enrollments (migration 027), and that lock is
// what keeps one plan to the exams it covers. Migration 027 is run by hand, so
// the read-only check the owner runs before 031 shows it as well.
describe("migration 031: the owner's first check covers the enrollments lock", () => {
  const MIGRATIONS = join(process.cwd(), "supabase/migrations");
  /** A migration's comments as one line of lower-case text. */
  const comments = (file: string) =>
    readFileSync(join(MIGRATIONS, file), "utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim().startsWith("--"))
      .map((line) => line.trim().replace(/^--\s?/, ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .toLowerCase();
  const header = comments("031_restrict_self_service_writes.sql");

  it("lists the policies of all three tables that decide access", () => {
    expect(header).toContain(
      "select tablename, policyname, cmd from pg_policies where schemaname = 'public' and tablename in ('user_subscriptions', 'profiles', 'user_enrollments') order by tablename, policyname;"
    );
  });

  it("expects the one policy that migration 027 makes", () => {
    expect(header).toContain('one row: "users read own enrollments" (select)');
    const made = readFileSync(join(MIGRATIONS, "027_enrollments_server_writes.sql"), "utf8");
    expect(made).toMatch(/create policy "Users read own enrollments"\s+on public\.user_enrollments\s+for select/);
  });

  it("shows whether row level security is on for the three tables", () => {
    expect(header).toContain(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relname in ('profiles', 'user_subscriptions', 'user_enrollments') order by relname;"
    );
  });
});
