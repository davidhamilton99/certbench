import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/contracts/common";
import type { Db } from "@/server/supabase/server";
import {
  COMMENT_NOT_SAVED,
  NOT_A_PASS_STORY,
  TESTIMONIALS_NOT_READ,
  TESTIMONIAL_NOT_UPDATED,
  insertTestimonial,
  listApprovedTestimonials,
  listPendingTestimonials,
  replaceWithPassStory,
  setTestimonialStatus,
} from "../testimonials";

type Row = Record<string, unknown>;

/** The kind of text a database answers with: it names a table and a policy. */
const DATABASE_TEXT = 'new row violates row-level security policy for table "testimonials"';

/**
 * A stand-in for a database client. `mayUpdate: false` behaves as an account's
 * own client does on this table: with no update policy, an update matches no
 * row and reports no error (migration 022). `error` is the database's own text
 * for a request that it refuses, and `code` its error code.
 */
function fakeDb(tables: Record<string, Row[]>, opts: { mayUpdate?: boolean; error?: string; code?: string } = {}) {
  const db = {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let patch: Row | null = null;
      let added: Row | null = null;
      let sort: { column: string; ascending: boolean } | null = null;
      let max = Infinity;
      const q = {
        select: () => q,
        insert: (row: Row) => ((added = row), q),
        update: (p: Row) => ((patch = p), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        // "a.eq.x,b.eq.y" as the REST layer reads it: either equality holds. true and false are booleans.
        or: (expression: string) => {
          const terms = expression.split(",").map((term) => {
            const [column, , raw] = term.split(".");
            return { column, value: raw === "true" ? true : raw === "false" ? false : raw };
          });
          filters.push((r) => terms.some(({ column, value }) => r[column] === value));
          return q;
        },
        order: (column: string, { ascending }: { ascending: boolean }) => ((sort = { column, ascending }), q),
        limit: (n: number) => ((max = n), q),
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => {
          if (opts.error) {
            return Promise.resolve({ data: null, error: { message: opts.error, code: opts.code } }).then(ok, fail);
          }
          if (added) {
            (tables[table] ??= []).push(added);
            return Promise.resolve({ data: null, error: null }).then(ok, fail);
          }
          let hit = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          if (patch) {
            if (opts.mayUpdate === false) hit = [];
            for (const row of hit) Object.assign(row, patch);
          }
          if (sort) {
            const { column, ascending } = sort;
            hit = [...hit].sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1));
          }
          return Promise.resolve({ data: hit.slice(0, max).map((r) => ({ ...r })), error: null }).then(ok, fail);
        },
      };
      return q;
    },
  };
  return db as unknown as Db;
}

/**
 * An endpoint answers its caller with an ApiError's message, and /api/story
 * is public. Whatever the database says must stay on the server.
 */
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockRestore();
});

/** The request fails with a sentence for the caller, and the database's own text goes to the server log only. */
async function expectKeptOnServer(request: Promise<unknown>, sentence: string, logged: string) {
  const error = await request.then(
    () => null,
    (err: unknown) => err
  );
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ code: "internal", message: sentence });
  expect(JSON.stringify({ message: (error as ApiError).message })).not.toContain("row-level");
  expect(consoleError).toHaveBeenCalledExactlyOnceWith(logged);
}

const story = (id: string, status: string, createdAt: string, certId: string | null = "sec") => ({
  id,
  certification_id: certId,
  passed: true,
  quote: `Story ${id} about the exam.`,
  display_name: `Person ${id}`,
  status,
  created_at: createdAt,
});

