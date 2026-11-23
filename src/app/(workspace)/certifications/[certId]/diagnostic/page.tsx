import { notFound, redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import {
  getCertificationBySlug,
  listDomains,
} from "@/server/data/certifications";
import { canAccessCert } from "@/server/data/enrollments";
import { DiagnosticClient } from "@/components/quiz/DiagnosticClient";

export const metadata = {
  title: "Diagnostic",
};

export default async function DiagnosticPage({
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

  const domains = await listDomains(db, cert.id);
  const domainWeights = Object.fromEntries(
    domains.map((d) => [d.id, d.examWeight])
  );

  return (
    <div className="grid gap-6">
      <div className="mx-auto grid w-full max-w-2xl gap-1.5">
        <h1 className="cb-subsection">Diagnostic</h1>
        <p className="text-small text-muted-foreground">
          The diagnostic measures your starting point in every domain of {cert.name}.
        </p>
      </div>
      <DiagnosticClient
        certId={cert.id}
        certName={cert.name}
        examCode={cert.examCode}
        domainWeights={domainWeights}
      />
    </div>
  );
}
