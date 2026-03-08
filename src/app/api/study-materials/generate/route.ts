import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";
const MAX_QUESTION_COUNT = 50;
const ALLOWED_COUNTS = [10, 25, 50];

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

  const { content, questionCount, title } = (await req.json()) as {
    content: string;
    questionCount: number;
    title: string;
  };

  if (!content || !title) {
    return NextResponse.json(
      { error: "Content and title are required" },
      { status: 400 }
    );
  }

  if (!ALLOWED_COUNTS.includes(questionCount)) {
    return NextResponse.json(
      { error: "Question count must be 10, 25, or 50" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI generation is not configured. Add OPENAI_API_KEY to your environment variables.",
      },
      { status: 503 }
    );
  }

  // Truncate content to reasonable size for the model
  const truncatedContent = content.slice(0, 15000);

  const systemPrompt = `You are a study question generator. Given study material, generate exactly ${questionCount} multiple-choice questions that test understanding of the material.

Each question must have exactly 4 options (A, B, C, D), with exactly one correct answer.

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
      "explanation": "Why the correct answer is correct"
    }
  ]
}

Rules:
- correct_index is 0-based and must match the position of the correct option
- Questions should test comprehension, not just memorisation
- Explanations should be concise (1-2 sentences)
- Vary difficulty levels
- Do not repeat questions`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `Generate ${questionCount} multiple-choice questions from this study material:\n\n${truncatedContent}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage =
        errorData?.error?.message || `OpenAI API error: ${response.status}`;
      return NextResponse.json({ error: errorMessage }, { status: 502 });
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;

    if (!messageContent) {
      return NextResponse.json(
        { error: "No response from AI model" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(messageContent) as {
      questions: GeneratedQuestion[];
    };

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "Invalid response format from AI" },
        { status: 502 }
      );
    }

    // Validate and clean each question
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
      .slice(0, MAX_QUESTION_COUNT);

    return NextResponse.json({
      questions: validQuestions,
      title,
      sourcePreview: truncatedContent.slice(0, 200),
    });
  } catch (error) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate questions. Please try again." },
      { status: 500 }
    );
  }
}
