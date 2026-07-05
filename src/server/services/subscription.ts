import "server-only";

import { ApiError } from "@/contracts/common";
import type { Db } from "@/server/supabase/server";
import { createAdminClient } from "@/server/supabase/admin";

/** Free tier: AI generations per calendar month. */
export const FREE_GENERATION_LIMIT = 3;

/**
 * Free tier: practice questions per UTC day, metered when a quiz STARTS
 * (full exams, domain drills, weak-points). The diagnostic and SRS reviews
 * are never metered — the diagnostic is the acquisition hook, and SRS only
 * replays questions the user has already seen and drives daily retention.
 */
export const FREE_DAILY_QUESTION_LIMIT = 20;

export interface UserPlan {
  plan: "free" | "pro";
  generationsUsed: number;
  generationsLimit: number | null; // null = unlimited
  canGenerate: boolean;
  /** Practice questions started today (UTC) via metered quiz starts. */
  questionsUsedToday: number;
  questionsLimitPerDay: number | null; // null = unlimited
}

/** Current month key for usage tracking (e.g. '2026-07'). */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
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
  const { data: sub } = await db
    .from("user_subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const isPro =
    sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");

  const [{ data: usage }, questionsUsedToday] = await Promise.all([
    db
      .from("ai_generation_usage")
      .select("generation_count")
      .eq("user_id", userId)
      .eq("month", currentMonth())
      .maybeSingle(),
    questionsStartedToday(db, userId),
  ]);

  const generationsUsed = usage?.generation_count ?? 0;

  if (isPro) {
    return {
      plan: "pro",
      generationsUsed,
      generationsLimit: null,
      canGenerate: true,
      questionsUsedToday,
      questionsLimitPerDay: null,
    };
  }
  return {
    plan: "free",
    generationsUsed,
    generationsLimit: FREE_GENERATION_LIMIT,
    canGenerate: generationsUsed < FREE_GENERATION_LIMIT,
    questionsUsedToday,
    questionsLimitPerDay: FREE_DAILY_QUESTION_LIMIT,
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
    ? `You've used your ${limit} free questions for today. Upgrade to Pro for unlimited practice.`
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

/**
 * Atomic monthly counter bump (RPC: INSERT ... ON CONFLICT count+1).
 *
 * Runs on the ADMIN client: the RPC is SECURITY INVOKER and
 * ai_generation_usage has no INSERT policy, so a user-scoped call fails
 * silently under RLS — which is why the old app never actually enforced
 * the free-tier quota. userId comes from the authenticated session, never
 * from client input.
 */
export async function incrementGenerationUsage(
  _db: Db,
  userId: string
): Promise<void> {
  const { error } = await createAdminClient().rpc("increment_generation_count", {
    p_user_id: userId,
    p_month: currentMonth(),
  });
  if (error) console.error("generation counter failed:", error.message);
}
