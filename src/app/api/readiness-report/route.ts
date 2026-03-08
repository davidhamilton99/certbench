import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  computeReport,
  type ComputeReportInput,
} from "@/lib/readiness-report/compute-report";
import { generateRecommendations } from "@/lib/readiness-report/recommendations";

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

  // Look up certification
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

  // Verify enrollment
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
    domainsResult,
    totalQuestionsResult,
    performanceResult,
    lastExamResult,
    snapshotsResult,
    questionCountsResult,
  ] = await Promise.all([
    // Domain metadata
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

    // Question-level performance
    supabase
      .from("question_performance")
      .select(
        "question_id, times_seen, times_correct, last_seen_at, srs_next_review_at"
      )
      .eq("user_id", user.id)
      .eq("certification_id", cert.id),

    // Last completed exam
    supabase
      .from("practice_exam_attempts")
      .select("completed_at")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .eq("is_complete", true)
      .order("completed_at", { ascending: false })
      .limit(1),

    // Recent readiness snapshots (last 10 for trend)
    supabase
      .from("readiness_snapshots")
      .select(
        "overall_score, domain_scores, computed_at, is_preliminary, total_questions_seen"
      )
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .order("computed_at", { ascending: true })
      .limit(10),

    // Question counts per domain
    supabase
      .from("cert_questions")
      .select("domain_id")
      .eq("certification_id", cert.id)
      .eq("is_active", true),
  ]);

  const domains = domainsResult.data || [];
  const totalQuestions = totalQuestionsResult.count || 0;
  const performance = performanceResult.data || [];
  const lastExamDate = lastExamResult.data?.[0]?.completed_at || null;
  const snapshots = snapshotsResult.data || [];

  // Build question counts by domain
  const questionCountsByDomain: Record<string, number> = {};
  for (const q of questionCountsResult.data || []) {
    questionCountsByDomain[q.domain_id] =
      (questionCountsByDomain[q.domain_id] || 0) + 1;
  }

  // Map performance records to include domain_id
  const perfQuestionIds = performance.map((p) => p.question_id);
  let questionDomainMap = new Map<string, string>();

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
    question_id: p.question_id,
    domain_id: questionDomainMap.get(p.question_id) || "",
    times_seen: p.times_seen,
    times_correct: p.times_correct,
    last_seen_at: p.last_seen_at,
  }));

  // Count SRS cards due today
  const now = new Date().toISOString();
  const srsDueCount = performance.filter(
    (p) => p.srs_next_review_at && p.srs_next_review_at <= now
  ).length;

  // Compute report
  const reportInput: ComputeReportInput = {
    domains,
    performances: performanceWithDomain,
    questionCountsByDomain,
    totalQuestions,
    snapshots,
    examDate: enrollment.exam_date,
    srsDueCount,
    lastExamCompletedAt: lastExamDate,
  };

  const report = computeReport(reportInput);
  const recommendations = generateRecommendations(report, certSlug);

  return NextResponse.json({
    report,
    recommendations,
    certName: cert.name,
    certSlug: cert.slug,
  });
}