describe("setTestimonialStatus", () => {
  it("sets the status of the one testimonial", async () => {
    const rows = [story("a", "pending", "2026-11-01"), story("b", "pending", "2026-11-02")];
    await setTestimonialStatus(fakeDb({ testimonials: rows }), "a", "approved");
    expect(rows.map((r) => r.status)).toEqual(["approved", "pending"]);
  });

  // With an account's own client the update used to change no row and still
  // answer as done, so an approval was shown as "now live" and nothing was.
  it("reports an update that changed no row, and never treats it as done", async () => {
    const rows = [story("a", "pending", "2026-11-01")];
    const blocked = setTestimonialStatus(fakeDb({ testimonials: rows }, { mayUpdate: false }), "a", "approved");
    await expect(blocked).rejects.toBeInstanceOf(ApiError);
    await expect(blocked).rejects.toMatchObject({
      code: "not_found",
      message: "This testimonial could not be found, so nothing was changed.",
    });
    expect(rows[0].status).toBe("pending");

    await expect(setTestimonialStatus(fakeDb({ testimonials: rows }), "missing", "hidden")).rejects.toMatchObject({
      code: "not_found",
    });
  });

  // A "did not pass" comment waits in the same queue. Approved, it would be
  // readable by anyone with the site's public key, with the name and the result.
  it("refuses to approve a comment from someone who did not pass, and still hides one", async () => {
    const rows = [{ ...story("a", "pending", "2026-11-01"), passed: false }];
    const approving = setTestimonialStatus(fakeDb({ testimonials: rows }), "a", "approved");
    await expect(approving).rejects.toBeInstanceOf(ApiError);
    await expect(approving).rejects.toMatchObject({ code: "conflict", message: NOT_A_PASS_STORY });
    expect(rows[0].status).toBe("pending");
    expect(NOT_A_PASS_STORY).toBe(
      "This comment is from someone who did not pass the exam, so it cannot be approved. It can be hidden."
    );

    await setTestimonialStatus(fakeDb({ testimonials: rows }), "a", "hidden");
    expect(rows[0].status).toBe("hidden");
  });

  // The error used to carry the database's own text, which the endpoint returned.
  it("reports a database error as an internal error with a sentence, and logs the database's text", async () => {
    await expectKeptOnServer(
      setTestimonialStatus(fakeDb({ testimonials: [] }, { error: DATABASE_TEXT, code: "42501" }), "a", "approved"),
      TESTIMONIAL_NOT_UPDATED,
      `[testimonials] the update of a testimonial's status failed (42501): ${DATABASE_TEXT}`
    );
    expect(TESTIMONIAL_NOT_UPDATED).toBe("The testimonial could not be updated. Please try again.");
  });
});

describe("insertTestimonial", () => {
  const input = { certId: "sec", passed: true, quote: "The checkpoint showed me what to study.", displayName: "Sam K." };

  it("stores the comment for the account, to wait for review", async () => {
    const tables: Record<string, Row[]> = { testimonials: [] };
    await insertTestimonial(fakeDb(tables), "user-1", input);
    expect(tables.testimonials).toEqual([
      {
        user_id: "user-1",
        certification_id: "sec",
        passed: true,
        quote: "The checkpoint showed me what to study.",
        display_name: "Sam K.",
      },
    ]);
  });

  it("says so when the account has already sent one for this exam", async () => {
    const twice = insertTestimonial(
      fakeDb({}, { error: 'duplicate key value violates unique constraint "testimonials_user_cert_key"', code: "23505" }),
      "user-1",
      input
    );
    await expect(twice).rejects.toMatchObject({ code: "conflict", message: "You have already shared a story for this exam." });
    expect(consoleError).not.toHaveBeenCalled();
  });

  // /api/story is public: the database's text used to be returned to anyone who sent a request.
  it("answers a database fault with a sentence, and keeps the database's text in the server log", async () => {
    await expectKeptOnServer(
      insertTestimonial(fakeDb({}, { error: DATABASE_TEXT, code: "42501" }), "user-1", input),
      COMMENT_NOT_SAVED,
      `[testimonials] the insert of a testimonial failed (42501): ${DATABASE_TEXT}`
    );
    expect(COMMENT_NOT_SAVED).toBe("The comment could not be saved. Please try again.");
  });
});

// Migration 036 (written for the owner to run, not run): the public read
// policy asked only for the status, so an approved comment from someone who
// did not pass could be read with the site's public key.
describe("migration 036, the public read policy", () => {
  const sql = readFileSync(join(process.cwd(), "supabase/migrations/036_testimonials_read_policy.sql"), "utf8");
  const statements = sql
    .split(/\r?\n/)
    .filter((line) => !line.startsWith("--"))
    .join("\n");

  it("recreates the one read policy for approved pass stories only, in one transaction", () => {
    expect(statements).toMatch(/begin;\s+[\s\S]*commit;/);
    expect(statements).toContain('drop policy "Anyone reads approved testimonials" on public.testimonials;');
    expect(statements.replace(/\s+/g, " ")).toContain(
      'create policy "Anyone reads approved testimonials" on public.testimonials for select using (status = \'approved\' and passed);'
    );
    // Nothing else: no other policy, table or row is touched.
    expect(statements.match(/\b(?:drop|create|alter|insert|update|delete|grant|revoke)\b/gi)).toEqual(["drop", "create"]);
  });

  it("says first that it has not been run, gives the read-only query, and how to undo it", () => {
    expect(sql).toContain("THIS FILE HAS NOT BEEN RUN.");
    expect(sql).toContain("from pg_policies");
    expect(sql).toContain(
      "--   create policy \"Anyone reads approved testimonials\" on public.testimonials for select using (status = 'approved');"
    );
  });
});

