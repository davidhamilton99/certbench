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
