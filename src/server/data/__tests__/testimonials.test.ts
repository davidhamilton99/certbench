import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/contracts/common";
import type { Db } from "@/server/supabase/server";
import {
  COMMENT_NOT_SAVED,
  TESTIMONIALS_NOT_READ,
  TESTIMONIAL_NOT_UPDATED,
  insertTestimonial,
  listApprovedTestimonials,
  listPendingTestimonials,
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
