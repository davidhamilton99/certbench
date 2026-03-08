import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSrsUpdate } from "@/lib/srs/compute-srs";
import {
  computeReadinessScore,
  type DomainPerformance,
} from "@/lib/readiness/compute-score";

interface SrsAnswer {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { certificationId, answers } = (await req.json()) as {
    certificationId: string;
    answers: SrsAnswer[];
  };

  if (!certificationId || !answers?.length) {
    return NextResponse.json(
      { error: "certificationId and answers are required" },
      { status: 400 }
    );
  }

  // Update SRS fields for each reviewed card
  const now = new Date().toISOString();
  let totalCorrect = 0;

  for (const a of answers) {
    if (a.isCorrect) totalCorrect++;

    const { data: existing } = await supabase
      .from("question_performance")
      .select(
        "id, times_seen, times_correct, streak, srs_interval_days, srs_ease_factor"
      )
      .eq("user_id", user.id)
      .eq("question_id", a.questionId)
      .single();

    if (existing) {
      const srs = computeSrsUpdate({
        isCorrect: a.isCorrect,
        currentInterval: existing.srs_interval_days,
        currentEase: existing.srs_ease_factor,
        currentStreak: existing.streak,
      });

      await supabase
        .from("question_performance")
        .update({
          times_seen: existing.times_seen + 1,
          times_correct: existing.times_correct + (a.isCorrect ? 1 : 0),
          last_seen_at: now,
          last_correct_at: a.isCorrect ? now : undefined,
          streak: srs.streak,
          srs_interval_days: srs.interval,
          srs_ease_factor: srs.easeFactor,
          srs_next_review_at: srs.nextReviewAt,
        })
        .eq("id", existing.id);
    }
    // SRS cards always have existing performance records
  }

  // Compute updated readiness score
  const { data: domains } = await supabase
    .from("cert_domains")
    .select("id, domain_number, title, exam_weight")
    .eq("certification_id", certificationId)
    .order("sort_order");

  const { data: allPerformance } = await supabase
    .from("question_performance")
    .select("question_id, times_seen, times_correct")
    .eq("user_id", user.id)
    .eq("certification_id", certificationId);

  const { data: questionDomainMap } = await supabase
    .from("cert_questions")
    .select("id, domain_id")
    .eq("certification_id", certificationId);

  let readiness = null;

  if (domains && allPerformance && questionDomainMap) {
    const qDomainLookup = new Map(
      questionDomainMap.map((q) => [q.id, q.domain_id])
    );

    const { data: domainQuestionCounts } = await supabase
      .from("cert_questions")
      .select("domain_id")
      .eq("certification_id", certificationId)
      .eq("is_active", true);

    const totalByDomain = new Map<string, number>();
    domainQuestionCounts?.forEach((q) => {
      totalByDomain.set(
        q.domain_id,
        (totalByDomain.get(q.domain_id) || 0) + 1
      );
    });

    const domainPerformances: DomainPerformance[] = domains.map((d) => {
      const domainPerfRecords = allPerformance.filter(
        (p) => qDomainLookup.get(p.question_id) === d.id
      );
      return {
        domain_id: d.id,
        domain_number: d.domain_number,
        title: d.title,
        exam_weight: d.exam_weight,
        attempted: domainPerfRecords.reduce(
          (sum, p) => sum + p.times_seen,
          0
        ),
        correct: domainPerfRecords.reduce(
          (sum, p) => sum + p.times_correct,
          0
        ),
        total_questions: totalByDomain.get(d.id) || 0,
      };
    });

    readiness = computeReadinessScore(domainPerformances);

    await supabase.from("readiness_snapshots").insert({
      user_id: user.id,
      certification_id: certificationId,
      overall_score: readiness.overall_score,
      domain_scores: readiness.domain_scores as unknown as Record<
        string,
        unknown
      >,
      total_questions_seen: readiness.total_questions_seen,
      is_preliminary: readiness.is_preliminary,
    });
  }

  return NextResponse.json({
    correctCount: totalCorrect,
    totalReviewed: answers.length,
    readiness,
  });
}
