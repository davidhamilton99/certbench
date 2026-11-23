import "server-only";

import { ApiError } from "@/contracts/common";
import { accountNotChecked } from "@/server/data/account-errors";
import type { Db } from "@/server/supabase/server";

/**
 * Free tier: practice questions per UTC day, metered when a quiz STARTS
 * (full exams, domain drills, weak-points). The diagnostic and SRS reviews
 * are never metered — the diagnostic is the acquisition hook, and SRS only
 * replays questions the user has already seen and drives daily retention.
 */
export const FREE_DAILY_QUESTION_LIMIT = 20;

export interface UserPlan {
  plan: "free" | "pro";
  /** Practice questions started today (UTC) via metered quiz starts. */
  questionsUsedToday: number;
  questionsLimitPerDay: number | null; // null = unlimited
  /**
   * The subscription's last payment did not go through (the row is marked
   * past due). The billing page says so and offers the card form. It is
   * information only: who has Pro is decided by `plan`, as before.
   */
  paymentPastDue: boolean;
  /** Whether the account has a Stripe customer, and so a billing portal to open. */
  hasBillingAccount: boolean;
}

/** Start of the current UTC day, ISO — the daily quota window boundary. */
function utcDayStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  ).toISOString();
}

/**
 * Practice questions the user has started today, summed from attempt rows
 * (attempts store total_questions at creation, so no extra table needed).
 * Fails open: a metering read error must never lock a user out.
 */
async function questionsStartedToday(db: Db, userId: string): Promise<number> {
  const { data, error } = await db
    .from("practice_exam_attempts")
    .select("total_questions")
    .eq("user_id", userId)
    .gte("started_at", utcDayStart());
  if (error) {
    console.error("daily question meter failed:", error.message);
    return 0;
  }
  return (data ?? []).reduce((sum, row) => sum + (row.total_questions ?? 0), 0);
}

export async function getUserPlan(db: Db, userId: string): Promise<UserPlan> {
  const { data: sub, error } = await db
    .from("user_subscriptions")
    .select("plan, status, current_period_end, stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();
  // A row that could not be read is not a free plan. Answering "free" here
  // showed a paying member the offer to buy what they have, and the daily
  // limit of the free plan. The same error as every other account check.
  if (error) throw accountNotChecked("plan", error);

  const isPro =
    sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");

  const questionsUsedToday = await questionsStartedToday(db, userId);

  const billing = {
    paymentPastDue: sub?.status === "past_due",
    hasBillingAccount: Boolean(sub?.stripe_customer_id),
  };

  if (isPro) {
    return { plan: "pro", questionsUsedToday, questionsLimitPerDay: null, ...billing };
  }
  return {
    plan: "free",
    questionsUsedToday,
    questionsLimitPerDay: FREE_DAILY_QUESTION_LIMIT,
    ...billing,
  };
}

/**
 * Pure quota gate: returns the refusal message, or null when the start is
 * allowed. limit === null means unlimited (Pro).
 */
export function quizQuotaError(
  limit: number | null,
  usedToday: number,
  requested: number
): string | null {
  if (limit === null) return null;
  const remaining = Math.max(0, limit - usedToday);
  if (requested <= remaining) return null;
  return remaining === 0
    ? `You have used your ${limit} free questions for today. Upgrade to Pro for unlimited practice.`
    : `This session needs ${requested} questions but you have ${remaining} left today. Upgrade to Pro for unlimited practice.`;
}

/**
 * Guard for metered quiz starts. Throws quota_exceeded (402) when a free
 * user's remaining daily allowance can't cover the requested question count.
 * Resumed attempts must NOT pass through here — only new starts are metered.
 */
export async function assertCanStartQuiz(
  db: Db,
  userId: string,
  requestedQuestions: number
): Promise<void> {
  const plan = await getUserPlan(db, userId);
  const message = quizQuotaError(
    plan.questionsLimitPerDay,
    plan.questionsUsedToday,
    requestedQuestions
  );
  if (message) throw new ApiError("quota_exceeded", message);
}
