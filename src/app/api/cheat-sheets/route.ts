import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    .select("id, name, slug")
    .eq("slug", certSlug)
    .single();

  if (!cert) {
    return NextResponse.json(
      { error: "Certification not found" },
      { status: 404 }
    );
  }

  // Parallel fetches: domains, question performance, questions
  const [domainsResult, performanceResult] = await Promise.all([
    supabase
      .from("cert_domains")
      .select("id, domain_number, title, exam_weight")
      .eq("certification_id", cert.id)
      .order("sort_order"),

    supabase
      .from("question_performance")
      .select("question_id, times_seen, times_correct")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id),
  ]);

  const domains = domainsResult.data || [];
  const performance = performanceResult.data || [];

  // Identify weak questions: seen ≥1 time with accuracy < 60%
  const weakQuestionIds = performance
    .filter(
      (p) => p.times_seen > 0 && p.times_correct / p.times_seen < 0.6
    )
    .map((p) => p.question_id);

  // Also include never-seen questions for domains with low coverage
  // (handled client-side via domain accuracy stats)

  if (weakQuestionIds.length === 0 && performance.length === 0) {
    return NextResponse.json({
      domains: domains.map((d) => ({
        ...d,
        accuracy: 0,
        attempted: 0,
        correct: 0,
        weak_questions: [],
      })),
      certName: cert.name,
      hasData: false,
    });
  }

  // Build performance lookup
  const perfMap = new Map(
    performance.map((p) => [p.question_id, p])
  );

  // Fetch weak question details
  let weakQuestions: {
    id: string;
    domain_id: string;
    question_text: string;
    options: string[];
    correct_index: number;
    explanation: string;
    difficulty: string;
  }[] = [];

  if (weakQuestionIds.length > 0) {
    const { data } = await supabase
      .from("cert_questions")
      .select(
        "id, domain_id, question_text, options, correct_index, explanation, difficulty"
      )
      .in("id", weakQuestionIds)
      .eq("is_active", true);

    weakQuestions = (data || []) as typeof weakQuestions;
  }

  // Also fetch all question domain mappings for performance stats
  const allPerfQuestionIds = performance.map((p) => p.question_id);
  let questionDomainMap = new Map<string, string>();

  if (allPerfQuestionIds.length > 0) {
    const { data: allQuestions } = await supabase
      .from("cert_questions")
      .select("id, domain_id")
      .in("id", allPerfQuestionIds);

    questionDomainMap = new Map(
      (allQuestions || []).map((q) => [q.id, q.domain_id])
    );
  }

  // Aggregate performance by domain
  const domainStats = new Map<
    string,
    { attempted: number; correct: number }
  >();

  for (const p of performance) {
    const domainId = questionDomainMap.get(p.question_id);
    if (!domainId) continue;
    const stats = domainStats.get(domainId) || { attempted: 0, correct: 0 };
    stats.attempted += p.times_seen;
    stats.correct += p.times_correct;
    domainStats.set(domainId, stats);
  }

  // Build domain cheat sheets
  const domainSheets = domains.map((domain) => {
    const stats = domainStats.get(domain.id) || { attempted: 0, correct: 0 };
    const accuracy =
      stats.attempted > 0
        ? Math.round((stats.correct / stats.attempted) * 100)
        : 0;

    const domainWeakQuestions = weakQuestions
      .filter((q) => q.domain_id === domain.id)
      .map((q) => {
        const perf = perfMap.get(q.id);
        return {
          id: q.id,
          question_text: q.question_text,
          correct_answer: q.options[q.correct_index],
          explanation: q.explanation,
          difficulty: q.difficulty,
          times_seen: perf?.times_seen || 0,
          times_correct: perf?.times_correct || 0,
        };
      })
      // Sort by accuracy ascending (weakest first)
      .sort((a, b) => {
        const accA =
          a.times_seen > 0 ? a.times_correct / a.times_seen : 0;
        const accB =
          b.times_seen > 0 ? b.times_correct / b.times_seen : 0;
        return accA - accB;
      })
      // Limit to top 10 weakest per domain
      .slice(0, 10);

    return {
      domain_id: domain.id,
      domain_number: domain.domain_number,
      title: domain.title,
      exam_weight: domain.exam_weight,
      accuracy,
      attempted: stats.attempted,
      correct: stats.correct,
      weak_questions: domainWeakQuestions,
    };
  });

  return NextResponse.json({
    domains: domainSheets,
    certName: cert.name,
    hasData: performance.length > 0,
  });
}
