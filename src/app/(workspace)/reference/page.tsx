import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { pageCertifications, pageEnrollments } from "@/server/page-reads";
import {
  getCertificationBySlug,
} from "@/server/data/certifications";
import { referenceRegistry } from "@/data/reference";
import { getRecallDecks } from "@/data/recall";
import { ReferenceTableViewer } from "@/components/workspace/ReferenceTableViewer";

export const metadata = {
  title: "Reference",
};

export default async function ReferencePage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string }>;
}) {
  const { cert: certSlug } = await searchParams;
  const { db, user } = await requireProPage();

  const enrollments = await pageEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  if (!active || !enrollments.some((e) => e.certificationId === active!.id)) {
    const certs = await pageCertifications(db);
    active = certs.find((c) => c.id === enrollments[0].certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const tables = referenceRegistry[active.slug] ?? null;
  const drillableTableIds = getRecallDecks(active.slug).map(
    (d) => d.config.tableId
  );

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Reference tables</h1>
        <p className="text-small text-muted-foreground">
          These are the reference tables for {active.name}. Each table can be searched.
        </p>
      </div>
      {!tables ? (
        <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
          There are no reference tables for this certification yet.
        </p>
      ) : (
        <ReferenceTableViewer
          tables={tables}
          certSlug={active.slug}
          drillableTableIds={drillableTableIds}
        />
      )}
    </div>
  );
}
