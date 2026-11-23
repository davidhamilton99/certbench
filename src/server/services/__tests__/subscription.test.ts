import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The service module imports the admin client, whose env validation would
// fail outside Next; the pure quota logic under test never touches it.
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { ApiError } from "@/contracts/common";
import type { Db } from "@/server/supabase/server";
import {
  FREE_DAILY_QUESTION_LIMIT,
  assertCanStartQuiz,
  getUserPlan,
  quizQuotaError,
} from "../subscription";

describe("quizQuotaError", () => {
  it("allows everything for unlimited (pro) plans", () => {
    expect(quizQuotaError(null, 0, 90)).toBeNull();
    expect(quizQuotaError(null, 9999, 90)).toBeNull();
  });

  it("allows starts that fit the remaining allowance", () => {
    expect(quizQuotaError(20, 0, 10)).toBeNull();
    expect(quizQuotaError(20, 10, 10)).toBeNull(); // exact fit
  });

  it("refuses starts that exceed the remaining allowance", () => {
    expect(quizQuotaError(20, 15, 10)).toMatch(/5 left today/);
    expect(quizQuotaError(20, 0, 90)).toMatch(/20 left today/);
  });

  it("names the limit when the day is exhausted", () => {
    expect(quizQuotaError(20, 20, 10)).toMatch(/20 free questions for today/);
    expect(quizQuotaError(20, 25, 1)).toMatch(/Upgrade to Pro/);
  });

  it("free daily limit fits the plan's smallest sessions", () => {
    // Domain drills (10) and weak-points (15) must be startable on a fresh
    // day; the 90-question full exam must not be.
    expect(quizQuotaError(FREE_DAILY_QUESTION_LIMIT, 0, 10)).toBeNull();
    expect(quizQuotaError(FREE_DAILY_QUESTION_LIMIT, 0, 15)).toBeNull();
    expect(quizQuotaError(FREE_DAILY_QUESTION_LIMIT, 0, 90)).not.toBeNull();
  });
});

type Answer<T> = { data: T; error: { message: string } | null };
interface SubscriptionRow {
  plan: "free" | "pro";
  status: "active" | "canceled" | "past_due" | "trialing";
  stripe_customer_id: string | null;
}

/** An account's own client: its subscription row, and the questions it started today. */
function dbWith(
  subscription: Answer<SubscriptionRow | null>,
  attempts: Answer<{ total_questions: number }[] | null> = { data: [], error: null }
): Db {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "user_subscriptions"
            ? { maybeSingle: async () => subscription }
            : { gte: async () => attempts },
      }),
    }),
  } as unknown as Db;
}

const row = (over: Partial<SubscriptionRow> = {}): Answer<SubscriptionRow> => ({
  data: { plan: "pro", status: "active", stripe_customer_id: "cus_1", ...over },
  error: null,
});

describe("getUserPlan", () => {
  let consoleError: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    consoleError.mockRestore();
  });

  it.each(["active", "trialing"] as const)("gives Pro, with no daily limit, to a plan that is %s", async (status) => {
    expect(await getUserPlan(dbWith(row({ status })), "user-1")).toEqual({
      plan: "pro",
      questionsUsedToday: 0,
      questionsLimitPerDay: null,
      paymentPastDue: false,
      hasBillingAccount: true,
    });
  });

  it("gives the free plan to an account without a subscription row", async () => {
    expect(await getUserPlan(dbWith({ data: null, error: null }), "user-1")).toEqual({
      plan: "free",
      questionsUsedToday: 0,
      questionsLimitPerDay: FREE_DAILY_QUESTION_LIMIT,
      paymentPastDue: false,
      hasBillingAccount: false,
    });
  });

  // Who has Pro is unchanged: a plan that is past due is not Pro. What is new
  // is that the billing page can say so and offer the card form.
  it.each(["pro", "free"] as const)(
    "reports a failed payment, without giving Pro, for a row that is past due (plan %s)",
    async (plan) => {
      expect(await getUserPlan(dbWith(row({ plan, status: "past_due" })), "user-1")).toMatchObject({
        plan: "free",
        paymentPastDue: true,
        hasBillingAccount: true,
      });
    }
  );

  it("says that a former member still has a billing account", async () => {
    expect(await getUserPlan(dbWith(row({ plan: "free", status: "canceled" })), "user-1")).toMatchObject({
      plan: "free",
      paymentPastDue: false,
      hasBillingAccount: true,
    });
  });

  it("counts the questions started today against the free plan's limit", async () => {
    const db = dbWith(
      { data: null, error: null },
      { data: [{ total_questions: 10 }, { total_questions: 5 }], error: null }
    );
    expect(await getUserPlan(db, "user-1")).toMatchObject({ plan: "free", questionsUsedToday: 15 });
  });

  it("never locks an account out because the count could not be read", async () => {
    const db = dbWith(row(), { data: null, error: { message: "TypeError: fetch failed" } });
    expect(await getUserPlan(db, "user-1")).toMatchObject({ plan: "pro", questionsUsedToday: 0 });
  });

  // A failed read used to be answered as the free plan: a paying member was
  // shown the offer to buy what they have, and the free plan's daily limit.
  it("does not take a row that could not be read for a free plan", async () => {
    const db = dbWith({ data: null, error: { message: "TypeError: fetch failed" } });

    const err = await getUserPlan(db, "user-1").then(
      () => null,
      (e: unknown) => e
    );
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe("internal");
    expect((err as ApiError).message).toBe("Your account could not be checked. Please try again.");
  });

  it("does not tell a member to upgrade when the plan could not be read", async () => {
    const db = dbWith({ data: null, error: { message: "TypeError: fetch failed" } });
    await expect(assertCanStartQuiz(db, "user-1", 90)).rejects.toMatchObject({ code: "internal" });
  });

  it("refuses a free account a start beyond what is left of today's limit", async () => {
    const db = dbWith({ data: null, error: null }, { data: [{ total_questions: 15 }], error: null });
    await expect(assertCanStartQuiz(db, "user-1", 10)).rejects.toMatchObject({ code: "quota_exceeded" });
    await expect(assertCanStartQuiz(db, "user-1", 5)).resolves.toBeUndefined();
  });
});
