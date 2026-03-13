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

  return <FlashcardImportForm certSlug={cert?.slug || undefined} />;
}
