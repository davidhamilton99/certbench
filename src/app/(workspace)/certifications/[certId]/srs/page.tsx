import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SrsReview } from "@/components/workspace/SrsReview";

export const metadata = {
  title: "SRS Review — CertBench",
};

export default async function SrsPage({
  params,
}: {
  params: Promise<{ certId: string }>;
}) {
  const { certId: certSlug } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: certification } = await supabase
    .from("certifications")
    .select("id, name, slug")
    .eq("slug", certSlug)
    .single();

  if (!certification) redirect("/dashboard");

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("user_enrollments")
    .select("id")
    .eq("user_id", user.id)
    .eq("certification_id", certification.id)
    .eq("is_active", true)
    .single();

  if (!enrollment) redirect("/dashboard");

  return (
    <SrsReview
      certificationId={certification.id}
      certName={certification.name}
      certSlug={certification.slug}
    />
  );
}
