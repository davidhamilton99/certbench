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

  // Get all enrolled certifications (not just active)
  const { data: enrollments } = await supabase
    .from("user_enrollments")
    .select("certification_id, certifications(slug, name)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  type CertRow = { slug: string; name: string };
  const certs: { id: string; slug: string; name: string }[] = (enrollments || [])
    .map((e) => {
      const cert = e.certifications as unknown as CertRow | null;
      if (!cert) return null;
      return { id: e.certification_id, slug: cert.slug, name: cert.name };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  // Fetch domains for all enrolled certs in one query
  const certIds = certs.map((c) => c.id);
  let domainsByCert: Record<string, string[]> = {};
  if (certIds.length > 0) {
    const { data: allDomains } = await supabase
      .from("cert_domains")
      .select("certification_id, domain_number, title")
      .in("certification_id", certIds)
      .order("sort_order");

    if (allDomains) {
      for (const d of allDomains) {
        const cert = certs.find((c) => c.id === d.certification_id);
        if (!cert) continue;
        if (!domainsByCert[cert.slug]) domainsByCert[cert.slug] = [];
        domainsByCert[cert.slug].push(`${d.domain_number} - ${d.title}`);
      }
    }
  }

  const certOptions = certs.map((c) => ({ slug: c.slug, name: c.name }));

  return (
    <StudyMaterialForm
      certOptions={certOptions}
      domainsByCert={domainsByCert}
    />
  );
}
