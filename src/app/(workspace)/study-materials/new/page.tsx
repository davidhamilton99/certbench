import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudyMaterialForm } from "@/components/workspace/StudyMaterialForm";

export const metadata = {
  title: "New Study Material — CertBench",
};

export default async function NewStudyMaterialPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get user's active certification slug for tagging
  const { data: enrollment } = await supabase
    .from("user_enrollments")
    .select("certification_id, certifications(slug)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const cert = enrollment?.certifications as unknown as {
    slug: string;
  } | null;
  const certSlug = cert?.slug;

  return <StudyMaterialForm certSlug={certSlug || undefined} />;
}
