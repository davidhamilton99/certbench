import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { pbqRegistry } from "@/data/pbq";
import { getUserPlan } from "@/server/services/subscription";
import { PbqScenarios } from "@/components/workspace/PbqScenarios";

export const metadata = {
  title: "Hands-on labs",
};

export default async function PbqPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const { db, user } = await requireProPage();

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
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Hands-on labs</h1>
        <p className="cb-measure text-small text-muted-foreground">
          These are the hands-on labs for {active.name}. Each one is a task of the kind that the exam sets as a
          performance-based question (PBQ).
        </p>
      </div>
      {scenarios.length === 0 ? (
        <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
          There are no hands-on labs for this certification yet.
        </p>
      ) : (
        <PbqScenarios scenarios={scenarios} isPro={plan.plan === "pro"} />
      )}
    </div>
  );
}
