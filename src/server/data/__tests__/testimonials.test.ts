import { describe, expect, it } from "vitest";
import { ApiError } from "@/contracts/common";
import type { Db } from "@/server/supabase/server";
import { listPendingTestimonials, setTestimonialStatus } from "../testimonials";

type Row = Record<string, unknown>;

/**
 * A stand-in for a database client. `mayUpdate: false` behaves as an account's
 * own client does on this table: with no update policy, an update matches no
 * row and reports no error (migration 022).
 */
function fakeDb(tables: Record<string, Row[]>, opts: { mayUpdate?: boolean; error?: string } = {}) {
  const db = {
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      let patch: Row | null = null;
      let sort: { column: string; ascending: boolean } | null = null;
      const q = {
        select: () => q,
        update: (p: Row) => ((patch = p), q),
        eq: (c: string, v: unknown) => (filters.push((r) => r[c] === v), q),
        in: (c: string, vs: unknown[]) => (filters.push((r) => vs.includes(r[c])), q),
        order: (column: string, { ascending }: { ascending: boolean }) => ((sort = { column, ascending }), q),
        then: (ok: (v: unknown) => unknown, fail?: (e: unknown) => unknown) => {
          if (opts.error) return Promise.resolve({ data: null, error: { message: opts.error } }).then(ok, fail);
          let hit = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          if (patch) {
            if (opts.mayUpdate === false) hit = [];
            for (const row of hit) Object.assign(row, patch);
          }
          if (sort) {
            const { column, ascending } = sort;
            hit = [...hit].sort((a, b) => String(a[column]).localeCompare(String(b[column])) * (ascending ? 1 : -1));
          }
          return Promise.resolve({ data: hit.map((r) => ({ ...r })), error: null }).then(ok, fail);
        },
      };
      return q;
    },
  };
  return db as unknown as Db;
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

  it("reports a database error as an internal error", async () => {
    await expect(
      setTestimonialStatus(fakeDb({ testimonials: [] }, { error: "connection lost" }), "a", "approved")
    ).rejects.toMatchObject({ code: "internal" });
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

  it("reports a database error instead of an empty queue", async () => {
    await expect(listPendingTestimonials(fakeDb({}, { error: "connection lost" }))).rejects.toMatchObject({
      code: "internal",
    });
  });
});
