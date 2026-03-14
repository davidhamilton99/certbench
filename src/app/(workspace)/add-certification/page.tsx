import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddCertificationForm } from "@/components/workspace/AddCertificationForm";

export const metadata = {
  title: "Add Certification — CertBench",
};

export default async function AddCertificationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get all active certifications
  const { data: allCerts } = await supabase
    .from("certifications")
    .select("id, slug, name, exam_code, vendor")
    .eq("is_active", true)
    .order("vendor")
    .order("name");

  // Get user's existing enrollments to exclude them
  const { data: existingEnrollments } = await supabase
    .from("user_enrollments")
    .select("certification_id")
    .eq("user_id", user.id)
    .eq("is_active", true);

  const enrolledIds = new Set(
    (existingEnrollments || []).map((e) => e.certification_id)
  );

  const availableCerts = (allCerts || []).filter(
    (c) => !enrolledIds.has(c.id)
  );

  return (
    <div>
      <h1 className="text-[24px] font-semibold text-text-primary tracking-tight mb-1">
        Add Certification
      </h1>
      <p className="text-[14px] text-text-muted mb-8">
        Enroll in another certification to start studying.
      </p>
      <AddCertificationForm
        certifications={availableCerts}
        userId={user.id}
      />
    </div>
  );
}
