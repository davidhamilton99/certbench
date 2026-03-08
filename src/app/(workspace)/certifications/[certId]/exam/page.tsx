import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PracticeExam } from "@/components/workspace/PracticeExam";

export const metadata = {
  title: "Practice Exam — CertBench",
};

export default async function ExamPage({
  params,
  searchParams,
}: {
  params: Promise<{ certId: string }>;
  searchParams: Promise<{ type?: string; domain?: string }>;
}) {
  const { certId: certSlug } = await params;
  const { type: examType = "full", domain: domainNumber } =
    await searchParams;
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

  // Must complete diagnostic first
  const { data: diagnostic } = await supabase
    .from("diagnostic_attempts")
    .select("id")
    .eq("user_id", user.id)
    .eq("certification_id", certification.id)
    .eq("is_complete", true)
    .limit(1);

  if (!diagnostic || diagnostic.length === 0) {
    redirect(`/certifications/${certification.slug}/diagnostic`);
  }

  // For domain drill, resolve domainId from domainNumber
  let domainId: string | undefined;
  let domainTitle: string | undefined;

  if (examType === "domain_drill" && domainNumber) {
    const { data: domain } = await supabase
      .from("cert_domains")
      .select("id, title")
      .eq("certification_id", certification.id)
      .eq("domain_number", domainNumber)
      .single();

    if (!domain) redirect(`/dashboard?cert=${certification.slug}`);
    domainId = domain.id;
    domainTitle = domain.title;
  }

  return (
    <PracticeExam
      certificationId={certification.id}
      certName={certification.name}
      certSlug={certification.slug}
      examType={examType as "full" | "domain_drill" | "weak_points"}
      domainId={domainId}
      domainTitle={domainTitle}
    />
  );
}
