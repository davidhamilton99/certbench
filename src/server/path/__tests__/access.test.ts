import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { ACCOUNT_NOT_CHECKED } from "@/server/data/account-errors";
import { getPathAccess } from "../access";

type Result = { data: unknown; error: { message: string } | null };

/** What each table answers: `one` to a single-row read, `many` to a list read. */
type Tables = Record<string, { one?: Result; many?: Result }>;

/**
 * A stand-in for the Supabase client: every filter returns the same builder,
 * a single-row read answers with the table's `one`, a list read with `many`.
 */
function fakeDb(tables: Tables): Db {
  const from = (table: string) => {
    const builder = {
      select: () => builder,
      eq: () => builder,
      in: () => builder,
      limit: () => builder,
      maybeSingle: async () => tables[table]?.one ?? { data: null, error: null },
      then: (resolve: (value: Result) => unknown, reject: (reason: unknown) => unknown) =>
        Promise.resolve(tables[table]?.many ?? { data: [], error: null }).then(resolve, reject),
    };
    return builder;
  };
  return { from } as unknown as Db;
}

const user = { id: "user-1" } as User;
const CERT = "cert-security-plus";
const failed = (message: string): Result => ({ data: null, error: { message } });
const pro: Result = { data: { plan: "pro", status: "active" }, error: null };

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

async function refusal(tables: Tables): Promise<ApiError> {
  const outcome = await getPathAccess(fakeDb(tables), user, CERT).then(
    (access) => access,
    (error: unknown) => error
  );
  expect(outcome).toBeInstanceOf(ApiError);
  return outcome as ApiError;
}

describe("getPathAccess", () => {
  it("gives a visitor without an account the introductory questions only", async () => {
    expect(await getPathAccess(fakeDb({}), null, CERT)).toEqual({ level: "anonymous", proPlan: false });
  });

  it("gives a free account the free part of the study path", async () => {
    const db = fakeDb({ profiles: { one: { data: { role: "user" }, error: null } } });
    expect(await getPathAccess(db, user, CERT)).toEqual({ level: "free", proPlan: false });
  });

  it("opens the whole study path to a Pro member enrolled in this exam", async () => {
    const db = fakeDb({
      user_subscriptions: { one: pro },
      user_enrollments: { one: { data: { id: "enrollment-1" }, error: null } },
    });
    expect(await getPathAccess(db, user, CERT)).toEqual({ level: "pro", proPlan: true });
  });

  it("counts a trial as Pro", async () => {
    const db = fakeDb({
      user_subscriptions: { one: { data: { plan: "pro", status: "trialing" }, error: null } },
      user_enrollments: { one: { data: { id: "enrollment-1" }, error: null } },
    });
    expect((await getPathAccess(db, user, CERT)).level).toBe("pro");
  });

  it("offers a Pro member an exam they have not added, instead of Pro again", async () => {
    const db = fakeDb({ user_subscriptions: { one: pro } });
    expect(await getPathAccess(db, user, CERT)).toEqual({ level: "free", proPlan: true });
  });

  it("does not count a plan that has lapsed", async () => {
    for (const status of ["past_due", "canceled", "unpaid", "incomplete"]) {
      const db = fakeDb({
        user_subscriptions: { one: { data: { plan: "pro", status }, error: null } },
        user_enrollments: { one: { data: { id: "enrollment-1" }, error: null } },
      });
      expect(await getPathAccess(db, user, CERT), status).toEqual({ level: "free", proPlan: false });
    }
  });

  it("always lets the owner through", async () => {
    const db = fakeDb({ profiles: { one: { data: { role: "admin" }, error: null } } });
    expect(await getPathAccess(db, user, CERT)).toEqual({ level: "pro", proPlan: true });
  });

  it("never answers 'free' when the plan could not be read", async () => {
    const error = await refusal({ user_subscriptions: { one: failed("connection refused") } });
    expect(error.code).toBe("internal");
    expect(error.status).toBe(500);
    expect(error.message).toBe("Your account could not be checked. Please try again.");
    expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
  });

  it("never answers 'free' when the role could not be read", async () => {
    const error = await refusal({ user_subscriptions: { one: pro }, profiles: { one: failed("timeout") } });
    expect(error.code).toBe("internal");
    expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
  });

  it("never answers 'not enrolled' when the enrollment could not be read", async () => {
    const error = await refusal({
      user_subscriptions: { one: pro },
      user_enrollments: { one: failed("statement timeout") },
    });
    expect(error.code).toBe("internal");
    expect(error.message).toBe(ACCOUNT_NOT_CHECKED);
  });

  it("keeps the database's own words out of the answer", async () => {
    const error = await refusal({ user_subscriptions: { one: failed("FATAL: password authentication failed") } });
    expect(error.message).not.toContain("FATAL");
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("FATAL: password authentication failed"));
  });
});
