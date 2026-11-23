import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { ACCOUNT_NOT_CHECKED } from "@/server/data/account-errors";
import { userMessage } from "@/lib/errors/user-message";
import { EXAM_NOT_IN_PLAN, canAccessCert, listEnrollments, otherVersionIds, requireCertAccess } from "../enrollments";

type Result = { data: unknown; error: { message: string } | null };

/**
 * A stand-in for the Supabase client that answers each read in turn: the
 * reads of one table are given in the order the code makes them.
 */
function fakeDb(script: Record<string, Result[]>): Db {
  const next = (table: string): Result => script[table]?.shift() ?? { data: null, error: null };
  const from = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      limit: () => builder,
      order: () => builder,
      maybeSingle: async () => next(table),
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(next(table)).then(resolve, reject),
    };
    return builder;
  };
  return { from } as unknown as Db;
}

const ok = (data: unknown): Result => ({ data, error: null });
const failed = (message: string): Result => ({ data: null, error: { message } });
const SY0_701 = "security-plus-sy0-701";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function refusal(work: Promise<unknown>): Promise<ApiError> {
  const outcome = await work.then(
    (value) => value,
    (error: unknown) => error
  );
  expect(outcome).toBeInstanceOf(ApiError);
  return outcome as ApiError;
}

describe("canAccessCert", () => {
  it("opens an exam the account is enrolled in", async () => {
    const db = fakeDb({ user_enrollments: [ok({ id: "enrollment-1" })] });
    expect(await canAccessCert(db, "user-1", "cert-1")).toBe(true);
  });

  it("opens the other version of an exam the account is enrolled in", async () => {
    const db = fakeDb({
      user_enrollments: [ok(null), ok([{ id: "enrollment-801" }])],
      certifications: [ok({ slug: SY0_701 }), ok([{ id: "cert-801" }])],
    });
    expect(await canAccessCert(db, "user-1", "cert-701")).toBe(true);
  });

  it("opens every exam to the owner", async () => {
    const db = fakeDb({ profiles: [ok({ role: "admin" })] });
    expect(await canAccessCert(db, "user-1", "cert-1")).toBe(true);
  });

  it("refuses an exam the account has not added", async () => {
    const db = fakeDb({ profiles: [ok({ role: "user" })] });
    expect(await canAccessCert(db, "user-1", "cert-1")).toBe(false);
  });

  it("does not take a failed read for 'not enrolled'", async () => {
    const cases: Record<string, Result[]>[] = [
      { user_enrollments: [failed("connection refused")] },
      { user_enrollments: [ok(null)], certifications: [failed("timeout")] },
      { user_enrollments: [ok(null)], certifications: [ok({ slug: SY0_701 }), failed("timeout")] },
      { user_enrollments: [ok(null), failed("timeout")], certifications: [ok({ slug: SY0_701 }), ok([{ id: "cert-801" }])] },
      { user_enrollments: [ok(null)], profiles: [failed("timeout")] },
    ];
    for (const script of cases) {
      const error = await refusal(canAccessCert(fakeDb(script), "user-1", "cert-1"));
      expect(error.code).toBe("internal");
      expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
    }
  });
});

// The lock on the endpoints that serve one exam to Pro members.
describe("requireCertAccess", () => {
  it("lets through an exam the plan covers, and the other version of it", async () => {
    await expect(
      requireCertAccess(fakeDb({ user_enrollments: [ok({ id: "enrollment-1" })] }), "user-1", "cert-1")
    ).resolves.toBeUndefined();

    const versions = fakeDb({
      user_enrollments: [ok(null), ok([{ id: "enrollment-801" }])],
      certifications: [ok({ slug: SY0_701 }), ok([{ id: "cert-801" }])],
    });
    await expect(requireCertAccess(versions, "user-1", "cert-701")).resolves.toBeUndefined();
  });

  it("refuses an exam the plan does not cover, in a sentence the member can read", async () => {
    const error = await refusal(requireCertAccess(fakeDb({ profiles: [ok({ role: "user" })] }), "user-1", "cert-1"));
    expect(error.code).toBe("forbidden");
    expect(error.status).toBe(403);
    expect(error.message).toBe(EXAM_NOT_IN_PLAN);
    // The page shows this sentence, not the bare code.
    expect(userMessage(error)).toBe("That exam is not included in your plan.");
  });

  it("lets the owner through", async () => {
    await expect(
      requireCertAccess(fakeDb({ profiles: [ok({ role: "admin" })] }), "user-1", "cert-1")
    ).resolves.toBeUndefined();
  });

  it("does not refuse a member whose account could not be read: it says so", async () => {
    const error = await refusal(
      requireCertAccess(fakeDb({ user_enrollments: [failed("connection refused")] }), "user-1", "cert-1")
    );
    expect(error.code).toBe("internal");
    expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
  });
});

describe("listEnrollments", () => {
  it("lists the account's active exams", async () => {
    const db = fakeDb({
      user_enrollments: [
        ok([{ id: "enrollment-1", certification_id: "cert-1", exam_date: "2027-03-01", enrolled_at: "2026-11-01T00:00:00Z" }]),
      ],
    });
    expect(await listEnrollments(db, "user-1")).toEqual([
      { id: "enrollment-1", certificationId: "cert-1", examDate: "2027-03-01", enrolledAt: "2026-11-01T00:00:00Z" },
    ]);
  });

  // An "internal" error's message is returned by the endpoint that threw it.
  it("keeps the database's own words out of the error when the read fails", async () => {
    const db = fakeDb({ user_enrollments: [failed('relation "user_enrollments" does not exist')] });
    const error = await refusal(listEnrollments(db, "user-1"));
    expect(error.code).toBe("internal");
    expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
  });
});

describe("otherVersionIds", () => {
  it("is empty for an exam taught in one version", async () => {
    const db = fakeDb({ certifications: [ok({ slug: "network-plus-n10-009" })] });
    expect(await otherVersionIds(db, "cert-net")).toEqual([]);
  });

  it("gives the other version of Security+", async () => {
    const db = fakeDb({ certifications: [ok({ slug: SY0_701 }), ok([{ id: "cert-801" }])] });
    expect(await otherVersionIds(db, "cert-701")).toEqual(["cert-801"]);
  });

  it("does not take a failed read for 'no other version'", async () => {
    const error = await refusal(otherVersionIds(fakeDb({ certifications: [failed("timeout")] }), "cert-701"));
    expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
  });
});
