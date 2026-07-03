import "server-only";

import { serverEnv } from "@/env";

// ---------------------------------------------------------------------------
// Anthropic API access — models and calling conventions preserved verbatim
// from the previous app (working production behaviour).
// ---------------------------------------------------------------------------

export const ANTHROPIC_MODEL_SONNET = "claude-sonnet-4-6";
export const ANTHROPIC_MODEL_HAIKU = "claude-haiku-4-5-20251001";
export const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
export const CONTENT_CHAR_LIMIT = 100_000;
export const MAX_QUESTION_COUNT = 50;

export async function callClaude(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": serverEnv("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? ANTHROPIC_MODEL_SONNET,
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

  return data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
}

/** Raw streaming call — the caller parses Anthropic's SSE frames. */
export async function callClaudeStreamRaw(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
  temperature?: number;
  model?: string;
}): Promise<Response> {
  return fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": serverEnv("ANTHROPIC_API_KEY"),
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: opts.model ?? ANTHROPIC_MODEL_SONNET,
      max_tokens: opts.maxTokens ?? 32768,
      temperature: opts.temperature ?? 0.5,
      stream: true,
      system: opts.system,
      messages: [{ role: "user", content: opts.userMessage }],
    }),
  });
}
