import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/server/supabase/server";
import { rateLimiter } from "@/server/rate-limit";
import { getUserPlan, incrementGenerationUsage } from "@/server/services/subscription";
import {
  CONTENT_CHAR_LIMIT,
  MAX_QUESTION_COUNT,
  callClaude,
  callClaudeStreamRaw,
} from "@/server/ai/client";
import {
  buildGenerationPrompt,
  buildValidationPrompt,
  isValidGeneratedQuestion,
} from "@/server/ai/prompts";
import type { GeneratedQuestion } from "@/core/study-materials/types";

/**
 * AI question generation — SSE streaming, so this is one of the two
 * documented exceptions to the defineEndpoint factory (the other is the
 * Stripe webhook). Pipeline behaviour ported verbatim from the previous
 * app: stream JSONL questions, then a validation pass, then quota bump.
 */

const DEFAULT_QUESTION_COUNT = 25;

const generateSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1).max(500_000),
  questionCount: z.number().int().min(1).max(MAX_QUESTION_COUNT).optional(),
  questionTypes: z
    .array(
      z.enum(["multiple_choice", "true_false", "multiple_select", "ordering", "matching"])
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    );
  }

  // Tight rate limit before the expensive AI call.
  const allowed = await rateLimiter.check(`/api/study-sets/generate:${user.id}`, {
    limit: 2,
    windowSeconds: 60,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: { code: "rate_limited", message: "Please wait before generating again." } },
      { status: 429 }
    );
  }

  const userPlan = await getUserPlan(supabase, user.id);
  if (!userPlan.canGenerate) {
    return NextResponse.json(
      {
        error: {
          code: "quota_exceeded",
          message:
            "You’ve used all your free AI generations this month. Upgrade to Pro for unlimited access.",
        },
      },
      { status: 402 }
    );
  }

  const parsed = generateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_failed", message: z.prettifyError(parsed.error) } },
      { status: 400 }
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: {
          code: "internal",
          message:
            "AI generation is not configured — ANTHROPIC_API_KEY is missing from this environment.",
        },
      },
      { status: 503 }
    );
  }

  const { content, questionTypes } = parsed.data;
  const questionCount = parsed.data.questionCount || DEFAULT_QUESTION_COUNT;
  const truncatedContent = content.slice(0, CONTENT_CHAR_LIMIT);

  const anthropicResponse = await callClaudeStreamRaw({
    system: buildGenerationPrompt(questionCount, questionTypes),
    userMessage: `Generate ${questionCount} questions ONLY from the facts and concepts in this study material. Do not add any outside knowledge:\n\n${truncatedContent}`,
    temperature: 0.5,
    maxTokens: 32768,
  });

  if (!anthropicResponse.ok || !anthropicResponse.body) {
    const errorData = (await anthropicResponse.json().catch(() => null)) as {
      error?: { message?: string; type?: string };
    } | null;
    const apiMessage = errorData?.error?.message;
    const errorType = errorData?.error?.type;
    let message: string;
    if (errorType === "authentication_error" || anthropicResponse.status === 401) {
      message = "Invalid API key. Please check the ANTHROPIC_API_KEY environment variable.";
    } else if (errorType === "permission_error" || anthropicResponse.status === 403) {
      message = "The API key does not have permission to use this model.";
    } else if (errorType === "rate_limit_error" || anthropicResponse.status === 429) {
      message = "Rate limit exceeded. Please wait a moment and try again.";
    } else {
      message = apiMessage || `AI service error (${anthropicResponse.status}). Please try again.`;
    }
    return NextResponse.json(
      { error: { code: "internal", message } },
      { status: 502 }
    );
  }

  const encoder = new TextEncoder();
  const send = (controller: ReadableStreamDefaultController, data: string) => {
    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
  };

  const anthropicReader = anthropicResponse.body.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      send(
        controller,
        JSON.stringify({
          _type: "meta",
          sourcePreview: truncatedContent.slice(0, 500),
          contentTruncated: content.length > CONTENT_CHAR_LIMIT,
        })
      );

      let sseBuffer = "";
      let lineBuffer = "";
      let emittedCount = 0;
      const allQuestions: GeneratedQuestion[] = [];

      try {
        // Phase 1: stream questions from Claude
        while (true) {
          const { done, value } = await anthropicReader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const events = sseBuffer.split("\n\n");
          sseBuffer = events.pop() ?? "";

          for (const event of events) {
            const lines = event.split("\n");
            let eventType = "";
            let eventData = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7).trim();
              if (line.startsWith("data: ")) eventData = line.slice(6).trim();
            }

            if (eventType === "error" && eventData) {
              let errMsg = "AI generation failed. Please try again.";
              try {
                const errPayload = JSON.parse(eventData) as {
                  error?: { message?: string };
                };
                errMsg = errPayload?.error?.message || errMsg;
              } catch {}
              send(controller, JSON.stringify({ _type: "error", message: errMsg }));
              send(controller, "[DONE]");
              controller.close();
              return;
            }

            if (eventType !== "content_block_delta" || !eventData) continue;

            let chunk: { delta?: { type?: string; text?: string } };
            try {
              chunk = JSON.parse(eventData) as typeof chunk;
            } catch {
              continue;
            }
            if (chunk.delta?.type !== "text_delta" || !chunk.delta.text) continue;

            lineBuffer += chunk.delta.text;
            const jsonLines = lineBuffer.split("\n");
            lineBuffer = jsonLines.pop() ?? "";

            for (const line of jsonLines) {
              const trimmed = line.trim();
              if (!trimmed || emittedCount >= MAX_QUESTION_COUNT) continue;
              try {
                const q = JSON.parse(trimmed) as GeneratedQuestion;
                if (isValidGeneratedQuestion(q)) {
                  send(controller, JSON.stringify(q));
                  allQuestions.push(q);
                  emittedCount++;
                }
              } catch {
                // incomplete or non-JSON line — skip
              }
            }
          }
        }

        // Flush any remaining buffered content
        if (lineBuffer.trim() && emittedCount < MAX_QUESTION_COUNT) {
          try {
            const q = JSON.parse(lineBuffer.trim()) as GeneratedQuestion;
            if (isValidGeneratedQuestion(q)) {
              send(controller, JSON.stringify(q));
              allQuestions.push(q);
            }
          } catch {}
        }

        if (allQuestions.length === 0) {
          send(
            controller,
            JSON.stringify({
              _type: "error",
              message: "No questions could be generated. Please try again.",
            })
          );
          send(controller, "[DONE]");
          controller.close();
          return;
        }

        // Phase 2: validation pass (non-fatal on failure)
        send(controller, JSON.stringify({ _type: "validating", count: allQuestions.length }));
        try {
          const { system, userMessage } = buildValidationPrompt(
            allQuestions,
            truncatedContent
          );
          const validationResult = await callClaude({
            system,
            userMessage,
            maxTokens: 8192,
            temperature: 0.1,
          });
          const jsonMatch = validationResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedReviews = JSON.parse(jsonMatch[0]) as {
              reviews: Array<{
                index: number;
                status: "pass" | "rewrite" | "remove";
                improved?: GeneratedQuestion;
                reason?: string;
              }>;
            };
            if (Array.isArray(parsedReviews.reviews)) {
              for (const review of parsedReviews.reviews) {
                if (
                  review.status === "rewrite" &&
                  review.improved &&
                  isValidGeneratedQuestion(review.improved)
                ) {
                  send(
                    controller,
                    JSON.stringify({
                      _type: "rewrite",
                      index: review.index,
                      question: review.improved,
                    })
                  );
                } else if (review.status === "remove") {
                  send(
                    controller,
                    JSON.stringify({
                      _type: "removed",
                      index: review.index,
                      reason: review.reason || "Question quality issue",
                    })
                  );
                } else {
                  send(controller, JSON.stringify({ _type: "validated", index: review.index }));
                }
              }
            }
          }
        } catch (validationError) {
          console.error("Validation pass error:", validationError);
        }

        await incrementGenerationUsage(supabase, user.id);
        send(controller, "[DONE]");
      } catch (error) {
        console.error("AI generation error:", error);
        const message =
          error instanceof Error ? error.message : "Failed to generate questions.";
        send(controller, JSON.stringify({ _type: "error", message }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
