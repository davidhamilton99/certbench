import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listActiveCertifications } from "@/server/data/certifications";
import { listEnrollments } from "@/server/data/enrollments";
import { getProfile } from "@/server/data/profiles";
import { getUserPlan } from "@/server/services/subscription";
import { OnboardingFlow } from "@/components/auth/OnboardingFlow";
import { AnalyticsIdentify } from "@/components/analytics/AnalyticsIdentify";

export const metadata = {
  title: "Get started",
};

export default async function OnboardingPage({
  searchParams,
}: {
  /** `cert`: a certification slug to open the flow on (e.g. from the readiness check). */
  searchParams: Promise<{ cert?: string | string[] }>;
}) {
  const { cert } = await searchParams;
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [profile, certifications] = await Promise.all([
    getProfile(db, user.id),
    listActiveCertifications(db),
  ]);

  // Goal already set but not paid: they backed out of Stripe Checkout (its
  // back link returns here, and so does the browser's). Reopen the offer
  // instead of dropping them into the app.
  let resume: { certId: string | null; why: string | null; examDate: string | null } | undefined;
  if (profile?.onboardingCompleted) {
    const [plan, enrollments] = await Promise.all([
      getUserPlan(db, user.id),
      listEnrollments(db, user.id),
    ]);
    if (plan.plan === "pro" || profile.role === "admin") redirect("/dashboard");
    const why = user.user_metadata?.cert_reason;
    resume = {
      certId: enrollments[0]?.certificationId ?? null,
      why: typeof why === "string" ? why : null,
      examDate: enrollments[0]?.examDate ?? null,
    };
  }

  return (
    <>
      {/* Identify the person during the flow (the auth layout doesn't), so the
          onboarding funnel events join this user from signup to conversion. */}
      <AnalyticsIdentify userId={user.id} email={user.email} />
      <OnboardingFlow
        certifications={certifications.map((c) => ({
          id: c.id,
          name: c.name,
          examCode: c.examCode,
        }))}
        resume={resume}
        initialCertId={certifications.find((c) => c.slug === cert)?.id}
      />
    </>
  );
}
