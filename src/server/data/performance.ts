import "server-only";

import type { Db } from "@/server/supabase/server";
import { allRows } from "@/server/data/paging";
import { listQuestionDomains } from "@/server/data/questions";

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

/*
 * A member's history for one exam is a row for each question answered, so it
 * can run past the 1,000 rows one select answers with. Every select here that
 * takes the whole history is read a page at a time (allRows), in question
 * order. src/__tests__/whole-exam-selects.test.ts keeps it so.
 */

/**
 * All performance rows for a user+cert with the owning question's domain id
 * attached (question_performance itself doesn't store domain_id).
 */
export async function listPerformanceWithDomains(
  db: Db,
  userId: string,
  certId: string
): Promise<PerformanceWithDomain[]> {
  const [performance, questions] = await Promise.all([
    allRows<Omit<PerformanceWithDomain, "domain_id">>((from, to) =>
      db
        .from("question_performance")
        .select(
          "question_id, times_seen, times_correct, last_seen_at, srs_next_review_at, suspended_at"
        )
        .eq("user_id", userId)
        .eq("certification_id", certId)
        .order("question_id")
        .range(from, to)
    ),
    listQuestionDomains(db, certId),
  ]);

  const domainByQuestion = new Map(questions.map((q) => [q.id, q.domain_id]));

  return performance.flatMap((p) => {
    const domainId = domainByQuestion.get(p.question_id);
    if (!domainId) return []; // the question was deleted: skip
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

/** One member's answer counts for one question. */
export interface PerformanceRow {
  question_id: string;
  times_seen: number;
  times_correct: number;
  last_seen_at: string | null;
}

/** Bare performance rows (selection algorithms don't need domain ids). */
export async function listPerformance(
  db: Db,
  userId: string,
  certId: string
): Promise<PerformanceRow[]> {
  return allRows<PerformanceRow>((from, to) =>
    db
      .from("question_performance")
      .select("question_id, times_seen, times_correct, last_seen_at")
      .eq("user_id", userId)
      .eq("certification_id", certId)
      .order("question_id")
      .range(from, to)
  );
}
