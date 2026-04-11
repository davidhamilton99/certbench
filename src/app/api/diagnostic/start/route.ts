import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectDiagnosticQuestions } from "@/lib/question-selection/select-diagnostic";
import type { CertQuestion, DomainWeight } from "@/lib/question-selection/types";
import { DIAGNOSTIC_QUESTION_COUNT } from "@/constants/exam-config";
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

  const { limited } = rateLimit(`diagnostic-start:${user.id}`, 10, 3_600_000);
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

  // Check if diagnostic already completed or in progress
  const { data: existing } = await supabase
    .from("diagnostic_attempts")
    .select("id, is_complete")
    .eq("user_id", user.id)
    .eq("certification_id", certificationId)
    .limit(1);

  if (existing && existing.length > 0) {
    if (existing[0].is_complete) {
      return NextResponse.json(
        { error: "Diagnostic already completed" },
        { status: 409 }
      );
    }
    // Delete the abandoned in-progress attempt so user can restart
    await supabase
      .from("diagnostic_answers")
      .delete()
      .eq("attempt_id", existing[0].id);
    await supabase
      .from("diagnostic_attempts")
      .delete()
      .eq("id", existing[0].id);
  }

  // Fetch questions and domains
  const [questionsResult, domainsResult] = await Promise.all([
    supabase
      .from("cert_questions")
      .select("id, certification_id, domain_id, sub_objective_id, question_text, options, correct_index, explanation, difficulty")
      .eq("certification_id", certificationId)
      .eq("is_active", true)
      .eq("is_diagnostic_eligible", true),
    supabase
      .from("cert_domains")
      .select("id, domain_number, title, exam_weight")
      .eq("certification_id", certificationId)
      .order("sort_order"),
  ]);

  if (!questionsResult.data || !domainsResult.data) {
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 }
    );
  }

  const allQuestions = questionsResult.data as CertQuestion[];
  const domains = domainsResult.data as DomainWeight[];

  // Select diagnostic questions
  const selectedQuestions = selectDiagnosticQuestions(allQuestions, domains);

  // Create the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("diagnostic_attempts")
    .insert({
      user_id: user.id,
      certification_id: certificationId,
      total_questions: selectedQuestions.length,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json(
      { error: "Failed to create diagnostic attempt" },
      { status: 500 }
    );
  }

  // Return questions without correct_index and explanation (don't leak answers)
  const sanitizedQuestions = selectedQuestions.map((q) => ({
    id: q.id,
    domain_id: q.domain_id,
    question_text: q.question_text,
    options: (q.options as { text: string; is_correct: boolean }[]).map(
      (o) => ({ text: o.text })
    ),
  }));

  return NextResponse.json({
    attemptId: attempt.id,
    questions: sanitizedQuestions,
    totalQuestions: DIAGNOSTIC_QUESTION_COUNT,
  });
}

export const POST = withErrorHandler(handler);
