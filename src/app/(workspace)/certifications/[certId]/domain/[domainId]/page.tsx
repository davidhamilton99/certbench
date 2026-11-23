import { notFound, redirect } from "next/navigation";
import { requireProPage } from "@/server/auth";
import {
  getCertificationBySlug,
  listDomains,
} from "@/server/data/certifications";
import { canAccessCert } from "@/server/data/enrollments";
import { PracticeExamClient } from "@/components/quiz/PracticeExamClient";

export const metadata = {
  title: "Domain drill",
};

export default async function DomainDrillPage({
  params,
}: {
  params: Promise<{ certId: string; domainId: string }>;
}) {
  const { certId: slug, domainId } = await params;
  const { db, user } = await requireProPage();

  const cert = await getCertificationBySlug(db, slug);
  if (!cert) notFound();
  if (!(await canAccessCert(db, user.id, cert.id))) {
    redirect(`/upgrade?reason=cert-locked&cert=${slug}`);
  }
  const domain = (await listDomains(db, cert.id)).find((d) => d.id === domainId);
  if (!domain) notFound();

  return (
    <div className="grid gap-6">
      <div className="mx-auto grid w-full max-w-2xl gap-1.5">
        <h1 className="cb-subsection">Domain drill: {domain.title}</h1>
        <p className="text-small text-muted-foreground">
          This is domain {domain.domainNumber.replace(/\.0$/, "")} of {cert.name}. It is {domain.examWeight}% of the
          exam.
        </p>
      </div>
      <PracticeExamClient
        certId={cert.id}
        examType="domain_drill"
        domainId={domain.id}
      />
    </div>
  );
}
