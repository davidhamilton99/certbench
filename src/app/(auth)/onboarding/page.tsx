import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import { listActiveCertifications } from "@/server/data/certifications";
import { getProfile } from "@/server/data/profiles";
import { OnboardingFlow } from "@/components/auth/OnboardingFlow";

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
    <OnboardingFlow
      certifications={certifications.map((c) => ({
        id: c.id,
        name: c.name,
        examCode: c.examCode,
      }))}
    />
  );
}
