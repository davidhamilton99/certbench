import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { listEnrollments } from "@/server/data/enrollments";
import { getSessionPlan } from "@/server/services/session-plan";
import { ReadinessPanel } from "@/components/workspace/ReadinessPanel";
import { SessionBlockCard } from "@/components/workspace/SessionBlockCard";

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

  const plan = await getSessionPlan(db, user.id, active.id, enrollment.examDate);

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          {active.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          <span className="font-mono">{active.examCode}</span> · today&apos;s plan,
          ordered by impact
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="order-2 grid content-start gap-3 lg:order-1">
          {plan.blocks.map((block, i) => (
            <SessionBlockCard
              key={`${block.type}-${i}`}
              block={block}
              certSlug={active.slug}
            />
          ))}
          {plan.blocks.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up. Check back tomorrow.
            </p>
          )}
        </div>
        <div className="order-1 lg:order-2">
          <ReadinessPanel plan={plan} />
        </div>
      </div>
    </div>
  );
}
