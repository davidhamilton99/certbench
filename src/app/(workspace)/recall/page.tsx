import { redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { getRecallDecks } from "@/data/recall";
import { RecallSurface } from "@/components/recall/RecallSurface";

export const metadata = {
  title: "Recall",
};

export default async function RecallPage({
  searchParams,
}: {
  searchParams: Promise<{ cert?: string; deck?: string }>;
}) {
  const { cert: certSlug, deck } = await searchParams;
  const { db, user } = await requireProPage();

  const enrollments = await listEnrollments(db, user.id);
  if (enrollments.length === 0) redirect("/onboarding");

  let active = certSlug ? await getCertificationBySlug(db, certSlug) : null;
  if (!active || !enrollments.some((e) => e.certificationId === active!.id)) {
    const certs = await listActiveCertifications(db);
    active = certs.find((c) => c.id === enrollments[0].certificationId) ?? null;
  }
  if (!active) redirect("/onboarding");

  const decks = getRecallDecks(active.slug);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div className="grid gap-1.5">
        <h1 className="cb-subsection">Recall</h1>
        <p className="text-small text-muted-foreground">
          Recall drills the {active.name} facts that you must know from memory. A fact that you answer incorrectly
          is asked again later in the session.
        </p>
      </div>
      <RecallSurface
        decks={decks}
        certSlug={active.slug}
        initialDeckKey={deck}
      />
    </div>
  );
}
