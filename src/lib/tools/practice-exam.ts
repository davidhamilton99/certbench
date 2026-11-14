import { splitExplanation } from "@/core/path/text";
import type { ChoiceRep, PathDomain, PathStructure } from "@/core/path/types";

/**
 * A free practice test on a public page, in the shapes the path's exam player
 * and its result take, so a visitor sits it exactly as a member sits a
 * rehearsal: flagging, the question grid, the clock, the score by domain.
 */

export interface ExamQuestion {
  id: string;
  /** Objective code, e.g. "4.1". Its domain is "4.0". */
  objective: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ExamDomain {
  number: string;
  title: string;
  /** Share of the exam, in percent. */
  weight: number;
  objectives: { code: string; label: string }[];
}

/** The questions as the player's reps: lettered like the exam, the explanation's first line as the takeaway. */
export function examReps(questions: readonly ExamQuestion[]): ChoiceRep[] {
  return questions.map((q) => {
    const { takeaway, rest } = splitExplanation(q.explanation);
    return {
      type: "choice",
      id: q.id,
      label: "Exam style",
      tier: "exam",
      objective: q.objective,
      prompt: q.questionText,
      options: q.options,
      answer: q.correctIndex,
      takeaway,
      ...(rest ? { explanation: rest } : {}),
      lettered: true,
    };
  });
}

/** The exam's domains and objectives as the structure a result is scored and shown against. */
export function examStructure(exam: {
  slug: string;
  examName: string;
  examCode: string;
  domains: readonly ExamDomain[];
}): PathStructure {
  const domains: PathDomain[] = exam.domains.map((d) => ({
    number: d.number,
    title: d.title,
    weight: d.weight,
    objectives: d.objectives.map((o) => ({ code: o.code, title: o.label })),
  }));
  return { certSlug: exam.slug, examName: exam.examName, examCode: exam.examCode, domains };
}

/** The same items in a random order (Fisher–Yates), leaving the input alone. */
export function shuffled<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
