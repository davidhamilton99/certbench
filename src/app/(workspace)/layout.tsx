import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getProfile } from "@/server/data/profiles";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [profile, enrollments, certifications] = await Promise.all([
    getProfile(db, user.id),
    listEnrollments(db, user.id),
    listActiveCertifications(db),
  ]);

  if (!profile?.onboardingCompleted || enrollments.length === 0) {
    redirect("/onboarding");
  }

  const certById = new Map(certifications.map((c) => [c.id, c]));
  const enrolledCerts = enrollments.flatMap((e) => {
    const cert = certById.get(e.certificationId);
    return cert
      ? [{ slug: cert.slug, name: cert.name, examCode: cert.examCode }]
      : [];
  });

  return (
    <WorkspaceShell certs={enrolledCerts} displayName={profile.displayName}>
      {children}
    </WorkspaceShell>
  );
}
