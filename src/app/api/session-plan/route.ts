import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { computeSessionPlan } from "@/lib/session/compute-plan";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certSlug = request.nextUrl.searchParams.get("cert");
  if (!certSlug) {
    return NextResponse.json(
      { error: "cert query param is required" },
      { status: 400 }
    );
  }

  // Get certification
  const { data: cert } = await supabase
    .from("certifications")
    .select("id, slug, name")
    .eq("slug", certSlug)
    .single();

  if (!cert) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  // Verify enrollment and get exam date
  const { data: enrollment } = await supabase
    .from("user_enrollments")
    .select("id, exam_date")
    .eq("user_id", user.id)
    .eq("certification_id", cert.id)
    .eq("is_active", true)
    .single();

  if (!enrollment) {
    return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
  }

  // Parallel data fetches
  const [
    diagnosticResult,
    domainsResult,
    totalQuestionsResult,
    performanceResult,
    lastFullExamResult,
  ] = await Promise.all([
    // Check diagnostic completion
    supabase
      .from("diagnostic_attempts")
      .select("id")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .eq("is_complete", true)
      .limit(1),

    // Fetch domains
    supabase
      .from("cert_domains")
      .select("id, domain_number, title, exam_weight")
      .eq("certification_id", cert.id)
      .order("sort_order"),

    // Total active questions
    supabase
      .from("cert_questions")
      .select("id", { count: "exact", head: true })
      .eq("certification_id", cert.id)
      .eq("is_active", true),

    // Question performance with domain mapping
    supabase
      .from("question_performance")
      .select(
        "question_id, times_seen, times_correct, last_seen_at, srs_next_review_at"
      )
      .eq("user_id", user.id)
      .eq("certification_id", cert.id),

    // Last full practice exam
    supabase
      .from("practice_exam_attempts")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .eq("exam_type", "full")
      .eq("is_complete", true)
      .order("completed_at", { ascending: false })
      .limit(1),
  ]);

  const diagnosticComplete =
    (diagnosticResult.data?.length || 0) > 0;
  const domains = domainsResult.data || [];
  const totalQuestionCount = totalQuestionsResult.count || 0;
  const performance = performanceResult.data || [];
  const lastFullExamDate =
    lastFullExamResult.data?.[0]?.completed_at || null;

  // Map performance to include domain_id (need to look up from questions)
  const perfQuestionIds = performance.map((p) => p.question_id);
  let questionDomainMap: Map<string, string> = new Map();

  if (perfQuestionIds.length > 0) {
    const { data: questions } = await supabase
      .from("cert_questions")
      .select("id, domain_id")
      .in("id", perfQuestionIds);

    questionDomainMap = new Map(
      (questions || []).map((q) => [q.id, q.domain_id])
    );
  }

  const performanceWithDomain = performance.map((p) => ({
    ...p,
    domain_id: questionDomainMap.get(p.question_id) || "",
  }));

  // Compute session plan
  const plan = computeSessionPlan({
    diagnosticComplete,
    examDate: enrollment.exam_date,
    domains,
    questionPerformance: performanceWithDomain,
    totalQuestionCount,
    lastFullExamDate,
  });

  return NextResponse.json(plan);
}
