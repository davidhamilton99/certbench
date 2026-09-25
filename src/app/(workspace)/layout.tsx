import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { getProfile } from "@/server/data/profiles";
import { listEnrollments } from "@/server/data/enrollments";
import { listActiveCertifications } from "@/server/data/certifications";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { WelcomeV2Modal } from "@/components/workspace/WelcomeV2Modal";
import { AnalyticsIdentify } from "@/components/analytics/AnalyticsIdentify";
import { CERTBENCH_V2_LAUNCH } from "@/lib/launch";

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

  // Returning users (account predates 2.0) get the one-time welcome popup.
  const isReturning =
    !!user.created_at &&
    new Date(user.created_at) < new Date(CERTBENCH_V2_LAUNCH);

  return (
    <WorkspaceShell certs={enrolledCerts} displayName={profile.displayName}>
      {children}
      <WelcomeV2Modal enabled={isReturning} />
      <AnalyticsIdentify userId={user.id} email={user.email} />
    </WorkspaceShell>
  );
}
