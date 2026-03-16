import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { SessionGuard } from "@/components/auth/SessionGuard";

export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  // Fetch active enrollments with certification details
  const { data: enrollments } = await supabase
    .from("user_enrollments")
    .select(
      `
      certification_id,
      certifications (
        slug,
        name,
        exam_code
      )
    `
    )
    .eq("user_id", user.id)
    .eq("is_active", true);

  return (
    <>
      <SessionGuard />
      <WorkspaceShell
        displayName={profile.display_name}
        enrollments={(enrollments as any) || []}
      >
        {children}
      </WorkspaceShell>
    </>
  );
}
