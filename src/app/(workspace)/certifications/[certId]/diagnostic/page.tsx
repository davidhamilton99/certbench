import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DiagnosticExam } from "@/components/workspace/DiagnosticExam";

export const metadata = {
  title: "Diagnostic Exam — CertBench",
};

export default async function DiagnosticPage({
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

  // Get certification
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

  // Check if diagnostic already completed
  const { data: completed } = await supabase
    .from("diagnostic_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("certification_id", certification.id)
    .eq("is_complete", true)
    .limit(1);

  if (completed && completed.length > 0) {
    redirect(`/dashboard?cert=${certification.slug}`);
  }

  return (
    <DiagnosticExam
      certificationId={certification.id}
      certName={certification.name}
      certSlug={certification.slug}
    />
  );
}
