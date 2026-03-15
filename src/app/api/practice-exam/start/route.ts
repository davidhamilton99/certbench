import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { selectPracticeQuestions } from "@/lib/question-selection/select-questions";
import type {
  CertQuestion,
  DomainWeight,
  QuestionPerformanceRecord,
} from "@/lib/question-selection/types";
import {
  FULL_EXAM_QUESTION_COUNT,
  DOMAIN_DRILL_QUESTION_COUNT,
} from "@/constants/exam-config";
import { z } from "zod/v4";

const startSchema = z.object({
  certificationId: z.string().uuid(),
  examType: z.enum(["full", "domain_drill", "weak_points"]).optional().default("full"),
  domainId: z.string().uuid().optional(),
}).refine(
  (data) => data.examType !== "domain_drill" || !!data.domainId,
  { message: "domainId is required for domain drills" }
);

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = startSchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid input" },
      { status: 400 }
    );
  }

  const { certificationId, examType, domainId } = parsed.data;

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

  // Fetch questions — filter by domain for drills
  let questionsQuery = supabase
    .from("cert_questions")
    .select(
      "id, certification_id, domain_id, sub_objective_id, question_text, options, correct_index, explanation, difficulty"
    )
    .eq("certification_id", certificationId)
    .eq("is_active", true);

  if (examType === "domain_drill" && domainId) {
    questionsQuery = questionsQuery.eq("domain_id", domainId);
  }

  const [questionsResult, domainsResult, performanceResult] =
    await Promise.all([
      questionsQuery,
      supabase
        .from("cert_domains")
        .select("id, domain_number, title, exam_weight")
        .eq("certification_id", certificationId)
        .order("sort_order"),
      supabase
        .from("question_performance")
        .select("question_id, times_seen, times_correct, last_seen_at")
        .eq("user_id", user.id)
        .eq("certification_id", certificationId),
    ]);

  if (!questionsResult.data || !domainsResult.data) {
    return NextResponse.json(
      { error: "Failed to load questions" },
      { status: 500 }
    );
  }

  const allQuestions = questionsResult.data as CertQuestion[];
  let domains = domainsResult.data as DomainWeight[];
  const performance = (performanceResult.data ||
    []) as QuestionPerformanceRecord[];

  // For domain drill, use only the target domain with 100% weight
  if (examType === "domain_drill" && domainId) {
    const targetDomain = domains.find((d) => d.id === domainId);
    if (!targetDomain) {
      return NextResponse.json(
        { error: "Domain not found" },
        { status: 404 }
      );
    }
    domains = [{ ...targetDomain, exam_weight: 100 }];
  }

  const questionCount =
    examType === "full"
      ? FULL_EXAM_QUESTION_COUNT
      : DOMAIN_DRILL_QUESTION_COUNT;

  const selectedQuestions = selectPracticeQuestions(
    allQuestions,
    domains,
    performance,
    Math.min(questionCount, allQuestions.length)
  );

  // Create the attempt
  const { data: attempt, error: attemptError } = await supabase
    .from("practice_exam_attempts")
    .insert({
      user_id: user.id,
      certification_id: certificationId,
      exam_type: examType,
      domain_id: examType === "domain_drill" ? domainId : null,
      total_questions: selectedQuestions.length,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return NextResponse.json(
      { error: "Failed to create exam attempt" },
      { status: 500 }
    );
  }

  // Return questions without correct answers
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
    totalQuestions: selectedQuestions.length,
    examType,
  });
}
