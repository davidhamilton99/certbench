import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { referenceRegistry } from "@/data/reference";
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

  const tables = referenceRegistry[active.slug] ?? null;

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reference tables</h1>
        <p className="text-sm text-muted-foreground">
          {active.name} · quick lookup for key exam topics
        </p>
      </div>
      {!tables ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No reference tables for this certification yet.
        </p>
      ) : (
        <ReferenceTableViewer tables={tables} />
      )}
    </div>
  );
}
