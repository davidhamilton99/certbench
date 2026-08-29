import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
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

  const decks = getRecallDecks(active.slug);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recall</h1>
        <p className="text-sm text-muted-foreground">
          {active.name} · speed-drill the facts you have to know cold. Answer
          with the number keys — correct answers fly by, misses come back.
        </p>
      </div>
      <RecallSurface decks={decks} initialDeckKey={deck} />
    </div>
  );
}
