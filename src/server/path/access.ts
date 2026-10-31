import "server-only";

import type { User } from "@supabase/supabase-js";
import type { Db } from "@/server/supabase/server";
import { canAccessCert } from "@/server/data/enrollments";

/**
 * Who may open which part of a path:
 *   anonymous — the warm-up only
 *   free      — everything up to and including the readiness checkpoint
 *   pro       — the whole path (active Pro and enrolled in this exam, or admin)
 *
 * `proPlan` is true for a Pro subscriber on an exam they haven't added yet:
 * their offer is "add this exam", not "go Pro".
 */
export type PathAccessLevel = "anonymous" | "free" | "pro";

export async function getPathAccess(
  db: Db,
  user: User | null,
  certId: string
): Promise<{ level: PathAccessLevel; proPlan: boolean }> {
  if (!user) return { level: "anonymous", proPlan: false };

  const [{ data: sub }, { data: profile }] = await Promise.all([
    db.from("user_subscriptions").select("plan, status").eq("user_id", user.id).maybeSingle(),
    db.from("profiles").select("role").eq("id", user.id).maybeSingle(),
  ]);
  if (profile?.role === "admin") return { level: "pro", proPlan: true };

  const proPlan = sub?.plan === "pro" && (sub.status === "active" || sub.status === "trialing");
  if (proPlan && (await canAccessCert(db, user.id, certId))) return { level: "pro", proPlan };
  return { level: "free", proPlan };
}
