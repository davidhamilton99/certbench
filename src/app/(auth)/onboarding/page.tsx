import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listActiveCertifications } from "@/server/data/certifications";
import { getProfile } from "@/server/data/profiles";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const metadata = {
  title: "Get started",
};

export default async function OnboardingPage() {
  const db = await createClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect("/login");

  const [profile, certifications] = await Promise.all([
    getProfile(db, user.id),
    listActiveCertifications(db),
  ]);
  if (profile?.onboardingCompleted) redirect("/dashboard");

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-white/10 bg-card p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-5 text-center">
        <h1 className="font-display text-lg font-semibold tracking-tight">
          Which exam are you studying for?
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can add more certifications later.
        </p>
      </div>
      <OnboardingForm
        certifications={certifications.map((c) => ({
          id: c.id,
          name: c.name,
          examCode: c.examCode,
        }))}
      />
    </div>
  );
}
