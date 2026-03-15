import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FlashcardImportForm } from "@/components/workspace/FlashcardImportForm";

export const metadata = {
  title: "Import Flashcards — CertBench",
};

export default async function ImportFlashcardsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Get all enrolled certifications
  const { data: enrollments } = await supabase
    .from("user_enrollments")
    .select("certification_id, certifications(slug, name)")
    .eq("user_id", user.id)
    .eq("is_active", true);

  type CertRow = { slug: string; name: string };
  const certOptions: { slug: string; name: string }[] = (enrollments || [])
    .map((e) => {
      const cert = e.certifications as unknown as CertRow | null;
      if (!cert) return null;
      return { slug: cert.slug, name: cert.name };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  return <FlashcardImportForm certOptions={certOptions} />;
}
