import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

/** Has the user completed a diagnostic for this cert? */
export async function hasCompletedDiagnostic(
  db: Db,
  userId: string,
  certId: string
): Promise<boolean> {
  const { count, error } = await db
    .from("diagnostic_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .eq("is_complete", true);
  if (error) throw new ApiError("internal", error.message);
  return (count ?? 0) > 0;
}

/** Completed attempts (diagnostic + practice) for activity charting. */
export async function listCompletedActivity(
  db: Db,
  userId: string,
  certId: string
): Promise<
  {
    completed_at: string | null;
    total_questions: number | null;
    correct_count: number | null;
    is_complete: boolean;
  }[]
> {
  const columns = "completed_at, total_questions, correct_count, is_complete";
  const [diag, practice] = await Promise.all([
    db
      .from("diagnostic_attempts")
      .select(columns)
      .eq("user_id", userId)
      .eq("certification_id", certId)
      .eq("is_complete", true),
    db
      .from("practice_exam_attempts")
      .select(columns)
      .eq("user_id", userId)
      .eq("certification_id", certId)
      .eq("is_complete", true),
  ]);
  if (diag.error) throw new ApiError("internal", diag.error.message);
  if (practice.error) throw new ApiError("internal", practice.error.message);
  return [...(diag.data ?? []), ...(practice.data ?? [])];
}

/** Completion date of the most recent full practice exam, if any. */
export async function getLastFullExamDate(
  db: Db,
  userId: string,
  certId: string
): Promise<string | null> {
  const { data, error } = await db
    .from("practice_exam_attempts")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .eq("exam_type", "full")
    .eq("is_complete", true)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data?.completed_at ?? null;
}
