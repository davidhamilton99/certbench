import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";

/** question_performance row joined with its question's domain. */
export interface PerformanceWithDomain {
  question_id: string;
  domain_id: string;
  times_seen: number;
  times_correct: number;
  last_seen_at: string | null;
  srs_next_review_at: string | null;
  suspended_at: string | null;
}

/**
 * All performance rows for a user+cert with the owning question's domain id
 * attached (question_performance itself doesn't store domain_id).
 */
export async function listPerformanceWithDomains(
  db: Db,
  userId: string,
  certId: string
): Promise<PerformanceWithDomain[]> {
  const [perfResult, questionsResult] = await Promise.all([
    db
      .from("question_performance")
      .select(
        "question_id, times_seen, times_correct, last_seen_at, srs_next_review_at, suspended_at"
      )
      .eq("user_id", userId)
      .eq("certification_id", certId),
    db
      .from("cert_questions")
      .select("id, domain_id")
      .eq("certification_id", certId),
  ]);
  if (perfResult.error) throw new ApiError("internal", perfResult.error.message);
  if (questionsResult.error)
    throw new ApiError("internal", questionsResult.error.message);

  const domainByQuestion = new Map(
    (questionsResult.data ?? []).map((q) => [q.id, q.domain_id])
  );

  return (perfResult.data ?? []).flatMap((p) => {
    const domainId = domainByQuestion.get(p.question_id);
    if (!domainId) return []; // question deleted/deactivated — skip
    return [
      {
        question_id: p.question_id,
        domain_id: domainId,
        times_seen: p.times_seen,
        times_correct: p.times_correct,
        last_seen_at: p.last_seen_at,
        srs_next_review_at: p.srs_next_review_at,
        suspended_at: p.suspended_at,
      },
    ];
  });
}

/** Bare performance rows (selection algorithms don't need domain ids). */
export async function listPerformance(
  db: Db,
  userId: string,
  certId: string
): Promise<
  {
    question_id: string;
    times_seen: number;
    times_correct: number;
    last_seen_at: string | null;
  }[]
> {
  const { data, error } = await db
    .from("question_performance")
    .select("question_id, times_seen, times_correct, last_seen_at")
    .eq("user_id", userId)
    .eq("certification_id", certId);
  if (error) throw new ApiError("internal", error.message);
  return data ?? [];
}
