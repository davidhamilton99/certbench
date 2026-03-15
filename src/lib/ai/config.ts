// ---------------------------------------------------------------------------
// Shared AI configuration for quiz generation
// ---------------------------------------------------------------------------

export const ANTHROPIC_MODEL_SONNET = "claude-sonnet-4-6";
export const ANTHROPIC_MODEL_HAIKU = "claude-haiku-4-5-20251001";
/** @deprecated Use ANTHROPIC_MODEL_SONNET instead */
export const ANTHROPIC_MODEL = ANTHROPIC_MODEL_SONNET;
export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const CONTENT_CHAR_LIMIT = 100_000;
export const MAX_QUESTION_COUNT = 50;

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "multiple_select"
  | "ordering"
  | "matching";

export interface GeneratedQuestion {
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation?: string;
}

// ---------------------------------------------------------------------------
// Structural validation — checks shape, not semantic quality
// ---------------------------------------------------------------------------

export function isValidQuestion(q: GeneratedQuestion): boolean {
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

// ---------------------------------------------------------------------------
// Difficulty instructions
// ---------------------------------------------------------------------------

export type Difficulty = "mixed" | "easy" | "medium" | "hard";
export const ALLOWED_DIFFICULTIES: readonly Difficulty[] = [
  "mixed",
  "easy",
  "medium",
  "hard",
] as const;

export const difficultyInstructions: Record<Difficulty, string> = {
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

// ---------------------------------------------------------------------------
// Non-streaming Anthropic API call helper
// ---------------------------------------------------------------------------

export function getAnthropicApiKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

export async function callClaude(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 8192,
      temperature: opts.temperature ?? 0.3,
      system: opts.system,
      messages: [{ role: "user", content: opts.userMessage }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      (errorData as { error?: { message?: string } } | null)?.error?.message ||
      `Anthropic API error: ${response.status}`;
    throw new Error(message);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
  };

  const text = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");

  return text;
}

// ---------------------------------------------------------------------------
// Streaming Anthropic API call helper — returns a ReadableStream of text deltas
// ---------------------------------------------------------------------------

export async function callClaudeStream(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<{ body: ReadableStream<Uint8Array>; ok: boolean; status: number }> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? ANTHROPIC_MODEL,
      max_tokens: opts.maxTokens ?? 16384,
      temperature: opts.temperature ?? 0.5,
      stream: true,
      system: opts.system,
      messages: [{ role: "user", content: opts.userMessage }],
    }),
  });

  return {
    body: response.body!,
    ok: response.ok,
    status: response.status,
  };
}

// ---------------------------------------------------------------------------
// Validation prompt for post-generation quality review
// ---------------------------------------------------------------------------

export function buildValidationPrompt(
  questions: GeneratedQuestion[],
  sourceContent: string
): { system: string; userMessage: string } {
  const system = `You are a rigorous question quality reviewer for a study quiz app. You will review AI-generated questions against the source material they were generated from.

For each question, check:
1. CORRECTNESS: Is the marked correct answer actually correct according to the source material?
2. AMBIGUITY: Could any distractor also be arguably correct?
3. DEPTH: Does the question test real understanding, or just keyword matching?
4. STRUCTURE: For ordering — is the sequence unambiguous? For matching — could any pair be swapped?

For each question, return one of:
- "pass" — question is good
- "rewrite" — question has issues but is salvageable; provide an improved version
- "remove" — question is fundamentally flawed (wrong answer, unanswerable, etc.)

Return ONLY a JSON object with this exact structure, no other text:
{
  "reviews": [
    { "index": 0, "status": "pass" },
    { "index": 1, "status": "rewrite", "improved": { "question_type": "...", "question_text": "...", "options": [...], "correct_index": 0 } },
    { "index": 2, "status": "remove", "reason": "The marked correct answer is actually wrong because..." }
  ]
}`;

  const questionsJson = questions
    .map((q, i) => `Question ${i}: ${JSON.stringify(q)}`)
    .join("\n\n");

  const userMessage = `Review these ${questions.length} questions against the source material below. Return ONLY the JSON review object.

SOURCE MATERIAL:
${sourceContent.slice(0, 50_000)}

QUESTIONS TO REVIEW:
${questionsJson}`;

  return { system, userMessage };
}
