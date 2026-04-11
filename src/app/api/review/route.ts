import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const querySchema = z.object({
  cert: z.string().min(1, "cert query param is required"),
});

interface OptionObj {
  text: string;
  is_correct: boolean;
}

async function handler(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`review:${user.id}`, 30, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const parsed = querySchema.safeParse({
    cert: request.nextUrl.searchParams.get("cert"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Invalid query params" },
      { status: 400 }
    );
  }
  const certSlug = parsed.data.cert;

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

  // Parallel fetches: domains, question performance
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

  // No performance data yet — return empty shells
  if (performance.length === 0) {
    return NextResponse.json({
      domains: domains.map((d) => ({
        domain_id: d.id,
        domain_number: d.domain_number,
        title: d.title,
        exam_weight: d.exam_weight,
        accuracy: 0,
        attempted: 0,
        correct: 0,
        questions: [],
      })),
      certName: cert.name,
      hasData: false,
    });
  }

  // Build performance lookup
  const perfMap = new Map(
    performance.map((p) => [p.question_id, p])
  );

  // Fetch ALL questions the user has answered (not just weak ones)
  const allPerfQuestionIds = performance
    .filter((p) => p.times_seen > 0)
    .map((p) => p.question_id);

  const { data: allQuestionDetails } = await supabase
    .from("cert_questions")
    .select(
      "id, domain_id, question_text, options, correct_index, explanation, difficulty"
    )
    .in("id", allPerfQuestionIds)
    .eq("is_active", true);

  const questions = (allQuestionDetails || []) as {
    id: string;
    domain_id: string;
    question_text: string;
    options: unknown;
    correct_index: number;
    explanation: string | null;
    difficulty: string;
  }[];

  // Aggregate performance by domain
  const domainStats = new Map<
    string,
    { attempted: number; correct: number }
  >();

  for (const q of questions) {
    const perf = perfMap.get(q.id);
    if (!perf) continue;
    const stats = domainStats.get(q.domain_id) || {
      attempted: 0,
      correct: 0,
    };
    stats.attempted += perf.times_seen;
    stats.correct += perf.times_correct;
    domainStats.set(q.domain_id, stats);
  }

  // Build domain cheat sheets with ALL answered questions
  const domainSheets = domains.map((domain) => {
    const stats = domainStats.get(domain.id) || {
      attempted: 0,
      correct: 0,
    };
    const accuracy =
      stats.attempted > 0
        ? Math.round((stats.correct / stats.attempted) * 100)
        : 0;

    const domainQuestions = questions
      .filter((q) => q.domain_id === domain.id)
      .map((q) => {
        const perf = perfMap.get(q.id);
        // Options are stored as {text, is_correct}[] objects
        const opts = Array.isArray(q.options) ? q.options : [];
        const correctOpt = opts[q.correct_index] as OptionObj | undefined;
        const correctAnswer =
          correctOpt && typeof correctOpt === "object" && "text" in correctOpt
            ? correctOpt.text
            : typeof correctOpt === "string"
            ? correctOpt
            : "N/A";

        return {
          id: q.id,
          question_text: q.question_text,
          correct_answer: correctAnswer,
          explanation: q.explanation || "",
          difficulty: q.difficulty || "medium",
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
      .slice(0, 15);

    return {
      domain_id: domain.id,
      domain_number: domain.domain_number,
      title: domain.title,
      exam_weight: domain.exam_weight,
      accuracy,
      attempted: stats.attempted,
      correct: stats.correct,
      questions: domainQuestions,
    };
  });

  return NextResponse.json({
    domains: domainSheets,
    certName: cert.name,
    hasData: true,
  });
}

export const GET = withErrorHandler(handler);
