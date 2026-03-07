import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/OnboardingForm";

export const metadata = {
  title: "Get Started — CertBench",
};

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if already onboarded
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.id)
    .single();

  if (profile?.onboarding_completed) {
    redirect("/dashboard");
  }

  // Fetch available certifications
  const { data: certifications } = await supabase
    .from("certifications")
    .select("id, slug, name, exam_code, vendor")
    .eq("is_active", true)
    .order("name");

  return (
    <>
      <h2 className="text-[18px] font-semibold text-text-primary text-center mb-2">
        Welcome to CertBench
      </h2>
      <p className="text-[15px] text-text-secondary text-center mb-6">
        Let&apos;s set up your study workspace.
      </p>
      <OnboardingForm
        certifications={certifications || []}
        userId={user.id}
      />
    </>
  );
}
