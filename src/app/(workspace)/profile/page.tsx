import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/workspace/ProfileEditor";

export const metadata = {
  title: "Account Settings — CertBench",
};

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get user's active enrollment for exam date
  const { data: activeEnrollment } = await supabase
    .from("user_enrollments")
    .select("certification_id, exam_date")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  return (
    <div>
      <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-1">
        Account Settings
      </h1>
      <p className="text-[14px] text-text-muted mb-8">
        Manage your profile, preferences, and account.
      </p>
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
