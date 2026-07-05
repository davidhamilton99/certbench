import { notFound, redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getCertificationBySlug } from "@/server/data/certifications";
import { DiagnosticClient } from "@/components/quiz/DiagnosticClient";

export const metadata = {
  title: "Diagnostic exam",
};

export default async function DiagnosticPage({
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
        <h1 className="text-2xl font-semibold tracking-tight">Diagnostic</h1>
        <p className="text-sm text-muted-foreground">
          {cert.name} · establishes your baseline across every domain
        </p>
      </div>
      <DiagnosticClient certId={cert.id} />
    </div>
  );
}
