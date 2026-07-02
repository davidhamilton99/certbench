import "server-only";

import type { Db } from "@/server/supabase/server";

/** Free tier: AI generations per calendar month. */
export const FREE_GENERATION_LIMIT = 3;

export interface UserPlan {
  plan: "free" | "pro";
  generationsUsed: number;
  generationsLimit: number | null; // null = unlimited
  canGenerate: boolean;
}

/** Current month key for usage tracking (e.g. '2026-07'). */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function getUserPlan(db: Db, userId: string): Promise<UserPlan> {
  const { data: sub } = await db
    .from("user_subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  const isPro =
    sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");

  const { data: usage } = await db
    .from("ai_generation_usage")
    .select("generation_count")
    .eq("user_id", userId)
    .eq("month", currentMonth())
    .maybeSingle();

  const generationsUsed = usage?.generation_count ?? 0;

  if (isPro) {
    return { plan: "pro", generationsUsed, generationsLimit: null, canGenerate: true };
  }
  return {
    plan: "free",
    generationsUsed,
    generationsLimit: FREE_GENERATION_LIMIT,
    canGenerate: generationsUsed < FREE_GENERATION_LIMIT,
  };
}

/** Atomic monthly counter bump (RPC: INSERT ... ON CONFLICT count+1). */
export async function incrementGenerationUsage(
  db: Db,
  userId: string
): Promise<void> {
  await db.rpc("increment_generation_count", {
    p_user_id: userId,
    p_month: currentMonth(),
  });
}
