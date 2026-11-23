import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { ApiError } from "@/contracts/common";
import { accountNotChecked } from "@/server/data/account-errors";
import { createClient, type Db } from "@/server/supabase/server";
import { SESSION_CHECK_LIMIT_MS, withDeadline } from "@/server/supabase/time-limit";

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
  // request instead of throwing an unhandled 500 during server render. The
  // same holds when the sign-in service does not answer in time: its client
  // retries an expired token for up to 30 seconds, which no request waits for.
  let user: User | null = null;
  try {
    const result = await withDeadline(db.auth.getUser(), SESSION_CHECK_LIMIT_MS, "The session check");
    user = result.data.user;
  } catch (err) {
    console.warn("[auth] the session check failed or ran out of time; treating as unauthenticated", err);
  }
  return { db, user };
}

/** Require an authenticated user. Throws ApiError("unauthorized"). */
export async function requireUser(): Promise<AuthContext> {
  const { db, user } = await getOptionalUser();
  if (!user) throw new ApiError("unauthorized");
  return { db, user };
}

/**
 * Require an admin (profiles.role = 'admin'). Throws ApiError("forbidden")
 * for anyone else, and an "account could not be checked" error when the role
 * could not be read: a failed read is not an answer.
 */
export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  const { data: profile, error } = await ctx.db
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (error) throw accountNotChecked("role", error);
  if (profile?.role !== "admin") throw new ApiError("forbidden");
  return ctx;
}

/**
 * Require Pro-level access. An active/trialing Pro subscription passes; so does
 * an admin (the owner), matching the page-level paywall gate so the owner is
 * never locked out of the study APIs they still need for support/testing.
 * Throws ApiError("forbidden") otherwise. When the plan or the role cannot be
 * read it throws an "account could not be checked" error instead: a paying
 * member is never told "Pro required" because of a fault on our side.
 */
export async function requirePro(): Promise<AuthContext> {
  const ctx = await requireUser();
  const { data: sub, error: subError } = await ctx.db
    .from("user_subscriptions")
    .select("plan, status")
    .eq("user_id", ctx.user.id)
    .maybeSingle();
  if (subError) throw accountNotChecked("plan", subError);
  const isPro =
    sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");
  if (isPro) return ctx;
  const { data: profile, error: profileError } = await ctx.db
    .from("profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .maybeSingle();
  if (profileError) throw accountNotChecked("role", profileError);
  if (profile?.role === "admin") return ctx;
  throw new ApiError("forbidden", "Pro subscription required");
}

/* ------------------------------------------------------------------ */
/* Pages (server components), as opposed to API routes                  */
/* ------------------------------------------------------------------ */

/**
 * The session for one render. A layout and the page under it both need the
 * signed-in user: through this they share one client and one check with the
 * sign-in service, where each used to make its own. The result lasts for one
 * request and is never shared between visitors.
 */
export const getPageSession = cache(getOptionalUser);

/**
 * Whether the signed-in user may open the Pro-only pages, read once for each
 * render. "unknown" means the account could not be read: a paying member is
 * never walled because of a fault on our side, which is the proxy's rule too.
 */
const pageProAccess = cache(async (): Promise<"pro" | "none" | "unknown"> => {
  const { db, user } = await getPageSession();
  if (!user) return "none";
  const { data: sub, error: subError } = await db
    .from("user_subscriptions")
    .select("plan, status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (subError) return "unknown";
  if (sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing")) return "pro";
  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return "unknown";
  return profile?.role === "admin" ? "pro" : "none";
});

/**
 * For a page that only Pro members (and the owner) may open. A signed-out
 * visitor goes to sign in; a member without Pro goes to their study path,
 * which is where the offer is.
 *
 * The proxy makes the same decision before the page is reached. This is the
 * second lock: a page must not depend on the proxy alone for who may read it.
 */
export async function requireProPage(): Promise<AuthContext> {
  const { db, user } = await getPageSession();
  if (!user) redirect("/login");
  if ((await pageProAccess()) === "none") redirect("/start");
  return { db, user };
}

/** For a signed-in page that is open to every account (billing, for example). */
export async function requireUserPage(): Promise<AuthContext> {
  const { db, user } = await getPageSession();
  if (!user) redirect("/login");
  return { db, user };
}
