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
    .select("certification_id, certifications(slug, name)")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .limit(1)
    .single();

  const cert = enrollment?.certifications as unknown as {
    slug: string;
    name: string;
  } | null;
  const certSlug = cert?.slug;
  const certName = cert?.name;

  // Get domains for the user's cert so they can tag their set
  let domains: string[] = [];
  if (enrollment?.certification_id) {
    const { data: certDomains } = await supabase
      .from("cert_domains")
      .select("code, name")
      .eq("certification_id", enrollment.certification_id)
      .order("code");
    if (certDomains) {
      domains = certDomains.map((d) => `${d.code} - ${d.name}`);
    }
  }

  return (
    <StudyMaterialForm
      certSlug={certSlug || undefined}
      certName={certName || undefined}
      domains={domains}
    />
  );
}
