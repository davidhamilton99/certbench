import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ANTHROPIC_MODEL_HAIKU,
  callClaude,
  getAnthropicApiKey,
} from "@/lib/ai/config";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod/v4";

const explainSchema = z.object({
  questionId: z.string().uuid(),
  questionText: z.string().min(1).max(5000),
  questionType: z.string().min(1).max(50),
  options: z.array(z.unknown()).min(2).max(20),
  correctIndex: z.number().int().min(0),
  selectedAnswer: z.string().max(1000).optional().default(""),
});

/**
 * POST /api/study-materials/explain
 *
 * Generate an on-demand explanation for a single question.
 * Uses Haiku for speed and cost efficiency.
 * Caches the result back to the database so it's only generated once.
 */
async function handler(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`explain:${user.id}`, 30, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI service is not configured." },
      { status: 503 }
    );
  }

  const parsed = explainSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { questionId, questionText, questionType, options, correctIndex, selectedAnswer } = parsed.data;

  // Check if explanation already exists — verify user owns this question
  const { data: existing } = await supabase
    .from("user_study_questions")
    .select("explanation, study_set_id")
    .eq("id", questionId)
    .single();

  if (!existing) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Verify user owns the study set this question belongs to
  const { data: studySet } = await supabase
    .from("user_study_sets")
    .select("id")
    .eq("id", existing.study_set_id)
    .eq("user_id", user.id)
    .single();

  if (!studySet) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (existing.explanation) {
    return NextResponse.json({ explanation: existing.explanation });
  }

  // Build a concise prompt for Haiku
  const system = `You are a concise study tutor. Generate a brief, educational explanation for why the correct answer is right and the selected answer (if wrong) is wrong. Keep it to 2-3 sentences. Be specific and reference the concepts involved — never write generic filler like "This is correct because it is the right answer."`;

  const optionsSummary = formatOptions(questionType, options, correctIndex);

  const userMessage = `Question: ${questionText}
Type: ${questionType}
${optionsSummary}
User selected: ${selectedAnswer}

Explain why the correct answer is correct${selectedAnswer !== "correct" ? " and why the selected answer is wrong" : ""}. Be concise (2-3 sentences).`;

  try {
    const explanation = await callClaude({
      system,
      userMessage,
      maxTokens: 512,
      temperature: 0.2,
      model: ANTHROPIC_MODEL_HAIKU,
    });

    const trimmed = explanation.trim();

    // Cache to database (non-blocking, best-effort)
    supabase
      .from("user_study_questions")
      .update({ explanation: trimmed })
      .eq("id", questionId)
      .eq("study_set_id", studySet.id)
      .then(() => {});

    return NextResponse.json({ explanation: trimmed });
  } catch (error) {
    console.error("Explain API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate explanation.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export const POST = withErrorHandler(handler);

/** Format options into a readable string for the prompt. */
function formatOptions(
  questionType: string,
  options: unknown[],
  correctIndex: number
): string {
  switch (questionType) {
    case "multiple_choice":
    case "true_false": {
      const opts = options as Array<{ text: string; is_correct: boolean }>;
      return (
        "Options:\n" +
        opts
          .map(
            (o, i) =>
              `${String.fromCharCode(65 + i)}. ${o.text}${i === correctIndex ? " ✓" : ""}`
          )
          .join("\n")
      );
    }
    case "multiple_select": {
      const opts = options as Array<{ text: string; is_correct: boolean }>;
      return (
        "Options:\n" +
        opts
          .map(
            (o) => `- ${o.text}${o.is_correct ? " ✓" : ""}`
          )
          .join("\n")
      );
    }
    case "ordering": {
      const opts = options as Array<{ text: string; correct_position: number }>;
      const sorted = [...opts].sort((a, b) => a.correct_position - b.correct_position);
      return "Correct order:\n" + sorted.map((o, i) => `${i + 1}. ${o.text}`).join("\n");
    }
    case "matching": {
      const opts = options as Array<{ left: string; right: string }>;
      return (
        "Correct matches:\n" +
        opts.map((o) => `${o.left} → ${o.right}`).join("\n")
      );
    }
    default:
      return JSON.stringify(options);
  }
}
