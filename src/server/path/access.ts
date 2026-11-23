import "server-only";

import type { User } from "@supabase/supabase-js";
import type { Db } from "@/server/supabase/server";
import { accountNotChecked } from "@/server/data/account-errors";
import { canAccessCert } from "@/server/data/enrollments";

/**
 * Who may open which part of a path:
 *   anonymous: the introductory questions only
 *   free:      everything up to and including the readiness checkpoint
 *   pro:       the whole path (active Pro and enrolled in this exam, or admin)
 *
 * `proPlan` is true for a Pro subscriber on an exam they haven't added yet:
 * their offer is "add this exam", not "go Pro".
 *
 * When the plan, the role or the enrollments cannot be read, this throws an
 * "account could not be checked" error. It never answers "free" for an account
 * it could not read: that would show a paying member the offer.
 */
export type PathAccessLevel = "anonymous" | "free" | "pro";

export async function getPathAccess(
  db: Db,
  user: User | null,
  certId: string
): Promise<{ level: PathAccessLevel; proPlan: boolean }> {
  if (!user) return { level: "anonymous", proPlan: false };

  const [{ data: sub, error: subError }, { data: profile, error: profileError }] = await Promise.all([
    db.from("user_subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle(),
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (subError) throw accountNotChecked("plan", subError);
  if (profileError) throw accountNotChecked("role", profileError);
  if (profile?.role === "admin") return { level: "pro", proPlan: true };

  const proPlan = sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");
  if (proPlan && (await canAccessCert(db, user.id, certId))) return { level: "pro", proPlan };
  return { level: "free", proPlan };
}
