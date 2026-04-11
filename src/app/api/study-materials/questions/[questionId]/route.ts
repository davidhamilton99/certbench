import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withErrorHandler } from "@/lib/api/errors";
import { z } from "zod/v4";
import {
  type QuestionType,
  isValidQuestion,
  type GeneratedQuestion,
  callClaude,
  getAnthropicApiKey,
} from "@/lib/ai/config";

const patchQuestionSchema = z.object({
  aiImprove: z.literal(true).optional(),
  questionText: z.string().min(1).max(5000).optional(),
  options: z.array(z.unknown()).min(2).max(10).optional(),
  correctIndex: z.number().int().optional(),
  explanation: z.string().max(5000).nullish(),
});

// ---------------------------------------------------------------------------
// Type-specific improve prompts
// ---------------------------------------------------------------------------

function buildImprovePrompt(questionType: QuestionType): string {
  const shared = `You are a study question quality improver. Given an existing question, rewrite it to be higher quality.

General rules:
- Make the question stem clearer and more precise
- Improve the explanation: sentence 1 states the correct answer and why; sentence 2 explains why the most plausible wrong answer is wrong; sentence 3 (optional) provides a memory aid
- Maintain the same topic and general difficulty level
- Do NOT change the factual content or introduce new information not implied by the original question
- Never write generic explanations like "This is correct because it is the right answer"`;

  switch (questionType) {
    case "multiple_choice":
      return `${shared}

Type-specific rules for MULTIPLE CHOICE:
- Keep exactly 4 options with exactly 1 correct
- Ensure distractors (wrong options) are plausible but clearly distinguishable from the correct answer
- All options should be the same grammatical form and roughly the same length
- Do NOT use "All of the above" or "None of the above"
- Wrong options should target common misconceptions

Return ONLY a JSON object with this exact structure:
{
  "question_type": "multiple_choice",
  "question_text": "Improved question",
  "options": [
    {"text": "Option A", "is_correct": false},
    {"text": "Option B", "is_correct": true},
    {"text": "Option C", "is_correct": false},
    {"text": "Option D", "is_correct": false}
  ],
  "correct_index": 1,
  "explanation": "Improved explanation"
}`;

    case "true_false":
      return `${shared}

Type-specific rules for TRUE/FALSE:
- Rewrite the statement to be more precise and unambiguous
- The claim must be definitively true or false — not arguable
- Avoid qualifiers like "sometimes", "usually", "often" that introduce ambiguity
- Keep exactly 2 options: True and False

Return ONLY a JSON object with this exact structure:
{
  "question_type": "true_false",
  "question_text": "A clear factual claim",
  "options": [
    {"text": "True", "is_correct": true},
    {"text": "False", "is_correct": false}
  ],
  "correct_index": 0,
  "explanation": "Improved explanation"
}`;

    case "multiple_select":
      return `${shared}

Type-specific rules for MULTIPLE SELECT:
- Keep exactly 4 options with 2-3 correct
- Each correct option must be independently verifiable — not dependent on other correct options
- Make distractors plausible partial-knowledge traps
- Question text MUST end with "(Select all that apply)"

Return ONLY a JSON object with this exact structure:
{
  "question_type": "multiple_select",
  "question_text": "Improved question (Select all that apply)",
  "options": [
    {"text": "Option A", "is_correct": true},
    {"text": "Option B", "is_correct": false},
    {"text": "Option C", "is_correct": true},
    {"text": "Option D", "is_correct": false}
  ],
  "correct_index": -1,
  "explanation": "Improved explanation"
}`;

    case "ordering":
      return `${shared}

Type-specific rules for ORDERING:
- Ensure the sequence is logical and unambiguous — there should be only one defensible correct order
- Improve item descriptions for clarity
- Keep exactly 4 items in SCRAMBLED order with correct_position indicating the right order

Return ONLY a JSON object with this exact structure:
{
  "question_type": "ordering",
  "question_text": "Arrange the following in the correct order:",
  "options": [
    {"text": "Item (scrambled)", "correct_position": 2},
    {"text": "Item (scrambled)", "correct_position": 0},
    {"text": "Item (scrambled)", "correct_position": 3},
    {"text": "Item (scrambled)", "correct_position": 1}
  ],
  "correct_index": -1,
  "explanation": "Improved explanation"
}`;

    case "matching":
      return `${shared}

Type-specific rules for MATCHING:
- Ensure each pair is unambiguously correct — no two definitions could reasonably match the same term
- Make terms and definitions precise and distinct
- Keep exactly 4 pairs

Return ONLY a JSON object with this exact structure:
{
  "question_type": "matching",
  "question_text": "Match each term with its correct definition:",
  "options": [
    {"left": "Term 1", "right": "Definition 1"},
    {"left": "Term 2", "right": "Definition 2"},
    {"left": "Term 3", "right": "Definition 3"},
    {"left": "Term 4", "right": "Definition 4"}
  ],
  "correct_index": -1,
  "explanation": "Improved explanation"
}`;

    default:
      return `${shared}

Return ONLY a JSON object preserving the original question structure with improvements.`;
  }
}

