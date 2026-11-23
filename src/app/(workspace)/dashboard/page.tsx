import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { pageCertifications, pageEnrollments, pageProfile } from "@/server/page-reads";
import {
  getCertificationBySlug,
} from "@/server/data/certifications";
import { getSessionPlan } from "@/server/services/session-plan";
import { getUserPlan } from "@/server/services/subscription";
import { signShare, shareName } from "@/server/share/readiness-token";
import { publicEnv } from "@/env";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlockCard } from "@/components/workspace/SessionBlockCard";
import type { ShareReadinessProps } from "@/components/workspace/ShareReadiness";
import { DiagnosticGate } from "@/components/workspace/DiagnosticGate";
import { PathResumeCard } from "@/components/path/PathResumeCard";
import { loadPathBank } from "@/server/path/bank";
import { getPathProgress } from "@/server/data/path-progress";
import { buildPlan, stopAt } from "@/core/path/plan";
import { hasStarted, nextStopIndex, stopsDone } from "@/core/path/progress";
import { isPathCert } from "@/core/path/types";
import { EXAM_NAMES } from "@/data/path/titles";
import type { Db } from "@/server/supabase/server";

/** Block types metered by the free daily quota (see practice-exam/start). */
const METERED_TYPES = new Set([
  "domain_drill",
  "weak_points",
  "practice_exam",
  "new_content",
]);

export const metadata = {
  title: "Study plan",
};

/**
 * The study path card for the active exam: the next step and the progress, from
 * the account's saved path. It never breaks the page: any failure falls back to
 * a plain card that opens the study path.
 */
async function loadPathCard(db: Db, userId: string, slug: string) {
  if (!isPathCert(slug)) return null;
  const href = `/path/${slug}`;
  const name = EXAM_NAMES[slug] ?? "exam";
  try {
    const [bank, saved] = await Promise.all([loadPathBank(slug), getPathProgress(db, userId, slug)]);
    if (!bank || !saved.stored || !hasStarted(saved.progress)) {
      return <PathResumeCard href={href} examName={name} done={null} total={null} nextTitle={null} />;
    }
    const plan = buildPlan(bank.structure);
    const next = stopAt(plan, bank.structure, nextStopIndex(plan, saved.progress));
    return (
      <PathResumeCard
        href={href}
        examName={name}
        done={stopsDone(plan, saved.progress)}
        total={plan.stops.length}
        nextTitle={next?.kind === "review" ? "Keep practicing" : (next?.title ?? null)}
      />
    );
  } catch {
    return <PathResumeCard href={href} examName={name} done={null} total={null} nextTitle={null} />;
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const { db, user } = await requireProPage();

  const enrollments = await pageEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  // Resolve the active certification: ?cert= slug, else first enrollment.
  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  let enrollment = active
    ? enrollments.find((e) => e.certificationId === active!.id)
    : undefined;
  if (!active || !enrollment) {
    enrollment = enrollments[0];
    const certs = await pageCertifications(db);
    active = certs.find((c) => c.id === enrollment!.certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const [plan, userPlan, profile] = await Promise.all([
    getSessionPlan(db, user.id, active.id, enrollment.examDate),
    getUserPlan(db, user.id),
    pageProfile(db, user.id),
  ]);

  const pathCard = await loadPathCard(db, user.id, active.slug);

  // Before the diagnostic the plan is one block, the diagnostic itself. The
  // page then shows what the diagnostic is, where an empty score would be.
  const needsDiagnostic =
    plan.blocks.length === 1 && plan.blocks[0].type === "diagnostic";
  if (needsDiagnostic) {
    return (
      <div className="mx-auto grid w-full max-w-5xl gap-6">
        {pathCard}
        <DiagnosticGate
          certName={active.name}
          examCode={active.examCode}
          href={`/certifications/${active.slug}/diagnostic`}
        />
      </div>
    );
  }

  const remainingToday =
    userPlan.questionsLimitPerDay === null
      ? Infinity
      : Math.max(0, userPlan.questionsLimitPerDay - userPlan.questionsUsedToday);

  // The link for sharing the score exists only once there is a score to show.
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
      {pathCard}
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Study plan for {active.name}</h1>
        <p className="text-small text-muted-foreground">
          This is your plan for exam <span className="font-mono text-xs">{active.examCode}</span>. Today&apos;s work
          is listed in order of importance.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section aria-labelledby="todays-work" className="order-2 grid content-start gap-3 lg:order-1">
          <h2 id="todays-work" className="text-base font-semibold">
            Today&apos;s work
          </h2>
          {plan.blocks.length > 0 ? (
            <ol className="grid gap-3">
              {plan.blocks.map((block, i) => (
                <li key={`${block.type}-${i}`}>
                  <SessionBlockCard
                    block={block}
                    certSlug={active.slug}
                    order={i + 1}
                    locked={
                      METERED_TYPES.has(block.type) &&
                      (block.questionCount ?? 0) > remainingToday
                    }
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="grid gap-1.5 rounded-lg border border-dashed border-input p-8 text-small">
              <p className="font-medium">You have completed today&apos;s plan.</p>
              <p className="text-muted-foreground">Nothing else is due today. Please return tomorrow.</p>
            </div>
          )}
        </section>
        <div className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-8">
            <ReadinessPanel plan={plan} share={share} />
          </div>
        </div>
      </div>
    </div>
  );
}
