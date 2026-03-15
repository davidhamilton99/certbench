import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CONTENT_CHAR_LIMIT,
  type GeneratedQuestion,
  type Difficulty,
  ALLOWED_DIFFICULTIES,
  difficultyInstructions,
  isValidQuestion,
  getAnthropicApiKey,
  callClaude,
  buildValidationPrompt,
} from "@/lib/ai/config";
import { getUserPlan, incrementGenerationUsage } from "@/lib/subscription";
import { rateLimit } from "@/lib/rate-limit";

const ALLOWED_COUNTS = [5, 10, 15];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit before expensive AI call — 2 per minute per user
  const { limited } = rateLimit(`ai_gen:${user.id}`, 2, 60_000);
  if (limited) {
    return NextResponse.json(
      { error: "Please wait before generating again." },
      { status: 429 }
    );
  }

  // Check subscription & usage limits
  const userPlan = await getUserPlan(supabase, user.id);
  if (!userPlan.canGenerate) {
    return NextResponse.json(
      {
        error: "You\u2019ve used all your free AI generations this month. Upgrade to Pro for unlimited access.",
        code: "GENERATION_LIMIT_REACHED",
      },
      { status: 403 }
    );
  }

  const { setId, questionCount, additionalContent, difficulty = "mixed" } =
    (await req.json()) as {
      setId: string;
      questionCount: number;
      additionalContent?: string;
      difficulty?: Difficulty;
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

  const validDifficulty: Difficulty = ALLOWED_DIFFICULTIES.includes(
    difficulty as Difficulty
  )
    ? (difficulty as Difficulty)
    : "mixed";

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

  // Fetch existing questions with full context for better dedup
  const { data: existingQuestions } = await supabase
    .from("user_study_questions")
    .select("question_type, question_text, options, correct_index, sort_order")
    .eq("study_set_id", setId)
    .order("sort_order", { ascending: false });

  const maxSortOrder =
    existingQuestions && existingQuestions.length > 0
      ? existingQuestions[0].sort_order
      : -1;

  const apiKey = getAnthropicApiKey();
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
  const truncatedContent = sourceContent.slice(0, CONTENT_CHAR_LIMIT);

  if (!truncatedContent.trim()) {
    return NextResponse.json(
      {
        error:
          "No source material available. Please provide additional content.",
      },
      { status: 400 }
    );
  }

  // Build full-context dedup list (not just question text)
  const existingList = (existingQuestions || [])
    .slice(0, 50)
    .map((q, i) => {
      const type = (q.question_type as string) || "multiple_choice";
      const opts = q.options as Array<{ text?: string; is_correct?: boolean }>;
      const correctOpt = opts.find((o) => o.is_correct);
      const correctText = correctOpt?.text || `index ${q.correct_index}`;
      return `${i + 1}. [${type}] "${q.question_text}" — correct: "${correctText}"`;
    })
    .join("\n");

  const systemPrompt = `You are an expert study question generator. Generate exactly ${questionCount} NEW questions from the provided study material using a MIX of question types.

ACCURACY RULES (critical — follow strictly):
- ONLY generate questions whose answers can be directly found in or logically inferred from the provided study material
- Do NOT introduce facts, terminology, definitions, or concepts that are not present in the source material
- Every correct answer and every distractor must be grounded in the content provided
- If the material does not contain enough content for ${questionCount} unique new questions, generate fewer rather than inventing information
- Explanations must reference or paraphrase information from the study material

CRITICAL: Do NOT duplicate or test the same concept as any existing question listed below. Each new question must cover a DIFFERENT concept.

TYPE DISTRIBUTION (approximate):
- multiple_choice (~40%): 4 options, exactly 1 correct
- true_false (~20%): True/False statement
- multiple_select (~20%): 4 options, 2-3 correct
- ordering (~10%): sequence 4 items in correct order
- matching (~10%): match 4 term-definition pairs

${difficultyInstructions[validDifficulty]}

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

QUESTION STEM RULES:
- Ask one thing per question — no compound questions
- Put the core question in the stem, not in the options
- For true/false: statements must be unambiguously true or false

DISTRACTOR QUALITY:
- Every wrong answer must be a plausible concept from the domain
- No absurd or obviously-wrong options; all options same grammatical form and similar length
- Do NOT use "All of the above" or "None of the above"
- Target common misconceptions

EXPLANATION QUALITY:
- Sentence 1: State the correct answer and why, citing the study material
- Sentence 2: Explain why the most plausible wrong answer is wrong
- Sentence 3 (optional): Memory aid or broader context

Existing questions (DO NOT duplicate or test the same concept):
${existingList}

Return ONLY a JSON object, no other text:
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
    const messageContent = await callClaude({
      system: systemPrompt,
      userMessage: `Generate ${questionCount} new questions ONLY from the facts and concepts in this study material. Do not add any outside knowledge:\n\n${truncatedContent}`,
      maxTokens: 12000,
      temperature: 0.3,
    });

    if (!messageContent) {
      return NextResponse.json(
        { error: "No response from AI." },
        { status: 502 }
      );
    }

    // Extract JSON from response (may have markdown wrapping)
    const jsonMatch = messageContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Invalid response format from AI." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      questions: GeneratedQuestion[];
    };

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      return NextResponse.json(
        { error: "Invalid response format from AI." },
        { status: 502 }
      );
    }

    let validQuestions = parsed.questions
      .filter(isValidQuestion)
      .slice(0, questionCount);

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "AI failed to generate valid questions." },
        { status: 502 }
      );
    }

    // Validation pass — review generated questions for accuracy
    try {
      const { system: valSystem, userMessage: valUser } =
        buildValidationPrompt(validQuestions, truncatedContent);
      const validationResult = await callClaude({
        system: valSystem,
        userMessage: valUser,
        maxTokens: 8192,
        temperature: 0.1,
      });

      const valJsonMatch = validationResult.match(/\{[\s\S]*\}/);
      if (valJsonMatch) {
        const valParsed = JSON.parse(valJsonMatch[0]) as {
          reviews: Array<{
            index: number;
            status: "pass" | "rewrite" | "remove";
            improved?: GeneratedQuestion;
          }>;
        };

        if (Array.isArray(valParsed.reviews)) {
          const updatedQuestions: GeneratedQuestion[] = [];
          for (let i = 0; i < validQuestions.length; i++) {
            const review = valParsed.reviews.find((r) => r.index === i);
            if (!review || review.status === "pass") {
              updatedQuestions.push(validQuestions[i]);
            } else if (
              review.status === "rewrite" &&
              review.improved &&
              isValidQuestion(review.improved)
            ) {
              updatedQuestions.push(review.improved);
            }
            // "remove" status — question is dropped
          }
          validQuestions = updatedQuestions;
        }
      }
    } catch (validationError) {
      console.error("Validation pass error:", validationError);
      // Non-fatal — use unvalidated questions
    }

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "All generated questions failed quality checks. Please try again." },
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

    // Track usage
    await incrementGenerationUsage(supabase, user.id);

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
