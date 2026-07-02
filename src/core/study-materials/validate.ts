import { z } from "zod";

/**
 * Structural validation for user study questions — one schema per question
 * type, shared by manual creation, AI generation, and text import so every
 * path accepts exactly the same shapes (the acceptance rules of the
 * previous app's isValidQuestion, expressed as Zod).
 */

export const mctfOption = z.object({
  text: z.string().trim().min(1),
  is_correct: z.boolean(),
});

export const orderingOption = z.object({
  text: z.string().trim().min(1),
  correct_position: z.number().int().min(0),
});

export const matchingOption = z.object({
  left: z.string().trim().min(1),
  right: z.string().trim().min(1),
});

const base = {
  question_text: z.string().trim().min(1).max(2000),
  explanation: z.string().max(2000).nullish(),
};

export const studyQuestionInput = z.discriminatedUnion("question_type", [
  z
    .object({
      ...base,
      question_type: z.literal("multiple_choice"),
      options: z.array(mctfOption).min(2).max(8),
      correct_index: z.number().int().min(0),
    })
    .refine(
      (q) =>
        q.options.filter((o) => o.is_correct).length === 1 &&
        q.options[q.correct_index]?.is_correct === true,
      { message: "Exactly one option must be correct and match correct_index" }
    ),
  z
    .object({
      ...base,
      question_type: z.literal("true_false"),
      options: z.tuple([mctfOption, mctfOption]),
      correct_index: z.number().int().min(0).max(1),
    })
    .refine(
      (q) => q.options.filter((o) => o.is_correct).length === 1,
      { message: "Exactly one of true/false must be correct" }
    ),
  z
    .object({
      ...base,
      question_type: z.literal("multiple_select"),
      options: z.array(mctfOption).min(2).max(8),
      correct_index: z.literal(-1),
    })
    .refine((q) => q.options.filter((o) => o.is_correct).length >= 2, {
      message: "Multiple select needs at least 2 correct options",
    }),
  z
    .object({
      ...base,
      question_type: z.literal("ordering"),
      options: z.array(orderingOption).min(2).max(8),
      correct_index: z.literal(-1),
    })
    .refine(
      (q) => {
        const positions = q.options.map((o) => o.correct_position).sort((a, b) => a - b);
        return positions.every((p, i) => p === i);
      },
      { message: "Ordering positions must be a permutation of 0..n-1" }
    ),
  z
    .object({
      ...base,
      question_type: z.literal("matching"),
      options: z.array(matchingOption).min(2).max(8),
      correct_index: z.literal(-1),
    }),
]);

export type StudyQuestionInput = z.infer<typeof studyQuestionInput>;
