import { redirect } from "next/navigation";
import { PartyPopper } from "lucide-react";
import { createClient } from "@/server/supabase/server";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { listEnrollments } from "@/server/data/enrollments";
import { getProfile } from "@/server/data/profiles";
import { getSessionPlan } from "@/server/services/session-plan";
import { getUserPlan } from "@/server/services/subscription";
import { signShare, shareName } from "@/server/share/readiness-token";
import { publicEnv } from "@/env";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlockCard } from "@/components/workspace/SessionBlockCard";
import type { ShareReadinessProps } from "@/components/workspace/ShareReadiness";
import { DiagnosticGate } from "@/components/workspace/DiagnosticGate";

/** Block types metered by the free daily quota (see practice-exam/start). */
const METERED_TYPES = new Set([
  "domain_drill",
  "weak_points",
  "practice_exam",
  "new_content",
]);

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const enrollments = await listEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  // Resolve the active certification: ?cert= slug, else first enrollment.
  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  let enrollment = active
    ? enrollments.find((e) => e.certificationId === active!.id)
    : undefined;
  if (!active || !enrollment) {
    enrollment = enrollments[0];
    const certs = await listActiveCertifications(db);
    active = certs.find((c) => c.id === enrollment!.certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const [plan, userPlan, profile] = await Promise.all([
    getSessionPlan(db, user.id, active.id, enrollment.examDate),
    getUserPlan(db, user.id),
    getProfile(db, user.id),
  ]);

  // First-run: before the diagnostic, the plan is a single diagnostic block.
  // Show a focused "start here" gate instead of an empty readiness gauge.
  const needsDiagnostic =
    plan.blocks.length === 1 && plan.blocks[0].type === "diagnostic";
  if (needsDiagnostic) {
    return (
      <DiagnosticGate
        certName={active.name}
        examCode={active.examCode}
        href={`/certifications/${active.slug}/diagnostic`}
      />
    );
  }

  const remainingToday =
    userPlan.questionsLimitPerDay === null
      ? Infinity
      : Math.max(0, userPlan.questionsLimitPerDay - userPlan.questionsUsedToday);

  // Shareable readiness card — only once there's a real score to show.
  let share: ShareReadinessProps | undefined;
  if (plan.totalQuestionsSeen > 0) {
    const token = signShare({
      n: shareName(profile?.displayName ?? "A CertBench user"),
      c: active.name,
      x: active.examCode,
      s: Math.round(plan.readinessScore),
      p: plan.readinessIsPreliminary ? 1 : 0,
      d: plan.domainScores
        .slice(0, 5)
        .map((dom) => [dom.title, Math.round(dom.score)]),
    });
    share = {
      url: `${publicEnv.NEXT_PUBLIC_APP_URL}/readiness/${token}`,
      score: Math.round(plan.readinessScore),
      certName: active.name,
    };
  }

  return (
    <div className="relative mx-auto grid w-full max-w-5xl gap-8">
      {/* Ambient glow behind the readiness column — depth without noise. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-0 -z-10 h-72 w-[32rem] rounded-full bg-primary/5 blur-3xl dark:bg-primary/10"
      />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {active.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            <span className="rounded border bg-muted/50 px-1.5 py-0.5 font-mono text-xs">
              {active.examCode}
            </span>{" "}
            · today&apos;s plan, ordered by impact
          </p>
        </div>
        {plan.daysUntilExam !== null && (
          <span className="rounded-full border px-3 py-1 font-mono text-xs text-muted-foreground">
            {plan.daysUntilExam} days to exam
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 grid content-start gap-3 lg:order-1">
          {plan.blocks.map((block, i) => (
            <SessionBlockCard
              key={`${block.type}-${i}`}
              block={block}
              certSlug={active.slug}
              order={i + 1}
              locked={
                METERED_TYPES.has(block.type) &&
                (block.questionCount ?? 0) > remainingToday
              }
            />
          ))}
          {plan.blocks.length === 0 && (
            <div className="grid justify-items-center gap-2 rounded-xl border border-dashed p-10 text-center">
              <PartyPopper className="size-6 text-muted-foreground" />
              <p className="text-sm font-medium">You&apos;re all caught up</p>
              <p className="text-sm text-muted-foreground">
                Nothing due today — check back tomorrow.
              </p>
            </div>
          )}
        </div>
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-8">
            <ReadinessPanel plan={plan} share={share} />
          </div>
        </div>
      </div>
    </div>
  );
}