// One row for an account and an exam. A pass story sent after a "did not pass"
// comment met the unique index, and the form thanked the person for a story
// that was never stored.
describe("replaceWithPassStory", () => {
  const input = { certId: "sec", quote: "I passed. The checkpoint showed me what to study.", displayName: "Sam K." };
  const own = (status: string, passed: boolean, over: Row = {}) => ({
    ...story("mine", status, "2026-11-01"),
    user_id: "user-1",
    passed,
    quote: "Subnetting was hard for me.",
    ...over,
  });

  it.each([
    ["a did not pass comment waiting for review", "pending", false],
    ["a did not pass comment that was hidden", "hidden", false],
    ["a did not pass comment that was approved", "approved", false],
    ["a pass story still waiting for review", "pending", true],
  ])("takes the place of %s, to wait for review again", async (_, status, passed) => {
    const rows = [own(status, passed), own("pending", false, { id: "someone-else", user_id: "user-2" })];
    expect(await replaceWithPassStory(fakeDb({ testimonials: rows }), "user-1", input)).toBe(true);
    expect(rows[0]).toMatchObject({
      passed: true,
      quote: input.quote,
      display_name: "Sam K.",
      status: "pending",
      certification_id: "sec",
    });
    // Another account's row is not touched.
    expect(rows[1]).toMatchObject({ user_id: "user-2", passed: false, quote: "Subnetting was hard for me." });
  });

  it.each(["approved", "hidden"])("leaves a pass story that was %s as it is, and answers false", async (status) => {
    const rows = [own(status, true, { quote: "The first story." })];
    expect(await replaceWithPassStory(fakeDb({ testimonials: rows }), "user-1", input)).toBe(false);
    expect(rows[0]).toMatchObject({ quote: "The first story.", status });
  });

  it("leaves the comment for another exam alone", async () => {
    const rows = [own("pending", false, { certification_id: "net" })];
    expect(await replaceWithPassStory(fakeDb({ testimonials: rows }), "user-1", input)).toBe(false);
    expect(rows[0].passed).toBe(false);
  });

  it("answers a database fault with a sentence, and keeps the database's text in the server log", async () => {
    await expectKeptOnServer(
      replaceWithPassStory(fakeDb({}, { error: DATABASE_TEXT, code: "42501" }), "user-1", input),
      COMMENT_NOT_SAVED,
      `[testimonials] the replacement of a testimonial failed (42501): ${DATABASE_TEXT}`
    );
  });
});

describe("listApprovedTestimonials", () => {
  it("lists approved comments from people who passed, newest first, up to the limit", async () => {
    const db = fakeDb({
      testimonials: [
        story("older", "approved", "2026-11-01"),
        story("waiting", "pending", "2026-11-20"),
        story("newest", "approved", "2026-11-15"),
        { ...story("did-not-pass", "approved", "2026-11-18"), passed: false },
        story("middle", "approved", "2026-11-10"),
      ],
      certifications: [{ id: "sec", name: "CompTIA Security+" }],
    });
    expect((await listApprovedTestimonials(db, 2)).map((t) => t.id)).toEqual(["newest", "middle"]);
  });

  it("reports a database error with a sentence, and logs the database's text", async () => {
    await expectKeptOnServer(
      listApprovedTestimonials(fakeDb({}, { error: DATABASE_TEXT })),
      TESTIMONIALS_NOT_READ,
      `[testimonials] the read of the approved testimonials failed: ${DATABASE_TEXT}`
    );
  });
});

describe("listPendingTestimonials", () => {
  it("lists what is waiting for review, oldest first, with each exam's name", async () => {
    const db = fakeDb({
      testimonials: [
        story("newer", "pending", "2026-11-20"),
        story("live", "approved", "2026-11-01"),
        story("older", "pending", "2026-11-10", null),
        story("gone", "hidden", "2026-11-05"),
      ],
      certifications: [{ id: "sec", name: "CompTIA Security+" }],
    });

    expect(await listPendingTestimonials(db)).toEqual([
      {
        id: "older",
        passed: true,
        quote: "Story older about the exam.",
        displayName: "Person older",
        certName: null,
        createdAt: "2026-11-10",
      },
      {
        id: "newer",
        passed: true,
        quote: "Story newer about the exam.",
        displayName: "Person newer",
        certName: "CompTIA Security+",
        createdAt: "2026-11-20",
      },
    ]);
  });

  it("reports a database error instead of an empty queue, with a sentence, and logs the database's text", async () => {
    await expectKeptOnServer(
      listPendingTestimonials(fakeDb({}, { error: DATABASE_TEXT })),
      TESTIMONIALS_NOT_READ,
      `[testimonials] the read of the testimonials waiting for review failed: ${DATABASE_TEXT}`
    );
    expect(TESTIMONIALS_NOT_READ).toBe("The testimonials could not be read. Please try again.");
  });
});
