import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { StudyQuestion } from "@/contracts/study-sets";
import type { StudyQuestionInput } from "@/core/study-materials/validate";
import type { Json } from "@/types/database.gen";

export interface StudySetSummary {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  category: string | null;
  isPublic: boolean;
  questionCount: number;
  attemptCount: number;
  bookmarkCount: number;
  createdAt: string;
}

const SET_COLUMNS =
  "id, user_id, title, description, category, is_public, question_count, attempt_count, bookmark_count, created_at";

function mapSet(row: {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_public: boolean;
  question_count: number;
  attempt_count: number;
  bookmark_count: number;
  created_at: string;
}): StudySetSummary {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    category: row.category,
    isPublic: row.is_public,
    questionCount: row.question_count,
    attemptCount: row.attempt_count,
    bookmarkCount: row.bookmark_count,
    createdAt: row.created_at,
  };
}

export async function listMyStudySets(
  db: Db,
  userId: string
): Promise<StudySetSummary[]> {
  const { data, error } = await db
    .from("user_study_sets")
    .select(SET_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map(mapSet);
}

/** RLS allows owners and public sets; returns null otherwise. */
export async function getStudySet(
  db: Db,
  setId: string
): Promise<StudySetSummary | null> {
  const { data, error } = await db
    .from("user_study_sets")
    .select(SET_COLUMNS)
    .eq("id", setId)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  return data ? mapSet(data) : null;
}

export async function listSetQuestions(
  db: Db,
  setId: string
): Promise<StudyQuestion[]> {
  const { data, error } = await db
    .from("user_study_questions")
    .select(
      "id, question_type, question_text, options, correct_index, explanation, sort_order"
    )
    .eq("study_set_id", setId)
    .order("sort_order");
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map((q) => ({
    ...q,
    options: (q.options as unknown[]) ?? [],
  }));
}

export async function createSet(
  db: Db,
  userId: string,
  input: {
    title: string;
    description: string | null;
    category: string | null;
    sourcePreview: string | null;
    questions: StudyQuestionInput[];
  }
): Promise<string> {
  const { data: set, error } = await db
    .from("user_study_sets")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      source_material_preview: input.sourcePreview,
      question_count: input.questions.length,
    })
    .select("id")
    .single();
  if (error) throw new ApiError("internal", error.message);

  const { error: qError } = await db.from("user_study_questions").insert(
    input.questions.map((q, i) => ({
      study_set_id: set.id,
      user_id: userId,
      question_type: q.question_type,
      question_text: q.question_text,
      options: q.options as unknown as Json,
      correct_index: q.correct_index,
      explanation: q.explanation ?? null,
      sort_order: i,
    }))
  );
  if (qError) {
    // Roll back the header row so we never leave an empty set behind.
    await db.from("user_study_sets").delete().eq("id", set.id);
    throw new ApiError("internal", qError.message);
  }
  return set.id;
}

export async function updateSet(
  db: Db,
  userId: string,
  setId: string,
  patch: { title?: string; description?: string | null; isPublic?: boolean }
): Promise<void> {
  const { error } = await db
    .from("user_study_sets")
    .update({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.isPublic !== undefined && { is_public: patch.isPublic }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", setId)
    .eq("user_id", userId);
  if (error) throw new ApiError("internal", error.message);
}

export async function deleteSet(
  db: Db,
  userId: string,
  setId: string
): Promise<void> {
  const { error } = await db
    .from("user_study_sets")
    .delete()
    .eq("id", setId)
    .eq("user_id", userId);
  if (error) throw new ApiError("internal", error.message);
}

async function syncQuestionCount(db: Db, userId: string, setId: string) {
  const { count } = await db
    .from("user_study_questions")
    .select("id", { count: "exact", head: true })
    .eq("study_set_id", setId);
  await db
    .from("user_study_sets")
    .update({ question_count: count ?? 0, updated_at: new Date().toISOString() })
    .eq("id", setId)
    .eq("user_id", userId);
}

export async function upsertQuestion(
  db: Db,
  userId: string,
  setId: string,
  questionId: string | null,
  q: StudyQuestionInput
): Promise<string> {
  // Ownership check via the set row (RLS would let public sets be read).
  const { data: set } = await db
    .from("user_study_sets")
    .select("id")
    .eq("id", setId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!set) throw new ApiError("not_found", "Study set not found");

  if (questionId) {
    const { error } = await db
      .from("user_study_questions")
      .update({
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options as unknown as Json,
        correct_index: q.correct_index,
        explanation: q.explanation ?? null,
      })
      .eq("id", questionId)
      .eq("study_set_id", setId)
      .eq("user_id", userId);
    if (error) throw new ApiError("internal", error.message);
    return questionId;
  }

  const { count } = await db
    .from("user_study_questions")
    .select("id", { count: "exact", head: true })
    .eq("study_set_id", setId);
  const { data, error } = await db
    .from("user_study_questions")
    .insert({
      study_set_id: setId,
      user_id: userId,
      question_type: q.question_type,
      question_text: q.question_text,
      options: q.options as unknown as Json,
      correct_index: q.correct_index,
      explanation: q.explanation ?? null,
      sort_order: count ?? 0,
    })
    .select("id")
    .single();
  if (error) throw new ApiError("internal", error.message);
  await syncQuestionCount(db, userId, setId);
  return data.id;
}

export async function deleteQuestion(
  db: Db,
  userId: string,
  setId: string,
  questionId: string
): Promise<void> {
  const { error } = await db
    .from("user_study_questions")
    .delete()
    .eq("id", questionId)
    .eq("study_set_id", setId)
    .eq("user_id", userId);
  if (error) throw new ApiError("internal", error.message);
  await syncQuestionCount(db, userId, setId);
}

// ---------- progress ----------

export interface SetProgress {
  currentIndex: number;
  correctCount: number;
  totalQuestions: number;
  savedAt: string;
}

export async function getSetProgress(
  db: Db,
  userId: string,
  setId: string
): Promise<SetProgress | null> {
  const { data, error } = await db
    .from("study_set_progress")
    .select("current_index, correct_count, total_questions, saved_at")
    .eq("user_id", userId)
    .eq("study_set_id", setId)
    .maybeSingle();
  if (error) throw new ApiError("internal", error.message);
  if (!data) return null;
  return {
    currentIndex: data.current_index,
    correctCount: data.correct_count,
    totalQuestions: data.total_questions,
    savedAt: data.saved_at,
  };
}

export async function saveSetProgressRow(
  db: Db,
  userId: string,
  setId: string,
  progress: { currentIndex: number; correctCount: number; totalQuestions: number }
): Promise<void> {
  const { error } = await db.from("study_set_progress").upsert(
    {
      user_id: userId,
      study_set_id: setId,
      current_index: progress.currentIndex,
      correct_count: progress.correctCount,
      total_questions: progress.totalQuestions,
      saved_at: new Date().toISOString(),
    },
    { onConflict: "user_id,study_set_id" }
  );
  if (error) throw new ApiError("internal", error.message);
}

export async function clearSetProgressRow(
  db: Db,
  userId: string,
  setId: string
): Promise<void> {
  const { error } = await db
    .from("study_set_progress")
    .delete()
    .eq("user_id", userId)
    .eq("study_set_id", setId);
  if (error) throw new ApiError("internal", error.message);
}
