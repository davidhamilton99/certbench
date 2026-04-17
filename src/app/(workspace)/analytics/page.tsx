import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ReadinessChart } from "@/components/workspace/analytics/ReadinessChart";
import { ActivityChart } from "@/components/workspace/analytics/ActivityChart";
import {
  shapeReadinessSeries,
  shapeActivityByDay,
  shapeWeakestSubObjectives,
} from "@/lib/analytics/shape";
import { READINESS_THRESHOLDS } from "@/constants/exam-config";

export const metadata = {
  title: "Analytics — CertBench",
};

const READINESS_LOOKBACK_DAYS = 90;
const ACTIVITY_LOOKBACK_DAYS = 30;
const WEAKEST_SUB_OBJECTIVE_LIMIT = 5;
const WEAKEST_MIN_ATTEMPTED = 3;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  if (!certSlug) {
    const { data: firstEnrollment } = await supabase
      .from("user_enrollments")
      .select("certifications(slug)")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();

    const slug = (firstEnrollment?.certifications as unknown as {
      slug: string;
    } | null)?.slug;
    if (slug) redirect(`/analytics?cert=${slug}`);

    return (
      <NoCertSelected />
    );
  }

  const { data: cert } = await supabase
    .from("certifications")
    .select("id, slug, name, exam_code")
    .eq("slug", certSlug)
    .single();

  if (!cert) {
    return <NoCertSelected />;
  }

  const readinessSince = new Date(
    Date.now() - READINESS_LOOKBACK_DAYS * 86_400_000
  ).toISOString();
  const activitySince = new Date(
    Date.now() - ACTIVITY_LOOKBACK_DAYS * 86_400_000
  ).toISOString();

  // First round of fetches — everything that doesn't depend on knowing
  // the certification's domain IDs up front.
  const [
    snapshotsResult,
    attemptsResult,
    domainsResult,
    performanceResult,
  ] = await Promise.all([
    supabase
      .from("readiness_snapshots")
      .select("overall_score, computed_at, domain_scores, is_preliminary")
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .gte("computed_at", readinessSince)
      .order("computed_at", { ascending: true }),
    supabase
      .from("practice_exam_attempts")
      .select(
        "exam_type, started_at, completed_at, total_questions, correct_count, is_complete"
      )
      .eq("user_id", user.id)
      .eq("certification_id", cert.id)
      .eq("is_complete", true)
      .gte("completed_at", activitySince)
      .order("completed_at", { ascending: false }),
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

  const snapshots = snapshotsResult.data ?? [];
  const attempts = attemptsResult.data ?? [];
  const domains = domainsResult.data ?? [];
  const performance = performanceResult.data ?? [];

  // Second round: sub-objectives need the domain ID list. cert_sub_objectives
  // doesn't carry certification_id directly, so we filter by domain_id.
  const domainIds = domains.map((d) => d.id);
  const { data: subObjectivesData } = domainIds.length
    ? await supabase
        .from("cert_sub_objectives")
        .select("id, code, title, domain_id")
        .in("domain_id", domainIds)
    : { data: [] };
  const subObjectives = subObjectivesData ?? [];

  // Latest snapshot = "current" readiness (fallback to 0 if none)
  const latestSnapshot = snapshots[snapshots.length - 1] ?? null;

  // Build question → sub_objective map for the performance subset
  let weakestSubs: ReturnType<typeof shapeWeakestSubObjectives> = [];
  if (performance.length > 0 && subObjectives.length > 0) {
    const perfQuestionIds = performance.map((p) => p.question_id);
    const { data: questionRows } = await supabase
      .from("cert_questions")
      .select("id, sub_objective_id")
      .in("id", perfQuestionIds);

    const questionToSub = new Map<string, string>();
    for (const q of questionRows ?? []) {
      if (q.sub_objective_id) questionToSub.set(q.id, q.sub_objective_id);
    }
    const domainNumbers = new Map(domains.map((d) => [d.id, d.domain_number]));
    weakestSubs = shapeWeakestSubObjectives(
      performance,
      questionToSub,
      subObjectives,
      domainNumbers,
      {
        minAttempted: WEAKEST_MIN_ATTEMPTED,
        limit: WEAKEST_SUB_OBJECTIVE_LIMIT,
      }
    );
  }

  const readinessPoints = shapeReadinessSeries(
    snapshots.map((s) => ({
      overall_score: s.overall_score,
      computed_at: s.computed_at,
    }))
  );
  const activity = shapeActivityByDay(attempts, ACTIVITY_LOOKBACK_DAYS);

  // Domain scores table — reuse latest snapshot when available
  const domainScoresFromSnapshot = (latestSnapshot?.domain_scores ?? []) as Array<{
    domain_id: string;
    domain_number: string;
    title: string;
    exam_weight: number;
    attempted: number;
    correct: number;
    raw_score: number;
    confidence_factor: number;
    weighted_score: number;
  }>;

  const totalQuestionsSeen = performance.reduce(
    (sum, p) => sum + p.times_seen,
    0
  );
  const totalCorrect = performance.reduce(
    (sum, p) => sum + p.times_correct,
    0
  );
  const overallAccuracy =
    totalQuestionsSeen > 0
      ? (totalCorrect / totalQuestionsSeen) * 100
      : 0;

  const completedAttemptCount = attempts.length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-1">
          Analytics
        </h1>
        <p className="text-[14px] text-text-secondary">
          {cert.name} ({cert.exam_code})
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          label="CURRENT READINESS"
          value={
            latestSnapshot
              ? `${Number(latestSnapshot.overall_score).toFixed(1)}%`
              : "—"
          }
          sub={
            latestSnapshot?.is_preliminary ? "preliminary" : "confident"
          }
        />
        <KpiTile
          label="OVERALL ACCURACY"
          value={`${overallAccuracy.toFixed(1)}%`}
          sub={`${totalCorrect}/${totalQuestionsSeen}`}
        />
        <KpiTile
          label="EXAMS (30D)"
          value={`${completedAttemptCount}`}
          sub="completed"
        />
        <KpiTile
          label="QUESTIONS (30D)"
          value={`${activity.reduce((s, d) => s + d.questions, 0)}`}
          sub="answered"
        />
      </div>

      {/* Readiness trend */}
      <Card padding="lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">
              Readiness over time
            </h2>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              {READINESS_LOOKBACK_DAYS}-day window
            </span>
          </div>
          <ReadinessChart
            points={readinessPoints}
            thresholds={[
              { label: "PASS", value: READINESS_THRESHOLDS.GREEN, tone: "success" },
              {
                label: "AT RISK",
                value: READINESS_THRESHOLDS.ORANGE,
                tone: "warning",
              },
            ]}
          />
        </div>
      </Card>

      {/* Activity */}
      <Card padding="lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">
              Activity
            </h2>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              last {ACTIVITY_LOOKBACK_DAYS}d · correct / total
            </span>
          </div>
          <ActivityChart days={activity} />
        </div>
      </Card>

      {/* Domain performance */}
      <Card padding="lg">
        <div className="flex flex-col gap-3">
          <h2 className="text-[15px] font-semibold text-text-primary">
            Domain performance
          </h2>
          {domainScoresFromSnapshot.length === 0 ? (
            <p className="text-[13px] text-text-muted">
              Domain scores will appear here once you've taken the diagnostic
              or a practice exam.
            </p>
          ) : (
            <DomainTable rows={domainScoresFromSnapshot} />
          )}
        </div>
      </Card>

      {/* Weakest sub-objectives */}
      <Card padding="lg">
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold text-text-primary">
              Weakest sub-objectives
            </h2>
            <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
              ≥ {WEAKEST_MIN_ATTEMPTED} attempts
            </span>
          </div>
          {weakestSubs.length === 0 ? (
            <p className="text-[13px] text-text-muted">
              Answer a few more questions to surface weakest sub-objectives.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {weakestSubs.map((s) => (
                <li
                  key={s.subObjectiveId}
                  className="flex items-baseline justify-between gap-3 border-b border-border-light pb-2 last:border-b-0 last:pb-0"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-[12px] font-mono text-text-muted flex-shrink-0">
                      {s.code}
                    </span>
                    <span className="text-[13px] text-text-primary truncate">
                      {s.title}
                    </span>
                  </div>
                  <span className="text-[13px] font-mono tabular-nums text-text-secondary flex-shrink-0">
                    {s.accuracy.toFixed(0)}% · {s.correct}/{s.attempted}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function NoCertSelected() {
  return (
    <div className="max-w-lg">
      <Card padding="lg">
        <div className="flex flex-col gap-3">
          <h2 className="text-[16px] font-semibold text-text-primary">
            No certification selected
          </h2>
          <p className="text-[14px] text-text-secondary">
            Enroll in a certification to see analytics.
          </p>
          <div>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card padding="md">
      <div className="flex flex-col gap-1">
        <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
          {label}
        </span>
        <span className="text-[22px] font-mono font-semibold text-text-primary tabular-nums leading-tight">
          {value}
        </span>
        {sub && (
          <span className="text-[11px] font-mono text-text-muted">{sub}</span>
        )}
      </div>
    </Card>
  );
}

function DomainTable({
  rows,
}: {
  rows: Array<{
    domain_id: string;
    domain_number: string;
    title: string;
    exam_weight: number;
    attempted: number;
    correct: number;
    raw_score: number;
    confidence_factor: number;
    weighted_score: number;
  }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] font-mono uppercase tracking-wider text-text-muted">
            <th className="text-left pb-2 pr-4 font-normal">Domain</th>
            <th className="text-right pb-2 px-2 font-normal">Weight</th>
            <th className="text-right pb-2 px-2 font-normal">Attempts</th>
            <th className="text-right pb-2 px-2 font-normal">Accuracy</th>
            <th className="text-right pb-2 px-2 font-normal">Confidence</th>
            <th className="text-right pb-2 pl-2 font-normal">Weighted</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.domain_id} className="border-t border-border-light">
              <td className="py-2 pr-4">
                <span className="font-mono text-text-muted mr-2">
                  {d.domain_number}
                </span>
                <span className="text-text-primary">{d.title}</span>
              </td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-text-secondary">
                {d.exam_weight}%
              </td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-text-secondary">
                {d.correct}/{d.attempted}
              </td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-text-primary">
                {d.raw_score.toFixed(0)}%
              </td>
              <td className="py-2 px-2 text-right font-mono tabular-nums text-text-secondary">
                {Math.round(d.confidence_factor * 100)}%
              </td>
              <td className="py-2 pl-2 text-right font-mono tabular-nums font-semibold text-text-primary">
                {d.weighted_score.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
