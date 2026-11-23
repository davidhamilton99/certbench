import { notFound, redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import { getCertificationBySlug } from "@/server/data/certifications";
import { canAccessCert } from "@/server/data/enrollments";
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
  const { db, user } = await requireProPage();

  const cert = await getCertificationBySlug(db, slug);
  if (!cert) notFound();
  if (!(await canAccessCert(db, user.id, cert.id))) {
    redirect(`/upgrade?reason=cert-locked&cert=${slug}`);
  }

  return (
    <div className="grid gap-6">
      <div className="mx-auto grid w-full max-w-2xl gap-1.5">
        <h1 className="cb-subsection">Spaced repetition</h1>
        <p className="text-small text-muted-foreground">
          These are the {cert.name} questions that are due for review. Each answer sets when the question is shown
          again.
        </p>
      </div>
      <SrsReviewClient certId={cert.id} />
    </div>
  );
}
