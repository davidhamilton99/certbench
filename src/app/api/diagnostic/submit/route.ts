import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeReadinessScore,
  type DomainPerformance,
} from "@/lib/readiness/compute-score";
import { computeSrsUpdate } from "@/lib/srs/compute-srs";
import { SRS_DEFAULT_EASE_FACTOR } from "@/constants/exam-config";
import { z } from "zod/v4";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(10),
  timeSpentSeconds: z.number().min(0).max(7200),
});

const submitSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(answerSchema).min(1).max(500),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = submitSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "attemptId and answers are required" },
      { status: 400 }
    );
  }

  const { attemptId, answers } = parsed.data;

  try {
  // Verify attempt belongs to user and is not complete
  const { data: attempt } = await supabase
    .from("diagnostic_attempts")
    .select("id, user_id, certification_id, is_complete")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.is_complete) {
    return NextResponse.json(
      { error: "Diagnostic already submitted" },
      { status: 409 }
    );
  }

  // Fetch the actual questions to grade
  const questionIds = answers.map((a) => a.questionId);
  const { data: questions } = await supabase
    .from("cert_questions")
    .select("id, domain_id, correct_index")
    .in("id", questionIds);

  if (!questions) {
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }

  const questionMap = new Map(questions.map((q) => [q.id, q]));

  // Grade answers and build responses
  let correctCount = 0;
  const responses = answers.map((a) => {
    const question = questionMap.get(a.questionId);
    const isCorrect = question
      ? a.selectedIndex === question.correct_index
      : false;
    if (isCorrect) correctCount++;

    return {
      attempt_id: attemptId,
      question_id: a.questionId,
      selected_index: a.selectedIndex,
      is_correct: isCorrect,
      time_spent_seconds: a.timeSpentSeconds,
    };
  });

  // Insert all responses
  const { error: responsesError } = await supabase
    .from("diagnostic_responses")
    .insert(responses);

  if (responsesError) {
    return NextResponse.json(
      { error: "Failed to save responses" },
      { status: 500 }
    );
  }

  // Update attempt as complete
  const { error: updateError } = await supabase
    .from("diagnostic_attempts")
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      correct_count: correctCount,
    })
    .eq("id", attemptId);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to update attempt" },
      { status: 500 }
    );
  }

  // Create/update question_performance records
  // Batch-fetch existing records to avoid N+1 sequential queries
  const now = new Date().toISOString();

  const { data: existingPerf } = await supabase
    .from("question_performance")
    .select("id, question_id, times_seen, times_correct, streak, srs_interval_days, srs_ease_factor")
    .eq("user_id", user.id)
    .in("question_id", questionIds);

  const perfMap = new Map(
    (existingPerf || []).map((p) => [p.question_id, p])
  );

  // Process updates and inserts concurrently
  const perfOps = answers.map((a) => {
    const question = questionMap.get(a.questionId);
    if (!question) return null;

    const isCorrect = a.selectedIndex === question.correct_index;
    const existing = perfMap.get(a.questionId);

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
    } else {
      const srs = computeSrsUpdate({
        isCorrect,
        currentInterval: 1,
        currentEase: SRS_DEFAULT_EASE_FACTOR,
        currentStreak: 0,
      });

      return supabase.from("question_performance").insert({
        user_id: user.id,
        question_id: a.questionId,
        certification_id: attempt.certification_id,
        times_seen: 1,
        times_correct: isCorrect ? 1 : 0,
        last_seen_at: now,
        last_correct_at: isCorrect ? now : null,
        srs_interval_days: srs.interval,
        srs_ease_factor: srs.easeFactor,
        srs_next_review_at: srs.nextReviewAt,
        streak: srs.streak,
      });
    }
  }).filter(Boolean);

  await Promise.all(perfOps);

  // Compute readiness score
  const { data: domains } = await supabase
    .from("cert_domains")
    .select("id, domain_number, title, exam_weight")
    .eq("certification_id", attempt.certification_id)
    .order("sort_order");

  const { data: allPerformance } = await supabase
    .from("question_performance")
    .select("question_id, times_seen, times_correct")
    .eq("user_id", user.id)
    .eq("certification_id", attempt.certification_id);

  const { data: questionDomainMap } = await supabase
    .from("cert_questions")
    .select("id, domain_id")
    .eq("certification_id", attempt.certification_id);

  if (domains && allPerformance && questionDomainMap) {
    // Build domain performance
    const qDomainLookup = new Map(
      questionDomainMap.map((q) => [q.id, q.domain_id])
    );

    const { data: domainQuestionCounts } = await supabase
      .from("cert_questions")
      .select("domain_id")
      .eq("certification_id", attempt.certification_id)
      .eq("is_active", true);

    const totalByDomain = new Map<string, number>();
    domainQuestionCounts?.forEach((q) => {
      totalByDomain.set(q.domain_id, (totalByDomain.get(q.domain_id) || 0) + 1);
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

    const readiness = computeReadinessScore(domainPerformances);

    // Save readiness snapshot
    await supabase.from("readiness_snapshots").insert({
      user_id: user.id,
      certification_id: attempt.certification_id,
      overall_score: readiness.overall_score,
      domain_scores: readiness.domain_scores as unknown as Record<string, unknown>,
      total_questions_seen: readiness.total_questions_seen,
      is_preliminary: readiness.is_preliminary,
    });

    // Fetch full question data for the review screen
    const { data: fullQuestions } = await supabase
      .from("cert_questions")
      .select("id, question_text, options, correct_index, explanation, domain_id")
      .in("id", questionIds);

    return NextResponse.json({
      correctCount,
      totalQuestions: answers.length,
      readiness,
      questions: fullQuestions,
      responses: responses.map((r) => ({
        questionId: r.question_id,
        selectedIndex: r.selected_index,
        isCorrect: r.is_correct,
      })),
    });
  }

  return NextResponse.json({
    correctCount,
    totalQuestions: answers.length,
  });

  } catch (err) {
    console.error("Diagnostic submit error:", err);
    return NextResponse.json(
      { error: "Failed to process diagnostic submission" },
      { status: 500 }
    );
  }
}
