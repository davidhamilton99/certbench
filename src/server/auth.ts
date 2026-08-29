import "server-only";

import type { User } from "@supabase/supabase-js";
import { ApiError } from "@/contracts/common";
import { createClient, type Db } from "@/server/supabase/server";

export interface AuthContext {
  db: Db;
  user: User;
}

/** Resolve the current user or null, with an RLS-scoped client. */
export async function getOptionalUser(): Promise<{
  db: Db;
  user: User | null;
}> {
  const db = await createClient();
  // Guard against transient JWT validation errors (e.g. "JWT issued at future"
  // from clock skew) so an auth-token hiccup degrades to "logged out" for this
  // request instead of throwing an unhandled 500 during server render.
  let user: User | null = null;
  try {
    const result = await db.auth.getUser();
    user = result.data.user;
  } catch (err) {
    console.warn("[auth] getUser failed; treating as unauthenticated", err);
  }
  return { db, user };
}

/** Require an authenticated user. Throws ApiError("unauthorized"). */
export async function requireUser(): Promise<AuthContext> {
  const { db, user } = await getOptionalUser();
  if (!user) throw new ApiError("unauthorized");
  return { db, user };
}

/** Require an admin (profiles.role = 'admin'). Throws ApiError("forbidden"). */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  const { data: profile } = await ctx.db
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .single();
  if (profile?.role !== "admin") throw new ApiError("forbidden");
  return ctx;
}

/** Require an active/trialing Pro subscription. Throws ApiError("forbidden"). */
export async function requirePro(): Promise<AuthContext> {
  const ctx = await requireUser();
  const { data: sub } = await ctx.db
    .from("user_subscriptions")
    .select("plan, status")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  const isPro =
    sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");
  if (!isPro) throw new ApiError("forbidden", "Pro subscription required");
  return ctx;
}
