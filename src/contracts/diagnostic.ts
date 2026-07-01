import { z } from "zod";
import type { EndpointContract } from "./common";
import {
  answerInput,
  examQuestion,
  examResult,
  progressSnapshot,
} from "./quiz";

/**
 * Diagnostic exam endpoints. Grading is server-at-end; questions served
 * without answers; resume comes from progress_state on the attempt row.
 */

export const startDiagnostic = {
  path: "/api/diagnostic/start",
  method: "POST",
  input: z.object({ certId: z.uuid() }),
  output: z.object({
    attemptId: z.uuid(),
    questions: z.array(examQuestion),
    /** Present when resuming an in-flight attempt. */
    resume: progressSnapshot.nullable(),
  }),
} as const satisfies EndpointContract;

export const saveDiagnosticProgress = {
  path: "/api/diagnostic/progress",
  method: "POST",
  input: z.object({
    attemptId: z.uuid(),
    snapshot: progressSnapshot,
  }),
  output: z.object({ saved: z.boolean() }),
} as const satisfies EndpointContract;

export const submitDiagnostic = {
  path: "/api/diagnostic/submit",
  method: "POST",
  input: z.object({
    attemptId: z.uuid(),
    answers: z.array(answerInput).min(1),
  }),
  output: examResult,
} as const satisfies EndpointContract;
