import "server-only";

import type { Db } from "@/server/supabase/server";
import { ApiError } from "@/contracts/common";
import { getQuestionsByIds } from "@/server/data/questions";
import type { CertQuestion } from "@/core/question-selection/types";

export interface MissedQuestion {
  question: CertQuestion;
  timesSeen: number;
  timesCorrect: number;
  lastSeenAt: string | null;
}

/**
 * Questions the user has missed at least once for a cert, worst accuracy
 * first, with full question detail for explanation display.
 */
export async function listMissedQuestions(
  db: Db,
  userId: string,
  certId: string,
  limit = 25
): Promise<MissedQuestion[]> {
  const { data, error } = await db
    .from("question_performance")
    .select("question_id, times_seen, times_correct, last_seen_at")
    .eq("user_id", userId)
    .eq("certification_id", certId)
    .gt("times_seen", 0);
  if (error) throw new ApiError("internal", error.message);

  const missed = (data ?? [])
    .filter((p) => p.times_correct < p.times_seen)
    .sort(
      (a, b) =>
        a.times_correct / a.times_seen - b.times_correct / b.times_seen
    )
    .slice(0, limit);

  const questions = await getQuestionsByIds(
    db,
    missed.map((m) => m.question_id)
  );
  const byId = new Map(questions.map((q) => [q.id, q]));

  return missed.flatMap((m) => {
    const question = byId.get(m.question_id);
    if (!question) return [];
    return [
      {
        question,
        timesSeen: m.times_seen,
        timesCorrect: m.times_correct,
        lastSeenAt: m.last_seen_at,
      },
    ];
  });
}
