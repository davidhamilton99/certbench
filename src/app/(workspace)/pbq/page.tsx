import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { pbqRegistry } from "@/data/pbq";
import { getUserPlan } from "@/server/services/subscription";
import { PbqScenarios } from "@/components/workspace/PbqScenarios";

export const metadata = {
  title: "PBQ lab",
};

export default async function PbqPage({
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

  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  if (!active || !enrollments.some((e) => e.certificationId === active!.id)) {
    const certs = await listActiveCertifications(db);
    active = certs.find((c) => c.id === enrollments[0].certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const scenarios = pbqRegistry[active.slug] ?? [];
  const plan = await getUserPlan(db, user.id);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">PBQ lab</h1>
        <p className="text-sm text-muted-foreground">
          {active.name} · interactive scenarios that mirror the hands-on exam
          questions
        </p>
      </div>
      {scenarios.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No scenarios for this certification yet.
        </p>
      ) : (
        <PbqScenarios scenarios={scenarios} isPro={plan.plan === "pro"} />
      )}
    </div>
  );
}
