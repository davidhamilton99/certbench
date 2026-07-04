import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import type { StudySetSummary } from "@/server/data/study-sets";

/** Public sets for the community browser, featured + popular first. */
export async function listPublicSets(
  db: Db,
  search: string | null,
  limit = 50
): Promise<StudySetSummary[]> {
  let query = db
    .from("user_study_sets")
    .select(
      "id, user_id, title, description, category, is_public, question_count, attempt_count, bookmark_count, created_at"
    )
    .eq("is_public", true)
    .gt("question_count", 0);
  if (search) {
    query = query.ilike("title", `%${search}%`);
  }
  const { data, error } = await query
    .order("is_featured", { ascending: false })
    .order("attempt_count", { ascending: false })
    .limit(limit);
  if (error) throw new ApiError("internal", error.message);
  return (data ?? []).map((row) => ({
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
  }));
}

export async function listBookmarkedSetIds(
  db: Db,
  userId: string
): Promise<Set<string>> {
  const { data, error } = await db
    .from("study_set_bookmarks")
    .select("study_set_id")
    .eq("user_id", userId);
  if (error) throw new ApiError("internal", error.message);
  return new Set((data ?? []).map((b) => b.study_set_id));
}

export async function setBookmark(
  db: Db,
  userId: string,
  setId: string,
  bookmarked: boolean
): Promise<void> {
  if (bookmarked) {
    const { error } = await db
      .from("study_set_bookmarks")
      .upsert(
        { user_id: userId, study_set_id: setId },
        { onConflict: "user_id,study_set_id" }
      );
    if (error) throw new ApiError("internal", error.message);
  } else {
    const { error } = await db
      .from("study_set_bookmarks")
      .delete()
      .eq("user_id", userId)
      .eq("study_set_id", setId);
    if (error) throw new ApiError("internal", error.message);
  }
}

/** Atomic play-count bump; the RPC no-ops unless the set is public. */
export async function recordAttempt(db: Db, setId: string): Promise<void> {
  const { error } = await db.rpc("increment_attempt_count", { set_id: setId });
  if (error) throw new ApiError("internal", error.message);
}

export async function reportSet(
  db: Db,
  reporterId: string,
  setId: string,
  reason: string
): Promise<void> {
  const { error } = await db.from("community_reports").insert({
    reporter_id: reporterId,
    study_set_id: setId,
    reason,
  });
  // Unique(reporter, set): duplicate reports are a no-op success.
  if (error && error.code !== "23505")
    throw new ApiError("internal", error.message);
}
