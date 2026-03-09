import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StudySetDetail } from "@/components/workspace/StudySetDetail";

export const metadata = {
  title: "Community Study Set — CertBench",
};

export default async function CommunitySetPage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch the study set (must be public)
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id, user_id, title, category, question_count, is_public, created_at, source_material_preview")
    .eq("id", setId)
    .eq("is_public", true)
    .single();

  if (!studySet) redirect("/community");

  // Fetch questions
  const { data: questions } = await supabase
    .from("user_study_questions")
    .select(
      "id, question_text, options, correct_index, explanation, sort_order"
    )
    .eq("study_set_id", setId)
    .order("sort_order");

  const isOwner = studySet.user_id === user.id;

  return (
    <StudySetDetail
      studySet={studySet}
      questions={questions || []}
      isOwner={isOwner}
    />
  );
}
