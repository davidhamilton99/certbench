import "server-only";

import type { GeneratedQuestion, QuestionType } from "@/core/study-materials/types";

// ---------------------------------------------------------------------------
// Prompt builders — ported behaviour-for-behaviour from the previous app.
// ---------------------------------------------------------------------------

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

const MIXED_DIFFICULTY = `Difficulty level: MIXED
- Mix difficulty levels across the set: roughly 30% recall/definition, 40% understanding/comparison, 30% application/scenario
- Vary question types throughout to create a balanced assessment
- Cognitive levels: Remember through Analyse`;

export function buildGenerationPrompt(
  questionCount: number,
  questionTypes: QuestionType[] | undefined
): string {
  const validTypes =
    questionTypes && questionTypes.length > 0
      ? ALL_TYPES.filter((t) => questionTypes.includes(t))
      : ALL_TYPES;
  const totalWeight = validTypes.reduce((sum, t) => sum + DEFAULT_WEIGHTS[t], 0);
  const typeDistribution = validTypes
    .map((t) => {
      const pct = Math.round((DEFAULT_WEIGHTS[t] / totalWeight) * 100);
      return `- ${t} (~${pct}%): ${TYPE_DESCRIPTIONS[t]}`;
    })
    .join("\n");

  return `You are an expert study question generator. Output exactly ${questionCount} questions in JSONL format — one JSON object per line, no array wrapper, no preamble or explanation.

ACCURACY RULES (critical — follow strictly):
- ONLY generate questions whose answers can be directly found in or logically inferred from the provided study material
- Do NOT introduce facts, terminology, definitions, or concepts that are not present in the source material
- Every correct answer and every distractor must be grounded in the content provided
- If the material does not contain enough content for ${questionCount} questions, generate fewer rather than inventing information
- Explanations must reference or paraphrase information from the study material

TYPE DISTRIBUTION (approximate):
${typeDistribution}
${validTypes.length < ALL_TYPES.length ? `\nIMPORTANT: ONLY generate the types listed above. Do NOT generate any other question type.` : ""}

${MIXED_DIFFICULTY}

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

QUALITY REQUIREMENTS:
- Question stems must be clear, specific, and unambiguous
- Do not repeat questions or test the same concept twice
- Each question should test a distinct concept or skill from the material

OUTPUT FORMAT (critical):
- Output exactly ${questionCount} lines
- Each line is one complete, minified JSON object — no line breaks inside an object
- No array brackets, no commas between lines, no markdown, no extra text
- Do NOT include an "explanation" field — explanations are generated on demand separately
- Example line: {"question_type":"multiple_choice","question_text":"...","options":[...],"correct_index":1}`;
}

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

/**
 * Structural validation for AI-generated questions — the previous app's
 * isValidQuestion, preserved exactly (stricter than manual-entry rules:
 * MC/MS/ordering/matching require exactly/at-least 4 options as prompted).
 */
export function isValidGeneratedQuestion(q: GeneratedQuestion): boolean {
  if (!q.question_text || !Array.isArray(q.options) || q.options.length < 2)
    return false;
  const type = q.question_type || "multiple_choice";
  switch (type) {
    case "multiple_choice":
      return (
        q.options.length === 4 &&
        (q.options as Array<{ is_correct?: boolean }>).filter((o) => o.is_correct)
          .length === 1 &&
        q.correct_index >= 0 &&
        q.correct_index <= 3
      );
    case "true_false":
      return (
        q.options.length === 2 &&
        (q.options as Array<{ is_correct?: boolean }>).filter((o) => o.is_correct)
          .length === 1 &&
        (q.correct_index === 0 || q.correct_index === 1)
      );
    case "multiple_select":
      return (
        q.options.length >= 2 &&
        (q.options as Array<{ is_correct?: boolean }>).filter((o) => o.is_correct)
          .length >= 2
      );
    case "ordering":
      return (
        q.options.length >= 2 &&
        (
          q.options as Array<{ text?: unknown; correct_position?: unknown }>
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
