import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const OPENAI_MODEL = "gpt-4.1-nano";

type TutorMode = "explain_wrong" | "hint" | "explain_more";

interface AiTutorRequest {
  mode: TutorMode;
  questionText: string;
  options: { text: string; is_correct: boolean }[];
  correctIndex: number;
  selectedIndex?: number;
  sourceContext?: string;
  previousExplanation?: string;
}

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter
// Max 30 AI calls per user per 5-minute window.
// In a serverless environment each cold-start gets a fresh Map, so this is
// best-effort per-instance protection (good enough for now).
// ---------------------------------------------------------------------------
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 30;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, valid);
    return false;
  }

  valid.push(now);
  rateLimitMap.set(userId, valid);
  return true;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildExplainWrongPrompt(
  req: AiTutorRequest
): { system: string; user: string } {
  const selectedOpt =
    req.selectedIndex != null ? req.options[req.selectedIndex] : null;
  const correctOpt = req.options[req.correctIndex];
  const selectedLetter =
    req.selectedIndex != null
      ? String.fromCharCode(65 + req.selectedIndex)
      : "?";
  const correctLetter = String.fromCharCode(65 + req.correctIndex);

  return {
    system: `You are a patient study tutor helping a student understand why they got a question wrong. Be concise (3-4 sentences). First address why their chosen answer is incorrect, then explain why the correct answer is right. If source context is provided, reference relevant details from it. Do not be condescending. Do not use emojis.`,
    user: `Question: ${req.questionText}

Student chose: ${selectedLetter}) ${selectedOpt?.text ?? "Unknown"}
Correct answer: ${correctLetter}) ${correctOpt?.text ?? "Unknown"}

${req.sourceContext ? `Source context:\n${req.sourceContext.slice(0, 2000)}` : ""}`,
  };
}

function buildHintPrompt(
  req: AiTutorRequest
): { system: string; user: string } {
  const optionList = req.options
    .map((o, i) => `${String.fromCharCode(65 + i)}) ${o.text}`)
    .join("\n");

  return {
    system: `You are a study tutor giving a hint for a multiple-choice question. Give ONE brief hint (1-2 sentences) that helps the student think about the answer WITHOUT revealing it. Guide their reasoning toward the right concept area. Never mention which option letter is correct. Never say "the answer is". Do not use emojis.`,
    user: `Question: ${req.questionText}

Options:
${optionList}

${req.sourceContext ? `Source context:\n${req.sourceContext.slice(0, 2000)}` : ""}`,
  };
}

function buildExplainMorePrompt(
  req: AiTutorRequest
): { system: string; user: string } {
  const correctOpt = req.options[req.correctIndex];

  return {
    system: `You are a study tutor providing a deeper explanation of a concept. The student has already seen a basic explanation and wants to understand more. Provide an analogy or real-world example, explain the underlying principle, and connect it to related ideas. Keep it to 4-6 sentences. Do not repeat the basic explanation verbatim. Do not use emojis.`,
    user: `Question: ${req.questionText}
Correct answer: ${correctOpt?.text ?? "Unknown"}

Basic explanation already shown to the student:
${req.previousExplanation || "No prior explanation available."}

${req.sourceContext ? `Source context:\n${req.sourceContext.slice(0, 2000)}` : ""}`,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      {
        error: "Too many AI requests. Please wait a moment before trying again.",
      },
      { status: 429 }
    );
  }

  const body = (await req.json()) as AiTutorRequest;
  const { mode, questionText, options, correctIndex } = body;

  // Validate mode
  if (!["explain_wrong", "hint", "explain_more"].includes(mode)) {
    return NextResponse.json(
      { error: "Invalid mode. Must be explain_wrong, hint, or explain_more." },
      { status: 400 }
    );
  }

  if (!questionText || !options || correctIndex == null) {
    return NextResponse.json(
      { error: "questionText, options, and correctIndex are required." },
      { status: 400 }
    );
  }

  if (mode === "explain_wrong" && body.selectedIndex == null) {
    return NextResponse.json(
      { error: "selectedIndex is required for explain_wrong mode." },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI is not configured." },
      { status: 503 }
    );
  }

  // Build the prompt based on mode
  let prompt: { system: string; user: string };
  let temperature: number;
  let maxTokens: number;

  switch (mode) {
    case "explain_wrong":
      prompt = buildExplainWrongPrompt(body);
      temperature = 0.7;
      maxTokens = 300;
      break;
    case "hint":
      prompt = buildHintPrompt(body);
      temperature = 0.5;
      maxTokens = 150;
      break;
    case "explain_more":
      prompt = buildExplainMorePrompt(body);
      temperature = 0.7;
      maxTokens = 400;
      break;
    default:
      return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
  }

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
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("OpenAI AI-tutor error:", errorData);
      return NextResponse.json(
        { error: "AI service temporarily unavailable." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI." },
        { status: 502 }
      );
    }

    return NextResponse.json({ content: content.trim() });
  } catch (error) {
    console.error("AI tutor error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response. Please try again." },
      { status: 500 }
    );
  }
}
