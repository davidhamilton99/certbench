import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import {
  getCertificationBySlug,
  listDomains,
} from "@/server/data/certifications";
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
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const cert = await getCertificationBySlug(db, slug);
  if (!cert) notFound();
  const domain = (await listDomains(db, cert.id)).find((d) => d.id === domainId);
  if (!domain) notFound();

  return (
    <div className="grid gap-6">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Drill: {domain.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {cert.name} · domain {domain.domainNumber} · {domain.examWeight}% of the exam
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
