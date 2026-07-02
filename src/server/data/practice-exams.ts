import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { ProgressSnapshot } from "@/contracts/quiz";
import type { ExamType } from "@/contracts/practice-exam";
import type { Json } from "@/types/database.gen";

export interface PracticeAttempt {
  id: string;
  certificationId: string;
  examType: ExamType;
  domainId: string | null;
  totalQuestions: number;
  isComplete: boolean;
  progressState: ProgressSnapshot | null;
}

function mapAttempt(data: {
  id: string;
  certification_id: string;
  exam_type: ExamType;
  domain_id: string | null;
  total_questions: number;
  is_complete: boolean;
  progress_state: unknown;
}): PracticeAttempt {
  return {
    id: data.id,
    certificationId: data.certification_id,
    examType: data.exam_type,
    domainId: data.domain_id,
    totalQuestions: data.total_questions,
    isComplete: data.is_complete,
    progressState: (data.progress_state as ProgressSnapshot | null) ?? null,
  };
}

const COLUMNS =
  "id, certification_id, exam_type, domain_id, total_questions, is_complete, progress_state";

/** In-flight attempt for a cert+type (+domain for drills), if any. */
export async function getInFlightAttempt(
  db: Db,
  userId: string,
  certId: string,
  examType: ExamType,
  domainId: string | null
): Promise<PracticeAttempt | null> {
  let query = db
    .from("practice_exam_attempts")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .eq("exam_type", examType)
    .eq("is_complete", false);
  if (domainId) query = query.eq("domain_id", domainId);
  const { data, error } = await query
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data ? mapAttempt(data) : null;
}

export async function getAttempt(
  db: Db,
  userId: string,
  attemptId: string
): Promise<PracticeAttempt | null> {
  const { data, error } = await db
    .from("practice_exam_attempts")
    .select(COLUMNS)
    .eq("id", attemptId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data ? mapAttempt(data) : null;
}

export async function createAttempt(
  db: Db,
  userId: string,
  certId: string,
  examType: ExamType,
  domainId: string | null,
  totalQuestions: number,
  initialProgress: ProgressSnapshot
): Promise<string> {
  const { data, error } = await db
    .from("practice_exam_attempts")
    .insert({
      user_id: userId,
      certification_id: certId,
      exam_type: examType,
      domain_id: domainId,
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
    .from("practice_exam_attempts")
    .update({
      progress_state: snapshot as unknown as Json,
      progress_saved_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("user_id", userId)
    .eq("is_complete", false);
  if (error) throw new ApiError("internal", error.message);
}

export interface PracticeResponseRow {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  isFlagged: boolean;
  timeSpentSeconds: number | null;
}

export async function completeAttempt(
  db: Db,
  userId: string,
  attemptId: string,
  responses: PracticeResponseRow[]
): Promise<void> {
  const correctCount = responses.filter((r) => r.isCorrect).length;

  const { error: respError } = await db.from("practice_exam_responses").insert(
    responses.map((r) => ({
      attempt_id: attemptId,
      question_id: r.questionId,
      selected_index: r.selectedIndex,
      is_correct: r.isCorrect,
      is_flagged: r.isFlagged,
      time_spent_seconds: r.timeSpentSeconds,
    }))
  );
  if (respError) throw new ApiError("internal", respError.message);

  const { error } = await db
    .from("practice_exam_attempts")
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
