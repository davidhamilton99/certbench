import "server-only";

import { createAdminClient } from "@/server/supabase/admin";
import { ApiError } from "@/contracts/common";

/**
 * Every change to user_enrollments goes through here.
 *
 * Enrollments decide which exams Pro unlocks, so accounts can only READ their
 * own rows (RLS, migration 027) — otherwise anyone could add every exam to
 * their plan with a direct API call. The server writes them with the service
 * role, always scoped to a user id the caller has already verified from the
 * session. Callers decide whether a change is allowed (see /api/path/enroll);
 * these functions only perform it.
 */

/** Set (or clear) the exam date on one of the user's enrollments. */
export async function setExamDate(
  userId: string,
  certificationId: string,
  examDate: string | null
): Promise<void> {
  const { error } = await createAdminClient()
    .from("user_enrollments")
    .update({ exam_date: examDate })
    .eq("user_id", userId)
    .eq("certification_id", certificationId);
  if (error) throw new ApiError("internal", error.message);
}

/** Add an enrollment. Already enrolled → ApiError("conflict"). */
export async function addEnrollment(
  userId: string,
  certificationId: string,
  examDate: string | null
): Promise<void> {
  const { error } = await createAdminClient().from("user_enrollments").insert({
    user_id: userId,
    certification_id: certificationId,
    exam_date: examDate,
  });
  // 23505 = unique violation: already enrolled — treat as conflict.
  if (error?.code === "23505") throw new ApiError("conflict", "Already enrolled");
  if (error) throw new ApiError("internal", error.message);
}

/**
 * Make one exam the user's only active enrollment — a free account studies
 * one exam at a time, and that's the exam Pro unlocks when they buy. Other
 * enrollments are deactivated, not deleted. `examDate` undefined keeps the
 * date the enrollment already had.
 */
export async function makeOnlyActiveEnrollment(
  userId: string,
  certificationId: string,
  examDate: string | null | undefined
): Promise<void> {
  const db = createAdminClient();
  const { error: offErr } = await db
    .from("user_enrollments")
    .update({ is_active: false })
    .eq("user_id", userId)
    .eq("is_active", true)
    .neq("certification_id", certificationId);
  if (offErr) throw new ApiError("internal", offErr.message);

  const row: { user_id: string; certification_id: string; is_active: boolean; exam_date?: string | null } = {
    user_id: userId,
    certification_id: certificationId,
    is_active: true,
  };
  if (examDate !== undefined) row.exam_date = examDate;
  const { error } = await db
    .from("user_enrollments")
    .upsert(row, { onConflict: "user_id,certification_id" });
  if (error) throw new ApiError("internal", error.message);
}
