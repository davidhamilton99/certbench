import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSrsUpdate } from "@/lib/srs/compute-srs";
import { SRS_DEFAULT_EASE_FACTOR } from "@/constants/exam-config";

export interface GradableAnswer {
  questionId: string;
  selectedIndex: number;
}

export interface GradableQuestion {
  id: string;
  correct_index: number;
}

/**
 * Applies one round of SRS-aware updates to `question_performance` for the
 * caller's answered questions. If a performance row already exists it is
 * incremented and rescheduled; otherwise a new row is inserted. `upsertNew`
 * controls whether missing rows are created — SRS review submits set this
 * to false because a missing row there would be a bug (the card was picked
 * from the user's existing performance).
 *
 * Returns nothing; relies on RLS ("Users manage own performance") for
 * authorization. Callers should ensure `certificationId` matches the
 * questions' certification.
 */
export async function updateQuestionPerformanceForAnswers(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    certificationId: string;
    answers: GradableAnswer[];
    questions: GradableQuestion[];
    upsertNew: boolean;
  }
): Promise<void> {
  const { userId, certificationId, answers, questions, upsertNew } = opts;
  if (answers.length === 0) return;

  const now = new Date().toISOString();
  const correctIndexMap = new Map(questions.map((q) => [q.id, q.correct_index]));
  const questionIds = answers.map((a) => a.questionId);

  const { data: existingPerf } = await supabase
    .from("question_performance")
    .select(
      "id, question_id, times_seen, times_correct, streak, srs_interval_days, srs_ease_factor"
    )
    .eq("user_id", userId)
    .in("question_id", questionIds);

  const perfMap = new Map(
    (existingPerf || []).map((p: { question_id: string }) => [p.question_id, p])
  );

  const ops = answers
    .map((a) => {
      const correctIndex = correctIndexMap.get(a.questionId);
      if (correctIndex === undefined) return null;
      const isCorrect = a.selectedIndex === correctIndex;
      const existing = perfMap.get(a.questionId) as
        | {
            id: string;
            times_seen: number;
            times_correct: number;
            streak: number;
            srs_interval_days: number;
            srs_ease_factor: number;
          }
        | undefined;

      if (existing) {
        const srs = computeSrsUpdate({
          isCorrect,
          currentInterval: existing.srs_interval_days || 1,
          currentEase: existing.srs_ease_factor || SRS_DEFAULT_EASE_FACTOR,
          currentStreak: existing.streak,
        });

        return supabase
          .from("question_performance")
          .update({
            times_seen: existing.times_seen + 1,
            times_correct: existing.times_correct + (isCorrect ? 1 : 0),
            last_seen_at: now,
            last_correct_at: isCorrect ? now : undefined,
            streak: srs.streak,
            srs_interval_days: srs.interval,
            srs_ease_factor: srs.easeFactor,
            srs_next_review_at: srs.nextReviewAt,
          })
          .eq("id", existing.id);
      }

      if (!upsertNew) return null;

      const srs = computeSrsUpdate({
        isCorrect,
        currentInterval: 1,
        currentEase: SRS_DEFAULT_EASE_FACTOR,
        currentStreak: 0,
      });

      return supabase.from("question_performance").upsert(
        {
          user_id: userId,
          question_id: a.questionId,
          certification_id: certificationId,
          times_seen: 1,
          times_correct: isCorrect ? 1 : 0,
          last_seen_at: now,
          last_correct_at: isCorrect ? now : null,
          srs_interval_days: srs.interval,
          srs_ease_factor: srs.easeFactor,
          srs_next_review_at: srs.nextReviewAt,
          streak: srs.streak,
        },
        { onConflict: "user_id,question_id" }
      );
    })
    .filter(Boolean);

  await Promise.all(ops);
}
