import { defineEndpoint } from "@/server/api/define-endpoint";
import { ApiError } from "@/contracts/common";
import { explainStudyQuestion } from "@/contracts/study-sets";
import { ANTHROPIC_MODEL_HAIKU, callClaude } from "@/server/ai/client";

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
        opts.map((o) => `- ${o.text}${o.is_correct ? " ✓" : ""}`).join("\n")
      );
    }
    case "ordering": {
      const opts = options as Array<{ text: string; correct_position: number }>;
      const sorted = [...opts].sort(
        (a, b) => a.correct_position - b.correct_position
      );
      return (
        "Correct order:\n" + sorted.map((o, i) => `${i + 1}. ${o.text}`).join("\n")
      );
    }
    case "matching": {
      const opts = options as Array<{ left: string; right: string }>;
      return (
        "Correct matches:\n" + opts.map((o) => `${o.left} → ${o.right}`).join("\n")
      );
    }
    default:
      return JSON.stringify(options);
  }
}

/**
 * On-demand explanation for a study question (Haiku for speed/cost).
 * Cache-first: generated once, stored on the question row.
 */
export const POST = defineEndpoint(explainStudyQuestion, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    if (!process.env.ANTHROPIC_API_KEY)
      throw new ApiError("internal", "AI service is not configured.");

    // RLS restricts this read to the owner's (or public-set) questions;
    // requiring user_id match keeps generation owner-only like before.
    const { data: question } = await db
      .from("user_study_questions")
      .select(
        "id, study_set_id, user_id, question_type, question_text, options, correct_index, explanation"
      )
      .eq("id", input.questionId)
      .maybeSingle();
    if (!question) throw new ApiError("not_found", "Question not found");
    if (question.user_id !== user.id)
      throw new ApiError("forbidden", "Not your question");

    if (question.explanation) return { explanation: question.explanation };

    const system = `You are a concise study tutor. Generate a brief, educational explanation for why the correct answer is right and the selected answer (if wrong) is wrong. Keep it to 2-3 sentences. Be specific and reference the concepts involved — never write generic filler like "This is correct because it is the right answer."`;

    const userMessage = `Question: ${question.question_text}
Type: ${question.question_type}
${formatOptions(question.question_type, (question.options as unknown[]) ?? [], question.correct_index)}
User selected: ${input.selectedAnswer}

Explain why the correct answer is correct${input.selectedAnswer ? " and why the selected answer is wrong" : ""}. Be concise (2-3 sentences).`;

    const explanation = (
      await callClaude({
        system,
        userMessage,
        maxTokens: 512,
        temperature: 0.2,
        model: ANTHROPIC_MODEL_HAIKU,
      })
    ).trim();

    // Cache best-effort; failures shouldn't block the response.
    await db
      .from("user_study_questions")
      .update({ explanation })
      .eq("id", question.id)
      .eq("user_id", user.id);

    return { explanation };
  },
});