// ---------------------------------------------------------------------------
// PATCH — Edit a question or request AI improvement
// ---------------------------------------------------------------------------

async function patchHandler(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the question and verify ownership through the study set
  const { data: question } = await supabase
    .from("user_study_questions")
    .select(
      "id, study_set_id, question_type, question_text, options, correct_index, explanation"
    )
    .eq("id", questionId)
    .single();

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  // Verify ownership via study set
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id, user_id")
    .eq("id", question.study_set_id)
    .single();

  if (!studySet || studySet.user_id !== user.id) {
    return NextResponse.json(
      { error: "Not authorised" },
      { status: 403 }
    );
  }

  const rawBody = await req.json();
  const parsed = patchQuestionSchema.safeParse(rawBody);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const body = parsed.data;

  // -----------------------------------------------------------------------
  // AI Improve mode — return improved version without saving
  // -----------------------------------------------------------------------
  if (body.aiImprove === true) {
    if (!getAnthropicApiKey()) {
      return NextResponse.json(
        { error: "AI is not configured." },
        { status: 503 }
      );
    }

    const questionType = (question.question_type as QuestionType) || "multiple_choice";
    const currentData = JSON.stringify({
      question_type: questionType,
      question_text: question.question_text,
      options: question.options,
      correct_index: question.correct_index,
      explanation: question.explanation,
    });

    const systemPrompt = buildImprovePrompt(questionType);

    try {
      const content = await callClaude({
        system: systemPrompt,
        userMessage: `Improve this ${questionType} question:\n\n${currentData}`,
        maxTokens: 1024,
        temperature: 0.3,
      });

      if (!content) {
        return NextResponse.json(
          { error: "No response from AI." },
          { status: 502 }
        );
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: "AI returned invalid format." },
          { status: 502 }
        );
      }

      const improved = JSON.parse(jsonMatch[0]) as GeneratedQuestion;

      // Validate using type-aware validation
      if (!improved.question_text || !Array.isArray(improved.options)) {
        return NextResponse.json(
          { error: "AI returned invalid format." },
          { status: 502 }
        );
      }

      // Ensure question_type is preserved
      improved.question_type = questionType;

      if (!isValidQuestion(improved)) {
        return NextResponse.json(
          { error: "AI returned structurally invalid question." },
          { status: 502 }
        );
      }

      // Return improved data for client to preview (NOT auto-saved)
      return NextResponse.json(improved);
    } catch (error) {
      console.error("AI improve error:", error);
      return NextResponse.json(
        { error: "AI improvement failed." },
        { status: 500 }
      );
    }
  }

  // -----------------------------------------------------------------------
  // Regular edit mode — update the question
  // -----------------------------------------------------------------------
  const updateData: Record<string, unknown> = {};

  if (body.questionText !== undefined) {
    updateData.question_text = body.questionText;
  }
  if (body.options !== undefined) {
    updateData.options = body.options;
  }
  if (body.correctIndex !== undefined) {
    updateData.correct_index = body.correctIndex;
  }
  if (body.explanation !== undefined) {
    updateData.explanation = body.explanation;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No fields to update. Provide questionText, options, correctIndex, or explanation." },
      { status: 400 }
    );
  }

  const { error: updateError } = await supabase
    .from("user_study_questions")
    .update(updateData)
    .eq("id", questionId);

  if (updateError) {
    console.error("Update error:", updateError);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}

// ---------------------------------------------------------------------------
// DELETE — Remove a single question
// ---------------------------------------------------------------------------

async function deleteHandler(
  req: NextRequest,
  { params }: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch question to find study_set_id
  const { data: question } = await supabase
    .from("user_study_questions")
    .select("id, study_set_id")
    .eq("id", questionId)
    .single();

  if (!question) {
    return NextResponse.json(
      { error: "Question not found" },
      { status: 404 }
    );
  }

  // Verify ownership
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id, user_id, question_count")
    .eq("id", question.study_set_id)
    .single();

  if (!studySet || studySet.user_id !== user.id) {
    return NextResponse.json(
      { error: "Not authorised" },
      { status: 403 }
    );
  }

  // Delete the question
  const { error: deleteError } = await supabase
    .from("user_study_questions")
    .delete()
    .eq("id", questionId);

  if (deleteError) {
    console.error("Delete error:", deleteError);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }

  // Decrement question count
  const newCount = Math.max(0, (studySet.question_count || 1) - 1);
  await supabase
    .from("user_study_sets")
    .update({ question_count: newCount })
    .eq("id", question.study_set_id);

  return NextResponse.json({ success: true });
}

export const PATCH = withErrorHandler(patchHandler as Parameters<typeof withErrorHandler>[0]);
export const DELETE = withErrorHandler(deleteHandler as Parameters<typeof withErrorHandler>[0]);
