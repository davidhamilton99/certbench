import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";
const ALLOWED_COUNTS = [5, 10, 15];

interface GeneratedQuestion {
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

  const { setId, questionCount, additionalContent } = (await req.json()) as {
    setId: string;
    questionCount: number;
    additionalContent?: string;
  };

  if (!setId) {
    return NextResponse.json(
      { error: "setId is required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_COUNTS.includes(questionCount)) {
    return NextResponse.json(
      { error: "questionCount must be 5, 10, or 15" },
      { status: 400 }
    );
  }

  // Verify ownership
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id, user_id, source_material_preview, question_count")
    .eq("id", setId)
    .single();

  if (!studySet || studySet.user_id !== user.id) {
    return NextResponse.json(
      { error: "Study set not found" },
      { status: 404 }
    );
  }

  // Fetch existing question texts to avoid duplicates
  const { data: existingQuestions } = await supabase
    .from("user_study_questions")
    .select("question_text, sort_order")
    .eq("study_set_id", setId)
    .order("sort_order", { ascending: false });

  const existingTexts = (existingQuestions || []).map(
    (q) => q.question_text
  );
  const maxSortOrder =
    existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].sort_order
      : -1;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI generation is not configured." },
      { status: 503 }
    );
  }

  // Build source content from stored preview + optional additional content
  let sourceContent = studySet.source_material_preview || "";
  if (additionalContent) {
    sourceContent = sourceContent
      ? `${sourceContent}\n\n--- Additional Content ---\n\n${additionalContent}`
      : additionalContent;
  }
  const truncatedContent = sourceContent.slice(0, 15000);

  if (!truncatedContent.trim()) {
    return NextResponse.json(
      {
        error:
          "No source material available. Please provide additional content.",
      },
      { status: 400 }
    );
  }

  // Build existing questions list for de-duplication
  const existingList = existingTexts
    .slice(0, 50) // Cap to prevent prompt overflow
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  const systemPrompt = `You are an expert study question generator. Generate exactly ${questionCount} NEW multiple-choice questions from the provided study material.

CRITICAL: You must NOT duplicate or closely paraphrase any of the existing questions listed below. Cover different aspects of the material.

Each question must have exactly 4 options (A, B, C, D), with exactly one correct answer.

Quality requirements:
- Question stems must be clear, specific, and unambiguous
- Avoid "all of the above" or "none of the above" options
- Wrong options (distractors) must be plausible and relate to the topic
- Explanations must be 3-4 sentences explaining why the correct answer is right
- Vary the position of the correct answer across questions

Existing questions (DO NOT duplicate these):
${existingList}

Return a JSON object with this exact structure:
{
  "questions": [
    {
      "question_text": "The question",
      "options": [
        {"text": "Option A text", "is_correct": false},
        {"text": "Option B text", "is_correct": true},
        {"text": "Option C text", "is_correct": false},
        {"text": "Option D text", "is_correct": false}
      ],
      "correct_index": 1,
      "explanation": "3-4 sentence explanation"
    }
  ]
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
              content: `Generate ${questionCount} new questions from this material:\n\n${truncatedContent}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 8192,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("OpenAI generate-more error:", errorData);
      return NextResponse.json(
        { error: "AI service temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return NextResponse.json(
        { error: "No response from AI." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(messageContent) as {
      questions: GeneratedQuestion[];
    };

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "Invalid response format from AI." },
        { status: 502 }
      );
    }

    // Validate questions
    const validQuestions = parsed.questions
      .filter(
        (q) =>
          q.question_text &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.correct_index === "number" &&
          q.correct_index >= 0 &&
          q.correct_index <= 3
      )
      .slice(0, questionCount);

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "AI failed to generate valid questions." },
        { status: 502 }
      );
    }

    // Insert new questions
    const questionRows = validQuestions.map((q, i) => ({
      study_set_id: setId,
      user_id: user.id,
      question_text: q.question_text,
      options: q.options,
      correct_index: q.correct_index,
      explanation: q.explanation || null,
      sort_order: maxSortOrder + 1 + i,
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from("user_study_questions")
      .insert(questionRows)
      .select(
        "id, question_text, options, correct_index, explanation, sort_order"
      );

    if (insertError) {
      console.error("Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save new questions." },
        { status: 500 }
      );
    }

    // Update question count on the study set
    const newTotal = (studySet.question_count || 0) + validQuestions.length;
    await supabase
      .from("user_study_sets")
      .update({ question_count: newTotal })
      .eq("id", setId);

    return NextResponse.json({
      questions: insertedQuestions,
      newTotal,
    });
  } catch (error) {
    console.error("Generate more error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions. Please try again." },
      { status: 500 }
    );
  }
}
