import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";
const ALLOWED_COUNTS = [5, 10, 15];
type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "multiple_select"
  | "ordering"
  | "matching";

interface GeneratedQuestion {
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation: string;
}

function isValidQuestion(q: GeneratedQuestion): boolean {
  if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2)
    return false;
  const type = q.question_type || "multiple_choice";
  switch (type) {
    case "multiple_choice":
      return (
        q.options.length === 4 &&
        (q.options as Array<{ is_correct?: boolean }>).filter(
          (o) => o.is_correct
        ).length === 1 &&
        q.correct_index >= 0 &&
        q.correct_index <= 3
      );
    case "true_false":
      return (
        q.options.length === 2 &&
        (q.options as Array<{ is_correct?: boolean }>).filter(
          (o) => o.is_correct
        ).length === 1 &&
        (q.correct_index === 0 || q.correct_index === 1)
      );
    case "multiple_select":
      return (
        q.options.length >= 2 &&
        (q.options as Array<{ is_correct?: boolean }>).filter(
          (o) => o.is_correct
        ).length >= 2
      );
    case "ordering":
      return (
        q.options.length >= 2 &&
        (
          q.options as Array<{
            text?: unknown;
            correct_position?: unknown;
          }>
        ).every((o) => o.text && typeof o.correct_position === "number")
      );
    case "matching":
      return (
        q.options.length >= 2 &&
        (q.options as Array<{ left?: unknown; right?: unknown }>).every(
          (o) => o.left && o.right
        )
      );
    default:
      return false;
  }
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
    return NextResponse.json({ error: "setId is required" }, { status: 400 });
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

  const existingTexts = (existingQuestions || []).map((q) => q.question_text);
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

  const existingList = existingTexts
    .slice(0, 50)
    .map((q, i) => `${i + 1}. ${q}`)
    .join("\n");

  const systemPrompt = `You are an expert study question generator. Generate exactly ${questionCount} NEW questions from the provided study material using a MIX of question types.

CRITICAL: Do NOT duplicate or closely paraphrase any of the existing questions listed below.

TYPE DISTRIBUTION (approximate):
- multiple_choice (~40%): 4 options, exactly 1 correct
- true_false (~20%): True/False statement
- multiple_select (~20%): 4 options, 2-3 correct
- ordering (~10%): sequence 4 items in correct order
- matching (~10%): match 4 term-definition pairs

STRUCTURES PER TYPE:

[multiple_choice]
options: exactly 4, each {"text": "...", "is_correct": false/true}, exactly 1 is true
correct_index: 0-3

[true_false]
options: exactly [{"text": "True", "is_correct": ...}, {"text": "False", "is_correct": ...}]
correct_index: 0 if True is correct, 1 if False is correct

[multiple_select]
question_text: MUST end with "(Select all that apply)"
options: exactly 4, 2-3 have is_correct: true
correct_index: -1

[ordering]
options: exactly 4 items in SCRAMBLED order, each {"text": "...", "correct_position": N}
correct_index: -1

[matching]
options: exactly 4 pairs [{"left": "term", "right": "definition"}]
correct_index: -1

Existing questions (DO NOT duplicate):
${existingList}

Return ONLY a JSON object:
{
  "questions": [
    {
      "question_type": "multiple_choice",
      "question_text": "The question",
      "options": [...],
      "correct_index": 1,
      "explanation": "2-3 sentence explanation"
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
          max_tokens: 6000,
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

    const validQuestions = parsed.questions
      .filter(isValidQuestion)
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
      question_type: q.question_type || "multiple_choice",
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
        "id, question_type, question_text, options, correct_index, explanation, sort_order"
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
