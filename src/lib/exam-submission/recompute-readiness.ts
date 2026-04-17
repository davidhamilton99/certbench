import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeReadinessScore,
  type DomainPerformance,
  type ReadinessResult,
} from "@/lib/readiness/compute-score";

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

  const [domainsResult, allPerformanceResult, allCertQuestionsResult] =
    await Promise.all([
      supabase
        .from("cert_domains")
        .select("id, domain_number, title, exam_weight")
        .eq("certification_id", certificationId)
        .order("sort_order"),
      supabase
        .from("question_performance")
        .select("question_id, times_seen, times_correct")
        .eq("user_id", userId)
        .eq("certification_id", certificationId),
      supabase
        .from("cert_questions")
        .select("id, domain_id, is_active")
        .eq("certification_id", certificationId),
    ]);

  const domains = domainsResult.data as
    | Array<{
        id: string;
        domain_number: string;
        title: string;
        exam_weight: number;
      }>
    | null;
  const allPerformance = allPerformanceResult.data as
    | Array<{ question_id: string; times_seen: number; times_correct: number }>
    | null;
  const allCertQuestions = allCertQuestionsResult.data as
    | Array<{ id: string; domain_id: string; is_active: boolean }>
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
