/**
 * Parses human-readable AI-generated question output into structured questions.
 *
 * Supported format:
 *
 *   [MC]
 *   Q: What port does HTTPS use?
 *   - 443 (correct)
 *   - 80
 *   - 22
 *   - 8080
 *   Explanation: HTTPS uses port 443 by default.
 *
 *   [TF]
 *   Q: TCP is connectionless.
 *   Answer: False
 *   Explanation: TCP is connection-oriented.
 *
 *   [MS]
 *   Q: Which are valid HTTP methods? (Select all that apply)
 *   - GET (correct)
 *   - POST (correct)
 *   - FETCH
 *   - SEND
 *   Explanation: GET and POST are standard methods.
 *
 *   [ORD]
 *   Q: Arrange from top to bottom:
 *   1. Application
 *   2. Presentation
 *   3. Session
 *   4. Transport
 *   Explanation: The correct order is...
 *
 *   [MATCH]
 *   Q: Match each protocol with its port:
 *   - HTTP = 80
 *   - HTTPS = 443
 *   - SSH = 22
 *   Explanation: Standard port assignments.
 */

import type { QuestionType } from "@/components/workspace/study-material-form/types";

export interface ParsedQuestion {
  question_type: QuestionType;
  question_text: string;
  options: unknown[];
  correct_index: number;
  explanation: string;
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: { line: number; message: string }[];
}

type TagType = "MC" | "TF" | "MS" | "ORD" | "MATCH";

const TAG_TO_TYPE: Record<TagType, QuestionType> = {
  MC: "multiple_choice",
  TF: "true_false",
  MS: "multiple_select",
  ORD: "ordering",
  MATCH: "matching",
};

const TAG_PATTERN = /^\[(MC|TF|MS|ORD|MATCH)\]\s*$/i;
const QUESTION_PATTERN = /^Q:\s*(.+)/i;
const OPTION_PATTERN = /^[-*]\s+(.+)/;
const CORRECT_MARKER = /\(correct\)\s*$/i;
const NUMBERED_PATTERN = /^\d+[.)]\s+(.+)/;
const MATCH_SEPARATOR = /\s*[=→:]\s*/;
const ANSWER_PATTERN = /^Answer:\s*(True|False)\s*$/i;
const EXPLANATION_PATTERN = /^Explanation:\s*(.*)/i;

/**
 * Split raw text into blocks, one per question.
 * A block starts with a [TAG] line.
 */
function splitIntoBlocks(
  text: string
): { tag: TagType; lines: string[]; startLine: number }[] {
  const rawLines = text.split(/\r?\n/);
  const blocks: { tag: TagType; lines: string[]; startLine: number }[] = [];
  let current: { tag: TagType; lines: string[]; startLine: number } | null =
    null;

  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    const tagMatch = trimmed.match(TAG_PATTERN);

    if (tagMatch) {
      if (current) blocks.push(current);
      current = {
        tag: tagMatch[1].toUpperCase() as TagType,
        lines: [],
        startLine: i + 1,
      };
    } else if (current && trimmed) {
      current.lines.push(trimmed);
    }
  }
  if (current) blocks.push(current);
  return blocks;
}

function parseMC(
  lines: string[]
): { question: ParsedQuestion; error?: string } | { error: string } {
  const qLine = lines.find((l) => QUESTION_PATTERN.test(l));
  if (!qLine) return { error: "Missing question (Q: ...)" };

  const questionText = qLine.match(QUESTION_PATTERN)![1].trim();
  const optionLines = lines.filter((l) => OPTION_PATTERN.test(l));

  if (optionLines.length < 2)
    return { error: "Need at least 2 options (- option text)" };

  let correctIndex = -1;
  const options = optionLines.map((line, i) => {
    const raw = line.match(OPTION_PATTERN)![1];
    const isCorrect = CORRECT_MARKER.test(raw);
    const text = raw.replace(CORRECT_MARKER, "").trim();
    if (isCorrect) correctIndex = i;
    return { text, is_correct: isCorrect };
  });

  if (correctIndex === -1)
    return { error: "No option marked (correct)" };

  const explanation = extractExplanation(lines);

  return {
    question: {
      question_type: "multiple_choice",
      question_text: questionText,
      options,
      correct_index: correctIndex,
      explanation,
    },
  };
}

