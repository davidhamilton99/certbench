import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { computeSrsUpdate } from "@/core/srs/compute-srs";
import { SRS_DEFAULT_EASE_FACTOR } from "@/core/constants";
import { afterResponse } from "@/server/api/after-response";
import { reportServerError } from "@/server/api/report-error";
import { allRows } from "@/server/data/paging";
import {
  computeReadinessScore,
  type DomainPerformance,
  type ReadinessResult,
} from "@/core/readiness/compute-score";

/**
 * Exam-submission write path, ported behaviour-for-behaviour from the
 * previous lib/exam-submission module. These two functions wrote every
 * existing row in question_performance and readiness_snapshots — their
 * output must remain byte-identical for the same inputs.
 */

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
 * Returns true when the history was updated, and false when the member's
 * existing history could not be read, in which case NOTHING is written (see
 * below). Relies on RLS ("Users manage own performance") for authorization.
 * Callers should ensure `certificationId` matches the questions'
 * certification.
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
): Promise<boolean> {
  const { userId, certificationId, answers, questions, upsertNew } = opts;
  if (answers.length === 0) return true;

  const now = new Date().toISOString();
  const correctIndexMap = new Map(questions.map((q) => [q.id, q.correct_index]));
  const questionIds = answers.map((a) => a.questionId);

  const { data: existingPerf, error: readError } = await supabase
    .from("question_performance")
    .select(
      "id, question_id, times_seen, times_correct, streak, srs_interval_days, srs_ease_factor"
    )
    .eq("user_id", userId)
    .in("question_id", questionIds);

  // A read that failed is not "no history". Taken as one, every answered
  // question would be written below as if seen for the first time, and the
  // upsert would replace the member's counts, streak and review schedule for
  // it. So nothing is written, the failure is logged and reported, and the
  // caller is told (false): an exam's result is still shown, because the
  // attempt itself is already saved.
  if (readError || !existingPerf) {
    console.error("[answers] the member's history could not be read; nothing was written:", readError?.message);
    afterResponse(() =>
      reportServerError(new Error("Answer history could not be read"), { route: "service:submit-exam", kind: "service" })
    );
    return false;
  }

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

  // A write that fails answers with an error and does not throw. The writes
  // are not repeatable (each adds one to a count), so a partial failure is
  // not sent again: it is logged and reported, with a count and no content.
  const results = await Promise.all(ops);
  const failed = results.filter((result) => result && (result as { error?: unknown }).error).length;
  if (failed > 0) {
    console.error(`[answers] ${failed} of ${results.length} history writes failed`);
    afterResponse(() =>
      reportServerError(new Error("Answer history writes failed"), { route: "service:submit-exam", kind: "service" })
    );
  }
  return true;
}

/**
 * Recomputes the user's readiness score across all of their performance
 * for a given certification and writes a snapshot row. Returns the
 * readiness object or null if the required data was unavailable.
 *
 * This function fetches domains, all question_performance rows, and the
 * cert's active question counts (for domain totals) in parallel.
 * Callers don't need to pass any of that in.
 */
export async function recomputeAndSnapshotReadiness(
  supabase: SupabaseClient,
  opts: { userId: string; certificationId: string }
): Promise<ReadinessResult | null> {
  const { userId, certificationId } = opts;

  // An exam's bank and a member's history can each run past the 1,000 rows one
  // select returns (SY0-801 has 1,008 questions), so both are read a page at a
  // time in a fixed order. A page that fails leaves the score uncomputed
  // (null), as a failed select did before: never a score from part of the rows.
  const [domainsResult, allPerformance, allCertQuestions] = await Promise.all([
    supabase
      .from("cert_domains")
      .select("id, domain_number, title, exam_weight")
      .eq("certification_id", certificationId)
      .order("sort_order"),
    allRows<{ question_id: string; times_seen: number; times_correct: number }>((from, to) =>
      supabase
        .from("question_performance")
        .select("question_id, times_seen, times_correct", { count: "exact" })
        .eq("user_id", userId)
        .eq("certification_id", certificationId)
        .order("question_id")
        .range(from, to)
    ).catch(() => null),
    allRows<{ id: string; domain_id: string; is_active: boolean }>((from, to) =>
      supabase
        .from("cert_questions")
        .select("id, domain_id, is_active", { count: "exact" })
        .eq("certification_id", certificationId)
        .order("id")
        .range(from, to)
    ).catch(() => null),
  ]);

  const domains = domainsResult.data as
    | Array<{
        id: string;
        domain_number: string;
        title: string;
        exam_weight: number;
      }>
    | null;

  if (!domains || !allPerformance || !allCertQuestions) return null;

  const qDomainLookup = new Map(
    allCertQuestions.map((q) => [q.id, q.domain_id])
  );

  const totalByDomain = new Map<string, number>();
  for (const q of allCertQuestions) {
    if (!q.is_active) continue;
    totalByDomain.set(q.domain_id, (totalByDomain.get(q.domain_id) || 0) + 1);
  }

  const domainPerformances: DomainPerformance[] = domains.map((d) => {
    const records = allPerformance.filter(
      (p) => qDomainLookup.get(p.question_id) === d.id
    );
    return {
      domain_id: d.id,
      domain_number: d.domain_number,
      title: d.title,
      exam_weight: d.exam_weight,
      attempted: records.reduce((sum, p) => sum + p.times_seen, 0),
      correct: records.reduce((sum, p) => sum + p.times_correct, 0),
      total_questions: totalByDomain.get(d.id) || 0,
    };
  });

  const readiness = computeReadinessScore(domainPerformances);

  await supabase.from("readiness_snapshots").insert({
    user_id: userId,
    certification_id: certificationId,
    overall_score: readiness.overall_score,
    domain_scores: readiness.domain_scores as unknown as Record<string, unknown>,
    total_questions_seen: readiness.total_questions_seen,
    is_preliminary: readiness.is_preliminary,
  });

  return readiness;
}
