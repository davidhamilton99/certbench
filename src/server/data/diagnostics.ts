import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { ProgressSnapshot } from "@/contracts/quiz";
import type { Json } from "@/types/database.gen";

export interface DiagnosticAttempt {
  id: string;
  certificationId: string;
  totalQuestions: number;
  isComplete: boolean;
  progressState: ProgressSnapshot | null;
}

/** The user's in-flight (incomplete) diagnostic attempt for a cert, if any. */
export async function getInFlightAttempt(
  db: Db,
  userId: string,
  certId: string
): Promise<DiagnosticAttempt | null> {
  const { data, error } = await db
    .from("diagnostic_attempts")
    .select("id, certification_id, total_questions, is_complete, progress_state")
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .eq("is_complete", false)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  if (!data) return null;
  return {
    id: data.id,
    certificationId: data.certification_id,
    totalQuestions: data.total_questions,
    isComplete: data.is_complete,
    progressState: (data.progress_state as ProgressSnapshot | null) ?? null,
  };
}

export async function getAttempt(
  db: Db,
  userId: string,
  attemptId: string
): Promise<DiagnosticAttempt | null> {
  const { data, error } = await db
    .from("diagnostic_attempts")
    .select("id, certification_id, total_questions, is_complete, progress_state")
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  if (!data) return null;
  return {
    id: data.id,
    certificationId: data.certification_id,
    totalQuestions: data.total_questions,
    isComplete: data.is_complete,
    progressState: (data.progress_state as ProgressSnapshot | null) ?? null,
  };
}

export async function createAttempt(
  db: Db,
  userId: string,
  certId: string,
  totalQuestions: number,
  initialProgress: ProgressSnapshot
): Promise<string> {
  const { data, error } = await db
    .from("diagnostic_attempts")
    .insert({
      user_id: userId,
      certification_id: certId,
      total_questions: totalQuestions,
      progress_state: initialProgress as unknown as Json,
      progress_saved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new ApiError("internal", error.message);
  return data.id;
}

export async function saveProgress(
  db: Db,
  userId: string,
  attemptId: string,
  snapshot: ProgressSnapshot
): Promise<void> {
  const { error } = await db
    .from("diagnostic_attempts")
    .update({
      progress_state: snapshot as unknown as Json,
      progress_saved_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("user_id", userId)
    .eq("is_complete", false);
  if (error) throw new ApiError("internal", error.message);
}

export interface ResponseRow {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSeconds: number | null;
}

/** Marks the attempt complete, nulls progress, and stores graded responses. */
export async function completeAttempt(
  db: Db,
  userId: string,
  attemptId: string,
  responses: ResponseRow[]
): Promise<void> {
  const correctCount = responses.filter((r) => r.isCorrect).length;

  const { error: respError } = await db.from("diagnostic_responses").insert(
    responses.map((r) => ({
      attempt_id: attemptId,
      question_id: r.questionId,
      selected_index: r.selectedIndex,
      is_correct: r.isCorrect,
      time_spent_seconds: r.timeSpentSeconds,
    }))
  );
  if (respError) throw new ApiError("internal", respError.message);

  const { error } = await db
    .from("diagnostic_attempts")
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      correct_count: correctCount,
      progress_state: null,
      progress_saved_at: null,
    })
    .eq("id", attemptId)
    .eq("user_id", userId);
  if (error) throw new ApiError("internal", error.message);
}
