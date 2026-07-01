import { z } from "zod";
import type { EndpointContract } from "./common";
import {
  answerInput,
  examQuestion,
  examResult,
  progressSnapshot,
} from "./quiz";

/**
 * Practice-exam endpoints — three modes sharing one attempt/response table:
 *   full         — FULL_EXAM_QUESTION_COUNT across all domains
 *   domain_drill — DOMAIN_DRILL_QUESTION_COUNT within one domain (domainId required)
 *   weak_points  — previously-missed questions only
 */

export const examType = z.enum(["full", "domain_drill", "weak_points"]);
export type ExamType = z.infer<typeof examType>;

export const startPracticeExam = {
  path: "/api/practice-exam/start",
  method: "POST",
  input: z
    .object({
      certId: z.uuid(),
      examType,
      domainId: z.uuid().nullish(),
      /** Optional override for drill/new-content blocks from the session plan. */
      questionCount: z.number().int().min(1).max(120).nullish(),
    })
    .refine((v) => v.examType !== "domain_drill" || !!v.domainId, {
      message: "domainId is required for domain_drill",
    }),
  output: z.object({
    attemptId: z.uuid(),
    examType,
    questions: z.array(examQuestion),
    resume: progressSnapshot.nullable(),
  }),
} as const satisfies EndpointContract;

export const savePracticeExamProgress = {
  path: "/api/practice-exam/progress",
  method: "POST",
  input: z.object({
    attemptId: z.uuid(),
    snapshot: progressSnapshot,
  }),
  output: z.object({ saved: z.boolean() }),
} as const satisfies EndpointContract;

export const submitPracticeExam = {
  path: "/api/practice-exam/submit",
  method: "POST",
  input: z.object({
    attemptId: z.uuid(),
    answers: z.array(answerInput).min(1),
    /** Question ids the user flagged during the attempt (stored on responses). */
    flaggedQuestionIds: z.array(z.uuid()).default([]),
  }),
  output: examResult,
} as const satisfies EndpointContract;
