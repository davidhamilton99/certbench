import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { otherVersions } from "@/core/path/versions";

export interface Enrollment {
  id: string;
  certificationId: string;
  examDate: string | null;
  enrolledAt: string;
}

/**
 * The ids of this certification's other versions (Security+ SY0-701 and
 * SY0-801, say), which an enrollment in it also opens. Empty for an exam
 * taught in one version.
 */
export async function otherVersionIds(db: Db, certificationId: string): Promise<string[]> {
  const { data: cert } = await db.from("certifications").select("slug").eq("id", certificationId).maybeSingle();
  const slugs = cert ? otherVersions(cert.slug) : [];
  if (!slugs.length) return [];
  const { data } = await db.from("certifications").select("id").in("slug", slugs);
  return (data ?? []).map((c) => c.id);
}

/**
 * Whether a user may open a certification's content. Access is scoped to the
 * certs they're actively enrolled in (their purchased plan), so a Pro user who
 * bought Security+ can't roam into Network+/A+ by URL. An enrollment in one
 * version of an exam opens its other versions too: Pro on SY0-701 covers
 * SY0-801. Admins always pass. Checks enrollment first (the common case) and
 * only reads the role to let the owner through when not enrolled.
 */
export async function canAccessCert(
  db: Db,
  userId: string,
  certificationId: string
): Promise<boolean> {
  const { data: enrollment } = await db
    .from("user_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("certification_id", certificationId)
    .eq("is_active", true)
    .maybeSingle();
  if (enrollment) return true;

  const versions = await otherVersionIds(db, certificationId);
  if (versions.length) {
    const { data: other } = await db
      .from("user_enrollments")
      .select("id")
      .eq("user_id", userId)
      .in("certification_id", versions)
      .eq("is_active", true)
      .limit(1);
    if (other?.length) return true;
  }

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  return profile?.role === "admin";
}

export async function listEnrollments(db: Db, userId: string): Promise<Enrollment[]> {
  const { data, error } = await db
    .from("user_enrollments")
    .select("id, certification_id, exam_date, enrolled_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("enrolled_at");
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    certificationId: e.certification_id,
    examDate: e.exam_date,
    enrolledAt: e.enrolled_at,
  }));
}

// Writes live in server/services/enrollment-writes.ts: accounts can only read
// their enrollments (migration 027), so the server makes every change.
