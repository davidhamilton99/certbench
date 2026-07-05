import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getCertificationBySlug } from "@/server/data/certifications";
import { SrsReviewClient } from "@/components/quiz/SrsReviewClient";

export const metadata = {
  title: "Spaced repetition",
};

export default async function SrsPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId: slug } = await params;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const cert = await getCertificationBySlug(db, slug);
  if (!cert) notFound();

  return (
    <div className="grid gap-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Spaced repetition
        </h1>
        <p className="text-sm text-muted-foreground">
          {cert.name} · answer to reschedule each card
        </p>
      </div>
      <SrsReviewClient certId={cert.id} />
    </div>
  );
}
