import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listEnrollments } from "@/server/data/enrollments";
import {
  getCertificationBySlug,
  listActiveCertifications,
} from "@/server/data/certifications";
import { recallRegistry } from "@/data/recall";
import { RecallPlayer } from "@/components/recall/RecallPlayer";

export const metadata = {
  title: "Recall",
};

export default async function RecallPage({
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

  const decks = recallRegistry[active.slug] ?? null;

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recall</h1>
        <p className="text-sm text-muted-foreground">
          {active.name} · speed-drill the facts you have to know cold — ports,
          acronyms, and crypto. Answer with the number keys.
        </p>
      </div>
      {!decks ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Recall decks for this certification are coming soon.
        </p>
      ) : (
        <RecallPlayer decks={decks} />
      )}
    </div>
  );
}
