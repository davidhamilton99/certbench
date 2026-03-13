import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { SharedQuizView } from "@/components/workspace/SharedQuizView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();

  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("title, category, question_count")
    .eq("id", setId)
    .eq("is_public", true)
    .single();

  if (!studySet) {
    return { title: "Quiz Not Found — CertBench" };
  }

  return {
    title: `${studySet.title} — CertBench`,
    description: `Practice ${studySet.question_count} questions${studySet.category ? ` on ${studySet.category}` : ""}. Shared via CertBench.`,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ setId: string }>;
}) {
  const { setId } = await params;
  const supabase = await createClient();

  // Fetch the study set — only if public
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select(
      "id, user_id, title, category, question_count, is_public, created_at"
    )
    .eq("id", setId)
    .eq("is_public", true)
    .single();

  if (!studySet) notFound();

  // Fetch questions
  const { data: questions } = await supabase
    .from("user_study_questions")
    .select(
      "id, question_type, question_text, options, correct_index, explanation, sort_order"
    )
    .eq("study_set_id", setId)
    .order("sort_order");

  // Fetch creator name
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", studySet.user_id)
    .single();

  return (
    <SharedQuizView
      studySet={studySet}
      questions={questions || []}
      creatorName={profile?.display_name || "Anonymous"}
    />
  );
}
