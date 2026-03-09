import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";
const MAX_QUESTION_COUNT = 50;
const ALLOWED_COUNTS = [10, 25, 50];
const ALLOWED_DIFFICULTIES = ["mixed", "easy", "medium", "hard"] as const;
type Difficulty = (typeof ALLOWED_DIFFICULTIES)[number];
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
        ).every(
          (o) => o.text && typeof o.correct_position === "number"
        )
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

  const truncatedContent = content.slice(0, 15000);

  function buildSystemPrompt(batchCount: number): string {
    return `You are an expert study question generator creating high-quality assessment items. Given study material, generate exactly ${batchCount} questions using a MIX of these question types:

TYPE DISTRIBUTION (approximate):
- multiple_choice (~40%): 4 options, exactly 1 correct
- true_false (~20%): True/False statement
- multiple_select (~20%): 4 options, 2-3 correct
- ordering (~10%): sequence 4 items in the correct order
- matching (~10%): match 4 term-definition pairs

${difficultyInstructions[validDifficulty]}

STRUCTURES PER TYPE:

[multiple_choice]
options: exactly 4, each {"text": "...", "is_correct": false/true}, exactly 1 is true
correct_index: 0-3 (0-based index of the correct option)

[true_false]
question_text: state a factual claim that is clearly true or false
options: exactly [{"text": "True", "is_correct": ...}, {"text": "False", "is_correct": ...}]
correct_index: 0 if True is correct, 1 if False is correct

[multiple_select]
question_text: MUST end with "(Select all that apply)"
options: exactly 4, each {"text": "...", "is_correct": true/false}, exactly 2-3 are true
correct_index: -1

[ordering]
question_text: "Arrange the following in the correct order:" or similar
options: exactly 4 items in SCRAMBLED order, each {"text": "...", "correct_position": N}
  where correct_position (0-3) is the 0-based position this item occupies in the correct sequence
correct_index: -1

[matching]
question_text: "Match each term with its correct definition:" or similar
options: exactly 4 pairs, each {"left": "term", "right": "definition"}
  where options[i].left correctly pairs with options[i].right
correct_index: -1

QUALITY REQUIREMENTS:
- Question stems must be clear, specific, and unambiguous
- Do not repeat questions or test the same concept twice
- Avoid negatively phrased questions ("Which is NOT...")
- Explanations: 2-3 sentences explaining why the answer(s) are correct
- For ordering: ensure the sequence has a logical, defensible correct order
- For matching: terms and definitions must be distinct and unambiguous
- Vary the position of the correct answer across multiple_choice questions

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
  }

  async function generateBatch(
    batchCount: number,
    userInstruction?: string
  ): Promise<GeneratedQuestion[]> {
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
            { role: "system", content: buildSystemPrompt(batchCount) },
            {
              role: "user",
              content: `${userInstruction ? userInstruction + "\n\n" : ""}Generate ${batchCount} questions from this study material:\n\n${truncatedContent}`,
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.7,
          max_tokens: 10000,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error?.message || `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json();
    const messageContent = data.choices?.[0]?.message?.content;
    if (!messageContent) throw new Error("No response from AI model");

    const parsed = JSON.parse(messageContent) as {
      questions: GeneratedQuestion[];
    };
    if (!parsed.questions || !Array.isArray(parsed.questions))
      throw new Error("Invalid response format from AI");

    return parsed.questions.filter(isValidQuestion);
  }

  try {
    let validQuestions: GeneratedQuestion[];

    if (questionCount === 50) {
      // Split into two parallel batches of 25 to avoid token limits
      const [batch1, batch2] = await Promise.all([
        generateBatch(25),
        generateBatch(
          25,
          "Generate a DIFFERENT set of questions covering other aspects of the material."
        ),
      ]);

      // Combine and deduplicate by question_text
      const seen = new Set<string>();
      validQuestions = [];
      for (const q of [...batch1, ...batch2]) {
        if (!seen.has(q.question_text)) {
          seen.add(q.question_text);
          validQuestions.push(q);
          if (validQuestions.length === 50) break;
        }
      }
    } else {
      validQuestions = await generateBatch(questionCount);
      validQuestions = validQuestions.slice(0, MAX_QUESTION_COUNT);
    }

    return NextResponse.json({
      questions: validQuestions,
      title,
      sourcePreview: truncatedContent.slice(0, 200),
    });
  } catch (error) {
    console.error("AI generation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate questions.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
