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
  /**
   * Sent, and true, only with a question whose explanation names an answer by
   * its letter ("option A is the only one that ..."). Such a question is shown
   * in its stored order, in the attempt and in its review, so that the letter
   * in the text names the answer shown under that letter. Every other question
   * is shuffled.
   *
   * The flag does not say which answer is correct, and the explanation itself
   * still stays on the server. What it costs is the shuffle: the bank's stored
   * order puts the correct answer second more often than chance. The study
   * path makes the same trade for the same questions (bankToRep).
   */
  keepOrder: z.boolean().optional(),
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
 * The most question ids a stored snapshot may hold. An attempt is started with
 * at most 120 questions (startPracticeExam's questionCount), so a real
 * snapshot is always within it; the progress routes store what the browser
 * sends, and the submit routes grade only ids found here.
 */
export const MAX_SNAPSHOT_QUESTIONS = 200;

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
  questionIds: z.array(z.uuid()).max(MAX_SNAPSHOT_QUESTIONS),
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
