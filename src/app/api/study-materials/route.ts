import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface QuestionPayload {
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  correct_index: number;
  explanation: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, category, questions, sourcePreview, isPublic, certSlug } =
    (await req.json()) as {
      title: string;
      category?: string;
      questions: QuestionPayload[];
      sourcePreview?: string;
      isPublic?: boolean;
      certSlug?: string;
    };

  if (!title || !questions?.length) {
    return NextResponse.json(
      { error: "Title and questions are required" },
      { status: 400 }
    );
  }

  // Create the study set
  const { data: studySet, error: setError } = await supabase
    .from("user_study_sets")
    .insert({
      user_id: user.id,
      title,
      description: category || null,
      category: category || null,
      is_public: isPublic || false,
      source_material_preview: sourcePreview || null,
      question_count: questions.length,
    })
    .select("id")
    .single();

  if (setError || !studySet) {
    return NextResponse.json(
      { error: "Failed to create study set" },
      { status: 500 }
    );
  }

  // Insert questions
  const questionRows = questions.map((q, i) => ({
    study_set_id: studySet.id,
    user_id: user.id,
    question_text: q.question_text,
    options: q.options,
    correct_index: q.correct_index,
    explanation: q.explanation || null,
    sort_order: i,
  }));

  const { error: questionsError } = await supabase
    .from("user_study_questions")
    .insert(questionRows);

  if (questionsError) {
    // Clean up the set if questions fail
    await supabase.from("user_study_sets").delete().eq("id", studySet.id);
    return NextResponse.json(
      { error: "Failed to save questions" },
      { status: 500 }
    );
  }

  // Tag with certification if provided
  if (certSlug) {
    await supabase.from("study_set_cert_tags").insert({
      study_set_id: studySet.id,
      certification_slug: certSlug,
    });
  }

  return NextResponse.json({ id: studySet.id });
}
