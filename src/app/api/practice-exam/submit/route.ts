import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeReadinessScore,
  type DomainPerformance,
} from "@/lib/readiness/compute-score";
import { computeSrsUpdate } from "@/lib/srs/compute-srs";
import { SRS_DEFAULT_EASE_FACTOR } from "@/constants/exam-config";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const answerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(10),
  timeSpentSeconds: z.number().min(0).max(7200),
  isFlagged: z.boolean().optional().default(false),
});

const submitSchema = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(answerSchema).min(1).max(500),
});

async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`exam-submit:${user.id}`, 10, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429 }
    );
  }

  const parsed = submitSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "attemptId and answers are required" },
      { status: 400 }
    );
  }

  const { attemptId, answers } = parsed.data;

  // Verify attempt belongs to user and is not complete
  const { data: attempt } = await supabase
    .from("practice_exam_attempts")
    .select("id, user_id, certification_id, exam_type, is_complete, total_questions")
    .eq("id", attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id) {
    return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.is_complete) {
    return NextResponse.json(
      { error: "Exam already submitted" },
      { status: 409 }
    );
  }

  // Validate answer count matches expected question count
  if (attempt.total_questions && answers.length !== attempt.total_questions) {
    return NextResponse.json(
      { error: `Expected ${attempt.total_questions} answers, received ${answers.length}` },
      { status: 400 }
    );
  }

  // Fetch full question data upfront (used for grading + review response)
  const questionIds = answers.map((a) => a.questionId);
  const { data: fullQuestions } = await supabase
    .from("cert_questions")
    .select("id, domain_id, correct_index, question_text, options, explanation")
    .in("id", questionIds);

  if (!fullQuestions) {
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }

  const questionMap = new Map(fullQuestions.map((q) => [q.id, q]));

  // Grade answers
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
      is_flagged: a.isFlagged || false,
      time_spent_seconds: a.timeSpentSeconds,
    };
  });

  // Insert all responses
  const { error: responsesError } = await supabase
    .from("practice_exam_responses")
    .insert(responses);

  if (responsesError) {
    return NextResponse.json(
      { error: "Failed to save responses" },
      { status: 500 }
    );
  }

  // Mark attempt complete
  await supabase
    .from("practice_exam_attempts")
    .update({
      is_complete: true,
      completed_at: new Date().toISOString(),
      correct_count: correctCount,
    })
    .eq("id", attemptId);

  // Update question_performance with SRS scheduling
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

  const perfOps = answers.map((a) => {
    const question = questionMap.get(a.questionId);
    if (!question) return null;

    const isCorrect = a.selectedIndex === question.correct_index;
    const existing = perfMap.get(a.questionId);

    if (existing) {
      const srs = computeSrsUpdate({
        isCorrect,
        currentInterval: existing.srs_interval_days,
        currentEase: existing.srs_ease_factor,
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

      return supabase.from("question_performance").upsert({
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
      }, { onConflict: "user_id,question_id" });
    }
  }).filter(Boolean);

  await Promise.all(perfOps);

  // Compute readiness score
  // Parallel fetch: domains, user performance, and all active questions (for domain mapping + counts)
  const [domainsResult, allPerformanceResult, allCertQuestionsResult] =
    await Promise.all([
      supabase
        .from("cert_domains")
        .select("id, domain_number, title, exam_weight")
        .eq("certification_id", attempt.certification_id)
        .order("sort_order"),
      supabase
        .from("question_performance")
        .select("question_id, times_seen, times_correct")
        .eq("user_id", user.id)
        .eq("certification_id", attempt.certification_id),
      // Single query replaces two separate cert_questions fetches
      supabase
        .from("cert_questions")
        .select("id, domain_id, is_active")
        .eq("certification_id", attempt.certification_id),
    ]);

  const domains = domainsResult.data;
  const allPerformance = allPerformanceResult.data;
  const allCertQuestions = allCertQuestionsResult.data;

  let readiness = null;

  if (domains && allPerformance && allCertQuestions) {
    const qDomainLookup = new Map(
      allCertQuestions.map((q) => [q.id, q.domain_id])
    );

    const totalByDomain = new Map<string, number>();
    allCertQuestions
      .filter((q) => q.is_active)
      .forEach((q) => {
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
      certification_id: attempt.certification_id,
      overall_score: readiness.overall_score,
      domain_scores: readiness.domain_scores as unknown as Record<
        string,
        unknown
      >,
      total_questions_seen: readiness.total_questions_seen,
      is_preliminary: readiness.is_preliminary,
    });
  }

  // Reorder questions to match the order the user answered them (reuse fullQuestions from grading)
  const orderedQuestions = questionIds
    .map((id) => questionMap.get(id))
    .filter(Boolean);

  return NextResponse.json({
    correctCount,
    totalQuestions: answers.length,
    readiness,
    questions: orderedQuestions,
    responses: responses.map((r) => ({
      questionId: r.question_id,
      selectedIndex: r.selected_index,
      isCorrect: r.is_correct,
    })),
  });
}

export const POST = withErrorHandler(handler);
