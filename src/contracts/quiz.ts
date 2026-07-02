import { z } from "zod";

/**
 * Shared quiz shapes used by the diagnostic, practice-exam and SRS contracts.
 *
 * SECURITY: questions served to an in-flight server-graded attempt carry
 * option TEXT only — correct_index and explanation stay server-side until
 * the attempt is submitted, then come back in the graded response review.
 */

/** A question as served to an active (ungraded) attempt. */
export const examQuestion = z.object({
  id: z.uuid(),
  question_text: z.string(),
  /** Option display text, in original (unshuffled) order — the client
   * applies the seeded permutation so resumes are deterministic. */
  options: z.array(z.string()).min(2),
  domain_id: z.uuid(),
});
export type ExamQuestion = z.infer<typeof examQuestion>;

/** One answer in a submit payload. */
export const answerInput = z.object({
  questionId: z.uuid(),
  selectedIndex: z.number().int().min(0),
  timeSpentSeconds: z.number().int().min(0).nullish(),
});
export type AnswerInput = z.infer<typeof answerInput>;

/** Per-question grading detail returned after submission. */
export const gradedResponse = z.object({
  questionId: z.uuid(),
  selectedIndex: z.number().int(),
  correctIndex: z.number().int(),
  isCorrect: z.boolean(),
  explanation: z.string(),
  questionText: z.string(),
  options: z.array(z.string()),
  domainId: z.uuid(),
});
export type GradedResponse = z.infer<typeof gradedResponse>;

export const domainBreakdown = z.object({
  domainId: z.uuid(),
  domainNumber: z.string(),
  title: z.string(),
  total: z.number().int(),
  correct: z.number().int(),
});
export type DomainBreakdown = z.infer<typeof domainBreakdown>;

/**
 * Serialized quiz-engine snapshot persisted in progress_state. Carries the
 * selected question ids so a resumed attempt serves the identical question
 * set, and the seed so option order reproduces exactly.
 */
export const progressSnapshot = z.object({
  index: z.number().int().min(0),
  responses: z.record(z.string(), z.unknown()),
  flagged: z.array(z.string()),
  revealed: z.array(z.string()),
  startedAt: z.string(),
  seed: z.string(),
  questionIds: z.array(z.uuid()),
});
export type ProgressSnapshot = z.infer<typeof progressSnapshot>;

/** Graded summary shared by diagnostic and practice-exam submits. */
export const examResult = z.object({
  attemptId: z.uuid(),
  totalQuestions: z.number().int(),
  correctCount: z.number().int(),
  /** 0–100 */
  scorePercent: z.number(),
  domainBreakdown: z.array(domainBreakdown),
  responses: z.array(gradedResponse),
  readiness: z
    .object({
      overallScore: z.number(),
      isPreliminary: z.boolean(),
    })
    .nullable(),
});
export type ExamResult = z.infer<typeof examResult>;
