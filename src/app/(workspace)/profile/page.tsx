import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/workspace/ProfileEditor";
import { SubscriptionPanel } from "@/components/workspace/SubscriptionPanel";
import { getUserPlan } from "@/lib/subscription";

export const metadata = {
  title: "Account Settings — CertBench",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, enrollmentResult, subResult, plan] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("user_enrollments")
      .select("certification_id, exam_date")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_subscriptions")
      .select("status, current_period_end, stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    getUserPlan(supabase, user.id),
  ]);

  const profile = profileResult.data;
  const activeEnrollment = enrollmentResult.data;
  const sub = subResult.data;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-1">
          Account Settings
        </h1>
        <p className="text-[14px] text-text-secondary">
          Manage your profile, preferences, and account.
        </p>
      </div>

      <SubscriptionPanel
        plan={plan.plan}
        status={sub?.status ?? null}
        currentPeriodEnd={sub?.current_period_end ?? null}
        generationsUsed={plan.generationsUsed}
        generationsLimit={plan.generationsLimit}
        hasStripeCustomer={Boolean(sub?.stripe_customer_id)}
      />

      <ProfileEditor
        userId={user.id}
        email={user.email || ""}
        displayName={profile?.display_name || ""}
        memberSince={profile?.created_at || user.created_at}
        examDate={activeEnrollment?.exam_date || null}
        certificationId={activeEnrollment?.certification_id || null}
      />
    </div>
  );
}
