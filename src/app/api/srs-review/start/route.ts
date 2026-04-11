import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SRS_MAX_CARDS_PER_SESSION } from "@/constants/exam-config";
import { z } from "zod/v4";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

const startSchema = z.object({
  certificationId: z.string().uuid(),
});

async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`srs-start:${user.id}`, 20, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const parsed = startSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "certificationId is required" },
      { status: 400 }
    );
  }

  const { certificationId } = parsed.data;

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("user_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("certification_id", certificationId)
    .eq("is_active", true)
    .single();

  if (!enrollment) {
    return NextResponse.json(
      { error: "Not enrolled in this certification" },
      { status: 403 }
    );
  }

  // Fetch SRS cards that are due (most overdue first)
  const now = new Date().toISOString();
  const { data: dueCards } = await supabase
    .from("question_performance")
    .select("question_id, srs_next_review_at")
    .eq("user_id", user.id)
    .eq("certification_id", certificationId)
    .not("srs_next_review_at", "is", null)
    .lte("srs_next_review_at", now)
    .order("srs_next_review_at", { ascending: true })
    .limit(SRS_MAX_CARDS_PER_SESSION);

  if (!dueCards || dueCards.length === 0) {
    return NextResponse.json({
      questions: [],
      totalDue: 0,
    });
  }

  // Fetch full question data including correct answers for immediate feedback
  const questionIds = dueCards.map((c) => c.question_id);
  const { data: questions } = await supabase
    .from("cert_questions")
    .select(
      "id, domain_id, question_text, options, correct_index, explanation"
    )
    .in("id", questionIds);

  if (!questions) {
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 }
    );
  }

  // Maintain SRS order (most overdue first)
  type QuestionRow = (typeof questions)[0];
  const questionMap = new Map<string, QuestionRow>(
    questions.map((q) => [q.id, q])
  );
  const orderedQuestions: QuestionRow[] = [];
  for (const id of questionIds) {
    const q = questionMap.get(id);
    if (q) orderedQuestions.push(q);
  }

  // Include correct_index and explanation for immediate SRS feedback
  const reviewQuestions = orderedQuestions.map((q) => ({
    id: q.id,
    domain_id: q.domain_id,
    question_text: q.question_text,
    options: (q.options as { text: string; is_correct: boolean }[]).map(
      (o) => ({ text: o.text })
    ),
    correct_index: q.correct_index,
    explanation: q.explanation,
  }));

  return NextResponse.json({
    questions: reviewQuestions,
    totalDue: dueCards.length,
  });
}

export const POST = withErrorHandler(handler);
