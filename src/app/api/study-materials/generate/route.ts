import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";
const MAX_QUESTION_COUNT = 50;
const ALLOWED_COUNTS = [10, 25, 50];
const ALLOWED_DIFFICULTIES = ["mixed", "easy", "medium", "hard"] as const;
type Difficulty = (typeof ALLOWED_DIFFICULTIES)[number];

interface GeneratedQuestion {
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  correct_index: number;
  explanation: string;
}

const difficultyInstructions: Record<Difficulty, string> = {
  easy: `Difficulty level: EASY
- Focus on recall and definition questions ("What is X?", "Which of the following describes Y?")
- Test basic terminology and core concepts from the material
- Distractors (wrong options) should be clearly different from the correct answer
- Cognitive level: Remember / Understand`,

  medium: `Difficulty level: MEDIUM
- Focus on understanding and comparison ("Why does X work this way?", "What is the difference between X and Y?")
- Test relationships between concepts and cause-effect understanding
- Distractors should be plausible but distinguishable with solid understanding
- Cognitive level: Understand / Apply`,

  hard: `Difficulty level: HARD
- Focus on application and scenario-based questions ("Given situation Y, what would you do?", "A company needs to solve X — which approach is best?")
- Test ability to apply knowledge to novel situations and make judgements
- Distractors should be very plausible — the kind of answers someone with partial knowledge might choose
- Cognitive level: Apply / Analyse`,

  mixed: `Difficulty level: MIXED
- Mix difficulty levels across the set: roughly 30% recall/definition, 40% understanding/comparison, 30% application/scenario
- Vary question types throughout to create a balanced assessment
- Cognitive levels: Remember through Analyse`,
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content, questionCount, title, difficulty = "mixed" } =
    (await req.json()) as {
      content: string;
      questionCount: number;
      title: string;
      difficulty?: Difficulty;
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

  const validDifficulty: Difficulty = ALLOWED_DIFFICULTIES.includes(
    difficulty as Difficulty
  )
    ? (difficulty as Difficulty)
    : "mixed";

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

  const systemPrompt = `You are an expert study question generator specialising in creating high-quality multiple-choice assessment items. Given study material, generate exactly ${questionCount} questions.

Each question must have exactly 4 options (A, B, C, D), with exactly one correct answer.

${difficultyInstructions[validDifficulty]}

Quality requirements:
- Question stems must be clear, specific, and unambiguous
- Avoid "all of the above" or "none of the above" options
- Wrong options (distractors) must be plausible and relate to the topic — not obviously absurd
- Explanations must be 3-4 sentences: explain WHY the correct answer is right, then briefly address why the most tempting wrong choice is incorrect
- Do not repeat questions or test the same concept twice
- Avoid negatively phrased questions ("Which is NOT...")
- Vary the position of the correct answer across questions (don't always put it in the same slot)

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
}

Rules:
- correct_index is 0-based and must match the position of the option where is_correct is true
- Each question must have exactly one option with is_correct: true
- Do not include any text outside the JSON object`;

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
        max_tokens: 8192,
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