function parseTF(
  lines: string[]
): { question: ParsedQuestion; error?: string } | { error: string } {
  const qLine = lines.find((l) => QUESTION_PATTERN.test(l));
  if (!qLine) return { error: "Missing question (Q: ...)" };

  const questionText = qLine.match(QUESTION_PATTERN)![1].trim();
  const answerLine = lines.find((l) => ANSWER_PATTERN.test(l));

  if (!answerLine) return { error: "Missing Answer: True/False" };

  const isTrue =
    answerLine.match(ANSWER_PATTERN)![1].toLowerCase() === "true";
  const correctIndex = isTrue ? 0 : 1;

  const explanation = extractExplanation(lines);

  return {
    question: {
      question_type: "true_false",
      question_text: questionText,
      options: [
        { text: "True", is_correct: isTrue },
        { text: "False", is_correct: !isTrue },
      ],
      correct_index: correctIndex,
      explanation,
    },
  };
}

function parseMS(
  lines: string[]
): { question: ParsedQuestion; error?: string } | { error: string } {
  const qLine = lines.find((l) => QUESTION_PATTERN.test(l));
  if (!qLine) return { error: "Missing question (Q: ...)" };

  const questionText = qLine.match(QUESTION_PATTERN)![1].trim();
  const optionLines = lines.filter((l) => OPTION_PATTERN.test(l));

  if (optionLines.length < 2)
    return { error: "Need at least 2 options" };

  let correctCount = 0;
  const options = optionLines.map((line) => {
    const raw = line.match(OPTION_PATTERN)![1];
    const isCorrect = CORRECT_MARKER.test(raw);
    const text = raw.replace(CORRECT_MARKER, "").trim();
    if (isCorrect) correctCount++;
    return { text, is_correct: isCorrect };
  });

  if (correctCount < 2)
    return { error: "Multiple select needs at least 2 options marked (correct)" };

  const explanation = extractExplanation(lines);

  return {
    question: {
      question_type: "multiple_select",
      question_text: questionText,
      options,
      correct_index: -1,
      explanation,
    },
  };
}

function parseOrdering(
  lines: string[]
): { question: ParsedQuestion; error?: string } | { error: string } {
  const qLine = lines.find((l) => QUESTION_PATTERN.test(l));
  if (!qLine) return { error: "Missing question (Q: ...)" };

  const questionText = qLine.match(QUESTION_PATTERN)![1].trim();
  const numberedLines = lines.filter((l) => NUMBERED_PATTERN.test(l));

  if (numberedLines.length < 2)
    return { error: "Need at least 2 numbered items (1. item)" };

  // The numbered order IS the correct order — store correct_position
  const options = numberedLines.map((line, i) => ({
    text: line.match(NUMBERED_PATTERN)![1].trim(),
    correct_position: i,
  }));

  const explanation = extractExplanation(lines);

  return {
    question: {
      question_type: "ordering",
      question_text: questionText,
      options,
      correct_index: -1,
      explanation,
    },
  };
}

function parseMatching(
  lines: string[]
): { question: ParsedQuestion; error?: string } | { error: string } {
  const qLine = lines.find((l) => QUESTION_PATTERN.test(l));
  if (!qLine) return { error: "Missing question (Q: ...)" };

  const questionText = qLine.match(QUESTION_PATTERN)![1].trim();
  const optionLines = lines.filter(
    (l) => OPTION_PATTERN.test(l) && MATCH_SEPARATOR.test(l)
  );

  if (optionLines.length < 2)
    return { error: "Need at least 2 matching pairs (- term = definition)" };

  const options = optionLines.map((line) => {
    const raw = line.match(OPTION_PATTERN)![1];
    const parts = raw.split(MATCH_SEPARATOR);
    return {
      left: parts[0].trim(),
      right: parts.slice(1).join(" ").trim(),
    };
  });

  const explanation = extractExplanation(lines);

  return {
    question: {
      question_type: "matching",
      question_text: questionText,
      options,
      correct_index: -1,
      explanation,
    },
  };
}

