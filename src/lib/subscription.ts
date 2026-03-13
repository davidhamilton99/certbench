import { SupabaseClient } from "@supabase/supabase-js";
import { FREE_GENERATION_LIMIT } from "@/lib/stripe/config";

export interface UserPlan {
  plan: "free" | "pro";
  generationsUsed: number;
  generationsLimit: number | null; // null = unlimited
  canGenerate: boolean;
}

/**
 * Get the current month key for usage tracking (e.g. '2026-03')
 */
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Check a user's subscription plan and remaining AI generation quota
 */
export async function getUserPlan(
  supabase: SupabaseClient,
  userId: string
): Promise<UserPlan> {
  // Get subscription
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .single();

  const isPro =
    sub?.plan === "pro" &&
    (sub.status === "active" || sub.status === "trialing");

  // Get current month's usage
  const month = currentMonth();
  const { data: usage } = await supabase
    .from("ai_generation_usage")
    .select("generation_count")
    .eq("user_id", userId)
    .eq("month", month)
    .single();

  const generationsUsed = usage?.generation_count ?? 0;

  if (isPro) {
    return {
      plan: "pro",
      generationsUsed,
      generationsLimit: null,
      canGenerate: true,
    };
  }

  return {
    plan: "free",
    generationsUsed,
    generationsLimit: FREE_GENERATION_LIMIT,
    canGenerate: generationsUsed < FREE_GENERATION_LIMIT,
  };
}

/**
 * Increment the AI generation counter for the current month.
 * Call this AFTER a successful generation.
 */
export async function incrementGenerationUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const month = currentMonth();

  // Upsert: insert if missing, increment if exists
  const { data: existing } = await supabase
    .from("ai_generation_usage")
    .select("id, generation_count")
    .eq("user_id", userId)
    .eq("month", month)
    .single();

  if (existing) {
    await supabase
      .from("ai_generation_usage")
      .update({ generation_count: existing.generation_count + 1 })
      .eq("id", existing.id);
  } else {
    await supabase.from("ai_generation_usage").insert({
      user_id: userId,
      month,
      generation_count: 1,
    });
  }
}
