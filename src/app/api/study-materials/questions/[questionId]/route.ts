import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";

// ---------------------------------------------------------------------------
// PATCH — Edit a question or request AI improvement
// ---------------------------------------------------------------------------

export async function PATCH(
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
    .select("id, study_set_id, question_text, options, correct_index, explanation")
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

  const body = await req.json();

  // -----------------------------------------------------------------------
  // AI Improve mode — return improved version without saving
  // -----------------------------------------------------------------------
  if (body.aiImprove === true) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI is not configured." },
        { status: 503 }
      );
    }

    const currentData = JSON.stringify({
      question_text: question.question_text,
      options: question.options,
      correct_index: question.correct_index,
      explanation: question.explanation,
    });

    const systemPrompt = `You are a study question quality improver. Given an existing multiple-choice question, rewrite it to be higher quality:
- Make the question stem clearer and more precise
- Ensure distractors (wrong options) are plausible but clearly distinguishable from the correct answer
- Improve the explanation to be 3-4 sentences that explain WHY the correct answer is right
- Maintain the same topic and general difficulty level
- Keep exactly 4 options with exactly 1 correct

Return a JSON object with this exact structure:
{
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

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: `Improve this question:\n\n${currentData}`,
              },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 1024,
          }),
        }
      );

      if (!response.ok) {
        return NextResponse.json(
          { error: "AI service temporarily unavailable." },
          { status: 502 }
        );
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        return NextResponse.json(
          { error: "No response from AI." },
          { status: 502 }
        );
      }

      const improved = JSON.parse(content);

      // Validate the improved question
      if (
        !improved.question_text ||
        !Array.isArray(improved.options) ||
        improved.options.length !== 4
      ) {
        return NextResponse.json(
          { error: "AI returned invalid format." },
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
      { error: "No fields to update" },
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

export async function DELETE(
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