function extractExplanation(lines: string[]): string {
  for (const line of lines) {
    const match = line.match(EXPLANATION_PATTERN);
    if (match) {
      // Explanation might continue on subsequent lines, but for simplicity
      // we take the single line. Multi-line explanations would need a
      // different approach.
      return match[1].trim();
    }
  }
  return "";
}

const PARSERS: Record<
  TagType,
  (
    lines: string[]
  ) => { question: ParsedQuestion; error?: string } | { error: string }
> = {
  MC: parseMC,
  TF: parseTF,
  MS: parseMS,
  ORD: parseOrdering,
  MATCH: parseMatching,
};

export function parseAIOutput(text: string): ParseResult {
  const blocks = splitIntoBlocks(text);
  const questions: ParsedQuestion[] = [];
  const errors: { line: number; message: string }[] = [];

  for (const block of blocks) {
    const parser = PARSERS[block.tag];
    const result = parser(block.lines);

    if ("question" in result) {
      questions.push(result.question);
    } else {
      errors.push({
        line: block.startLine,
        message: `[${block.tag}] ${result.error}`,
      });
    }
  }

  return { questions, errors };
}

/**
 * Build a copy-paste prompt for the user to give to their AI.
 */
export function buildImportPrompt(
  types: QuestionType[]
): string {
  const typeInstructions: string[] = [];

  if (types.includes("multiple_choice")) {
    typeInstructions.push(`[MC]
Q: Your question here?
- Wrong answer
- Correct answer (correct)
- Wrong answer
- Wrong answer
Explanation: Why the correct answer is right.`);
  }

  if (types.includes("true_false")) {
    typeInstructions.push(`[TF]
Q: Statement that is true or false.
Answer: True
Explanation: Why this is true.`);
  }

  if (types.includes("multiple_select")) {
    typeInstructions.push(`[MS]
Q: Which of the following apply? (Select all that apply)
- Correct option (correct)
- Correct option (correct)
- Wrong option
- Wrong option
Explanation: Why those options are correct.`);
  }

  if (types.includes("ordering")) {
    typeInstructions.push(`[ORD]
Q: Arrange the following in the correct order:
1. First item
2. Second item
3. Third item
4. Fourth item
Explanation: Why this is the correct order.`);
  }

  if (types.includes("matching")) {
    typeInstructions.push(`[MATCH]
Q: Match each term with its definition:
- Term 1 = Definition 1
- Term 2 = Definition 2
- Term 3 = Definition 3
- Term 4 = Definition 4
Explanation: Brief explanation of the pairings.`);
  }

  return `Generate study questions from my material below. Cover as much of the material as possible. Use EXACTLY this format — one question per block, each starting with a type tag. Include an explanation for every question.

FORMAT:
${typeInstructions.join("\n\n")}

RULES:
- Every question MUST start with a type tag in square brackets: ${types.map((t) => `[${Object.entries(TAG_TO_TYPE).find(([, v]) => v === t)?.[0]}]`).join(", ")}
- Mark correct answers with (correct) at the end of the line
- For True/False, use "Answer: True" or "Answer: False"
- For ordering, list items in the CORRECT order numbered 1, 2, 3...
- For matching, use "term = definition" format
- Always include "Explanation:" for every question${types.length > 1 ? `\n- Use a mix of question types` : ""}

MY STUDY MATERIAL:
[Paste your notes, textbook content, or study material here]`;
}
