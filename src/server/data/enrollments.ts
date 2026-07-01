import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

export interface Enrollment {
  id: string;
  certificationId: string;
  examDate: string | null;
  enrolledAt: string;
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

export async function createEnrollment(
  db: Db,
  userId: string,
  certificationId: string,
  examDate: string | null
): Promise<void> {
  const { error } = await db.from("user_enrollments").insert({
    user_id: userId,
    certification_id: certificationId,
    exam_date: examDate,
  });
  // 23505 = unique violation: already enrolled — treat as conflict.
  if (error?.code === "23505") throw new ApiError("conflict", "Already enrolled");
  if (error) throw new ApiError("internal", error.message);
}

export async function updateExamDate(
  db: Db,
  userId: string,
  certificationId: string,
  examDate: string | null
): Promise<void> {
  const { error } = await db
    .from("user_enrollments")
    .update({ exam_date: examDate })
    .eq("user_id", userId)
    .eq("certification_id", certificationId);
  if (error) throw new ApiError("internal", error.message);
}
