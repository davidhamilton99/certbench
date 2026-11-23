import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { accountNotChecked } from "@/server/data/account-errors";
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
 * taught in one version. A failed read throws: an empty answer would say
 * "this exam has no other version", which decides what an account may open.
 */
export async function otherVersionIds(db: Db, certificationId: string): Promise<string[]> {
  const { data: cert, error: certError } = await db
    .from("certifications")
    .select("slug")
    .eq("id", certificationId)
    .maybeSingle();
  if (certError) throw accountNotChecked("exam", certError);
  const slugs = cert ? otherVersions(cert.slug) : [];
  if (!slugs.length) return [];
  const { data, error } = await db.from("certifications").select("id").in("slug", slugs);
  if (error) throw accountNotChecked("exam's other versions", error);
  return (data ?? []).map((c) => c.id);
}

/**
 * Whether a user may open a certification's content. Access is scoped to the
 * certs they're actively enrolled in (their purchased plan), so a Pro user who
 * bought Security+ can't roam into Network+/A+ by URL. An enrollment in one
 * version of an exam opens its other versions too: Pro on SY0-701 covers
 * SY0-801. Admins always pass. Checks enrollment first (the common case) and
 * only reads the role to let the owner through when not enrolled.
 *
 * A read that fails throws an "account could not be checked" error. It is
 * never taken as "not enrolled": that would turn away a member who has paid.
 */
export async function canAccessCert(
  db: Db,
  userId: string,
  certificationId: string
): Promise<boolean> {
  const { data: enrollment, error: enrollmentError } = await db
    .from("user_enrollments")
    .select("id")
    .eq("user_id", userId)
    .eq("certification_id", certificationId)
    .eq("is_active", true)
    .maybeSingle();
  if (enrollmentError) throw accountNotChecked("enrollment", enrollmentError);
  if (enrollment) return true;

  const versions = await otherVersionIds(db, certificationId);
  if (versions.length) {
    const { data: other, error: otherError } = await db
      .from("user_enrollments")
      .select("id")
      .eq("user_id", userId)
      .in("certification_id", versions)
      .eq("is_active", true)
      .limit(1);
    if (otherError) throw accountNotChecked("enrollment", otherError);
    if (other?.length) return true;
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (profileError) throw accountNotChecked("role", profileError);
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
