import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ANTHROPIC_MODEL,
  ANTHROPIC_API_URL,
  CONTENT_CHAR_LIMIT,
  MAX_QUESTION_COUNT,
  type GeneratedQuestion,
  type Difficulty,
  type QuestionType,
  ALLOWED_DIFFICULTIES,
  difficultyInstructions,
  isValidQuestion,
  getAnthropicApiKey,
  callClaude,
  buildValidationPrompt,
} from "@/lib/ai/config";
import { getUserPlan, incrementGenerationUsage } from "@/lib/subscription";

const ALLOWED_COUNTS = [10, 25, 50];

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const {
    content,
    questionCount,
    title,
    difficulty = "mixed",
    questionTypes,
  } = (await req.json()) as {
    content: string;
    questionCount: number;
    title: string;
    difficulty?: Difficulty;
    questionTypes?: QuestionType[];
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

  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI generation is not configured. Add ANTHROPIC_API_KEY to your environment variables.",
      },
      { status: 503 }
    );
  }

  const truncatedContent = content.slice(0, CONTENT_CHAR_LIMIT);

  // Build type distribution based on user selection
  const ALL_TYPES: QuestionType[] = [
    "multiple_choice",
    "true_false",
    "multiple_select",
    "ordering",
    "matching",
  ];
  const DEFAULT_WEIGHTS: Record<QuestionType, number> = {
    multiple_choice: 40,
    true_false: 20,
    multiple_select: 20,
    ordering: 10,
    matching: 10,
  };
  const TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
    multiple_choice: "4 options, exactly 1 correct",
    true_false: "True/False statement",
    multiple_select: "4 options, 2-3 correct",
    ordering: "sequence 4 items in the correct order",
    matching: "match 4 term-definition pairs",
  };

  const validTypes =
    questionTypes && questionTypes.length > 0
      ? ALL_TYPES.filter((t) => questionTypes.includes(t))
      : ALL_TYPES;
  const totalWeight = validTypes.reduce(
    (sum, t) => sum + DEFAULT_WEIGHTS[t],
    0
  );
  const typeDistribution = validTypes
    .map((t) => {
      const pct = Math.round((DEFAULT_WEIGHTS[t] / totalWeight) * 100);
      return `- ${t} (~${pct}%): ${TYPE_DESCRIPTIONS[t]}`;
    })
    .join("\n");

  const systemPrompt = `You are an expert study question generator. Output exactly ${questionCount} questions in JSONL format — one JSON object per line, no array wrapper, no preamble or explanation.

ACCURACY RULES (critical — follow strictly):
- ONLY generate questions whose answers can be directly found in or logically inferred from the provided study material
- Do NOT introduce facts, terminology, definitions, or concepts that are not present in the source material
- Every correct answer and every distractor must be grounded in the content provided
- If the material does not contain enough content for ${questionCount} questions, generate fewer rather than inventing information
- Explanations must reference or paraphrase information from the study material

TYPE DISTRIBUTION (approximate):
${typeDistribution}
${validTypes.length < ALL_TYPES.length ? `\nIMPORTANT: ONLY generate the types listed above. Do NOT generate any other question type.` : ""}

${difficultyInstructions[validDifficulty]}

STRUCTURES PER TYPE:

[multiple_choice]
options: exactly 4, each {"text": "...", "is_correct": false/true}, exactly 1 is true
correct_index: 0-3 (0-based index of the correct option)

[true_false]
question_text: state a factual claim that is clearly true or false based on the study material
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

QUESTION STEM RULES:
- Ask one thing per question — no compound questions
- Put the core question in the stem, not in the options (avoid generic "Which of the following is true?" where all substance is in the options)
- For medium/hard: use scenario-based framing — give a context, then ask
- For true/false: the statement must be unambiguously true or false — avoid "sometimes" or "usually" qualifiers that make it arguable

DISTRACTOR QUALITY (critical for learning):
- Every wrong answer must be a concept that genuinely exists in the domain and could plausibly be confused with the correct answer
- Never use absurd, humorous, or obviously-wrong options
- For "which of the following" questions, all options should be the same grammatical form and roughly the same length
- Do NOT use "All of the above" or "None of the above"
- Wrong options should target common misconceptions, not random facts

EXPLANATION QUALITY:
- Sentence 1: State the correct answer and why it is correct, citing the specific concept from the study material
- Sentence 2: Explain why the most plausible wrong answer is wrong — this teaches the key distinction
- Sentence 3 (optional): Provide a memory aid, broader context, or connection to related concepts in the material
- Never write generic explanations like "This is correct because it is the right answer"

QUALITY REQUIREMENTS:
- Question stems must be clear, specific, and unambiguous
- Do not repeat questions or test the same concept twice
- Each question should test a distinct concept or skill from the material

OUTPUT FORMAT (critical):
- Output exactly ${questionCount} lines
- Each line is one complete, minified JSON object — no line breaks inside an object
- No array brackets, no commas between lines, no markdown, no extra text
- Example line: {"question_type":"multiple_choice","question_text":"...","options":[...],"correct_index":1,"explanation":"..."}`;

  // Initiate the Anthropic streaming request
  const anthropicResponse = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Generate ${questionCount} questions ONLY from the facts and concepts in this study material. Do not add any outside knowledge:\n\n${truncatedContent}`,
        },
      ],
      stream: true,
      temperature: 0.5,
      max_tokens: 16384,
    }),
  });

  if (!anthropicResponse.ok || !anthropicResponse.body) {
    const errorData = await anthropicResponse.json().catch(() => null) as {
      error?: { message?: string; type?: string };
    } | null;
    const apiMessage = errorData?.error?.message;
    const errorType = errorData?.error?.type;

    let message: string;
    if (errorType === "authentication_error" || anthropicResponse.status === 401) {
      message = "Invalid API key. Please check your ANTHROPIC_API_KEY environment variable.";
    } else if (errorType === "permission_error" || anthropicResponse.status === 403) {
      message = "Your API key does not have permission to use this model.";
    } else if (errorType === "rate_limit_error" || anthropicResponse.status === 429) {
      message = "Rate limit exceeded. Please wait a moment and try again.";
    } else if (apiMessage) {
      message = apiMessage;
    } else {
      message = `AI service error (${anthropicResponse.status}). Please try again.`;
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }

  const encoder = new TextEncoder();
  const send = (
    controller: ReadableStreamDefaultController,
    data: string
  ) => {
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
          sourcePreview: truncatedContent,
          contentTruncated: content.length > CONTENT_CHAR_LIMIT,
        })
      );

      let sseBuffer = "";
      let lineBuffer = "";
      let emittedCount = 0;
      const allQuestions: GeneratedQuestion[] = [];

      try {
        // Phase 1: Stream questions from Claude
        while (true) {
          const { done, value } = await anthropicReader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const events = sseBuffer.split("\n\n");
          sseBuffer = events.pop() ?? "";

          for (const event of events) {
            // Anthropic SSE format: event: <type>\ndata: <json>
            const lines = event.split("\n");
            let eventType = "";
            let eventData = "";
            for (const line of lines) {
              if (line.startsWith("event: ")) eventType = line.slice(7).trim();
              if (line.startsWith("data: ")) eventData = line.slice(6).trim();
            }

            // Handle stream-level errors from Anthropic
            if (eventType === "error" && eventData) {
              try {
                const errPayload = JSON.parse(eventData) as {
                  error?: { message?: string; type?: string };
                };
                const errMsg =
                  errPayload?.error?.message ||
                  "AI generation failed. Please check your API key and try again.";
                send(
                  controller,
                  JSON.stringify({ _type: "error", message: errMsg })
                );
              } catch {
                send(
                  controller,
                  JSON.stringify({
                    _type: "error",
                    message: "AI generation failed. Please try again.",
                  })
                );
              }
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

            if (chunk.delta?.type !== "text_delta" || !chunk.delta.text)
              continue;

            lineBuffer += chunk.delta.text;

            // Extract and emit complete lines
            const jsonLines = lineBuffer.split("\n");
            lineBuffer = jsonLines.pop() ?? "";

            for (const line of jsonLines) {
              const trimmed = line.trim();
              if (!trimmed || emittedCount >= MAX_QUESTION_COUNT) continue;
              try {
                const q = JSON.parse(trimmed) as GeneratedQuestion;
                if (isValidQuestion(q)) {
                  send(controller, JSON.stringify(q));
                  allQuestions.push(q);
                  emittedCount++;
                }
              } catch {
                // Incomplete or non-JSON line — skip
              }
            }
          }
        }

        // Flush any remaining buffered content
        if (lineBuffer.trim() && emittedCount < MAX_QUESTION_COUNT) {
          try {
            const q = JSON.parse(lineBuffer.trim()) as GeneratedQuestion;
            if (isValidQuestion(q)) {
              send(controller, JSON.stringify(q));
              allQuestions.push(q);
            }
          } catch {
            // ignore
          }
        }

        // If no valid questions were generated, report an error
        if (allQuestions.length === 0) {
          send(
            controller,
            JSON.stringify({
              _type: "error",
              message:
                "No questions could be generated. Please check your API key and try again.",
            })
          );
          send(controller, "[DONE]");
          controller.close();
          return;
        }

        // Phase 2: Validation pass
        if (allQuestions.length > 0) {
          send(
            controller,
            JSON.stringify({ _type: "validating", count: allQuestions.length })
          );

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

            // Extract JSON from the response (may have markdown wrapping)
            const jsonMatch = validationResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]) as {
                reviews: Array<{
                  index: number;
                  status: "pass" | "rewrite" | "remove";
                  improved?: GeneratedQuestion;
                  reason?: string;
                }>;
              };

              if (Array.isArray(parsed.reviews)) {
                for (const review of parsed.reviews) {
                  if (
                    review.status === "rewrite" &&
                    review.improved &&
                    isValidQuestion(review.improved)
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
                    send(
                      controller,
                      JSON.stringify({
                        _type: "validated",
                        index: review.index,
                      })
                    );
                  }
                }
              }
            }
          } catch (validationError) {
            console.error("Validation pass error:", validationError);
            // Validation failure is non-fatal — questions still usable
          }
        }

        // Track usage after successful generation
        if (allQuestions.length > 0) {
          await incrementGenerationUsage(supabase, user.id);
        }

        send(controller, "[DONE]");
      } catch (error) {
        console.error("AI generation error:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate questions.";
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
