import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateQuestionPerformanceForAnswers } from "@/lib/exam-submission/update-performance";
import { recomputeAndSnapshotReadiness } from "@/lib/exam-submission/recompute-readiness";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";
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
    .from("diagnostic_attempts")
    .select("id, user_id, certification_id, is_complete, total_questions")
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

  await updateQuestionPerformanceForAnswers(supabase, {
    userId: user.id,
    certificationId: attempt.certification_id,
    answers,
    questions: fullQuestions,
    upsertNew: true,
  });

  const readiness = await recomputeAndSnapshotReadiness(supabase, {
    userId: user.id,
    certificationId: attempt.certification_id,
  });

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
