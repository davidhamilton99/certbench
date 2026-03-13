import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callClaude, ANTHROPIC_MODEL_HAIKU } from "@/lib/ai/config";

interface FlashcardInput {
  question: string;
  answer: string;
}

interface MCQuestion {
  question_type: "multiple_choice";
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  correct_index: number;
  explanation: string;
}

const BATCH_SIZE = 20;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { flashcards } = (await req.json()) as {
    flashcards: FlashcardInput[];
  };

  if (!flashcards?.length || flashcards.length > 200) {
    return NextResponse.json(
      { error: "Provide between 1 and 200 flashcards" },
      { status: 400 }
    );
  }

  // Process in batches to keep prompt sizes reasonable
  const allQuestions: MCQuestion[] = [];

  for (let i = 0; i < flashcards.length; i += BATCH_SIZE) {
    const batch = flashcards.slice(i, i + BATCH_SIZE);
    const questions = await generateDistractors(batch);
    allQuestions.push(...questions);
  }

  return NextResponse.json({ questions: allQuestions });
}

async function generateDistractors(
  flashcards: FlashcardInput[]
): Promise<MCQuestion[]> {
  const cardList = flashcards
    .map((f, i) => `${i}. Q: ${f.question}\n   A: ${f.answer}`)
    .join("\n");

  const system = `You generate plausible wrong answer options (distractors) for multiple-choice quiz questions. For each question-answer pair, create exactly 3 wrong but plausible-sounding options. The wrong options should be related to the topic but clearly incorrect to someone who knows the material.

Return ONLY a JSON array, no other text. Each element:
{"index": 0, "distractors": ["wrong1", "wrong2", "wrong3"], "explanation": "Brief explanation of why the correct answer is right."}`;

  const userMessage = `Generate 3 distractors for each of these ${flashcards.length} question-answer pairs:\n\n${cardList}`;

  const response = await callClaude({
    system,
    userMessage,
    model: ANTHROPIC_MODEL_HAIKU,
    maxTokens: 4096,
    temperature: 0.4,
  });

  // Parse the JSON response
  const jsonMatch = response.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response");
  }

  const results = JSON.parse(jsonMatch[0]) as {
    index: number;
    distractors: string[];
    explanation: string;
  }[];

  // Build MC questions
  return flashcards.map((card, i) => {
    const result = results.find((r) => r.index === i);
    const distractors = result?.distractors ?? [
      "Option A",
      "Option B",
      "Option C",
    ];
    const explanation = result?.explanation ?? "";

    // Place correct answer at a random position
    const correctPosition = Math.floor(Math.random() * 4);
    const options: { text: string; is_correct: boolean }[] = [];

    let dIdx = 0;
    for (let pos = 0; pos < 4; pos++) {
      if (pos === correctPosition) {
        options.push({ text: card.answer, is_correct: true });
      } else {
        options.push({
          text: distractors[dIdx] ?? `Distractor ${dIdx + 1}`,
          is_correct: false,
        });
        dIdx++;
      }
    }

    return {
      question_type: "multiple_choice" as const,
      question_text: card.question,
      options,
      correct_index: correctPosition,
      explanation,
    };
  });
}
