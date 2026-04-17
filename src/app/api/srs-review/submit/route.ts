import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateQuestionPerformanceForAnswers } from "@/lib/exam-submission/update-performance";
import { recomputeAndSnapshotReadiness } from "@/lib/exam-submission/recompute-readiness";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

const srsAnswerSchema = z.object({
  questionId: z.string().uuid(),
  selectedIndex: z.number().int().min(0).max(10),
  isCorrect: z.boolean(), // kept for API compat but overridden by server grading
  timeSpentSeconds: z.number().min(0).max(7200),
});

const submitSchema = z.object({
  certificationId: z.string().uuid(),
  answers: z.array(srsAnswerSchema).min(1).max(200),
});

async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`srs-submit:${user.id}`, 20, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const parsed = submitSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "certificationId and answers are required" },
      { status: 400 }
    );
  }

  const { certificationId, answers } = parsed.data;

  // Grade on the server — don't trust client-supplied isCorrect.
  const questionIds = answers.map((a) => a.questionId);
  const { data: gradingQuestions } = await supabase
    .from("cert_questions")
    .select("id, correct_index")
    .in("id", questionIds);

  const correctIndexMap = new Map(
    (gradingQuestions ?? []).map((q) => [q.id, q.correct_index])
  );

  let totalCorrect = 0;
  for (const a of answers) {
    const correctIndex = correctIndexMap.get(a.questionId);
    if (correctIndex !== undefined && a.selectedIndex === correctIndex) {
      totalCorrect++;
    }
  }

  // SRS review only updates cards that already exist in question_performance
  // (they were picked from there). Missing rows would indicate a bug, so
  // upsertNew=false means we silently drop them instead of creating new ones.
  await updateQuestionPerformanceForAnswers(supabase, {
    userId: user.id,
    certificationId,
    answers,
    questions: gradingQuestions ?? [],
    upsertNew: false,
  });

  const readiness = await recomputeAndSnapshotReadiness(supabase, {
    userId: user.id,
    certificationId,
  });

  return NextResponse.json({
    correctCount: totalCorrect,
    totalReviewed: answers.length,
    readiness,
  });
}

export const POST = withErrorHandler(handler);
