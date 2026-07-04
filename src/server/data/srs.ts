import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { SRS_MAX_CARDS_PER_SESSION } from "@/core/constants";

export interface DueCardRow {
  question_id: string;
  srs_next_review_at: string;
}

/** Due, non-suspended cards for a cert, most overdue first. */
export async function listDueCards(
  db: Db,
  userId: string,
  certId: string,
  limit = SRS_MAX_CARDS_PER_SESSION
): Promise<{ cards: DueCardRow[]; totalDue: number }> {
  const nowIso = new Date().toISOString();
  const { data, error, count } = await db
    .from("question_performance")
    .select("question_id, srs_next_review_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .is("suspended_at", null)
    .not("srs_next_review_at", "is", null)
    .lte("srs_next_review_at", nowIso)
    .order("srs_next_review_at", { ascending: true })
    .limit(limit);
  if (error) throw new ApiError("internal", error.message);
  return {
    cards: (data ?? []) as DueCardRow[],
    totalDue: count ?? 0,
  };
}

/** Current SRS schedule for one card (post-answer readback). */
export async function getCardSchedule(
  db: Db,
  userId: string,
  questionId: string
): Promise<{ intervalDays: number; nextReviewAt: string; streak: number } | null> {
  const { data, error } = await db
    .from("question_performance")
    .select("srs_interval_days, srs_next_review_at, streak")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  if (!data?.srs_next_review_at) return null;
  return {
    intervalDays: data.srs_interval_days,
    nextReviewAt: data.srs_next_review_at,
    streak: data.streak,
  };
}

export async function setSuspended(
  db: Db,
  userId: string,
  questionId: string,
  suspend: boolean
): Promise<void> {
  const { error } = await db
    .from("question_performance")
    .update({ suspended_at: suspend ? new Date().toISOString() : null })
    .eq("user_id", userId)
    .eq("question_id", questionId);
  if (error) throw new ApiError("internal", error.message);
}
