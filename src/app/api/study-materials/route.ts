import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod/v4";

const questionSchema = z.object({
  question_type: z
    .enum(["multiple_choice", "true_false", "multiple_select", "ordering", "matching"])
    .optional()
    .default("multiple_choice"),
  question_text: z.string().min(1).max(5000),
  options: z.array(z.unknown()).min(2).max(10),
  correct_index: z.number().int(),
  explanation: z.string().max(5000).optional().default(""),
});

const createSetSchema = z.object({
  title: z.string().min(1).max(255),
  category: z.string().max(100).optional(),
  questions: z.array(questionSchema).min(1).max(500),
  sourcePreview: z.string().max(200000).optional(),
  isPublic: z.boolean().optional().default(false),
  certSlug: z.string().max(100).optional(),
  domainTag: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createSetSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { title, category, questions, sourcePreview, isPublic, certSlug, domainTag } =
    parsed.data;

  // Create the study set
  const { data: studySet, error: setError } = await supabase
    .from("user_study_sets")
    .insert({
      user_id: user.id,
      title,
      description: category || null,
      category: category || null,
      is_public: isPublic,
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
    question_type: q.question_type,
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
      domain_tag: domainTag || null,
    });
  }

  return NextResponse.json({ id: studySet.id });
}
