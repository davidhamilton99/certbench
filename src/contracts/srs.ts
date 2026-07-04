import { z } from "zod";
import type { EndpointContract } from "./common";

/**
 * SRS review endpoints. Per-card commit model: each answer is graded and
 * scheduled server-side immediately (server_per_question in the quiz engine),
 * so there is no resume snapshot — an interrupted session simply re-fetches
 * what's still due.
 */

/** A due card: the question WITH its answer, revealed after the user answers. */
export const srsCard = z.object({
  questionId: z.uuid(),
  questionText: z.string(),
  options: z.array(z.string()).min(2),
  domainId: z.uuid(),
  /** Days overdue (>= 0), for display. */
  overdueDays: z.number().int().min(0),
});
export type SrsCard = z.infer<typeof srsCard>;

export const startSrsReview = {
  path: "/api/srs-review/start",
  method: "POST",
  input: z.object({
    certId: z.uuid(),
    /** Cap for this session; defaults server-side to SRS_MAX_CARDS_PER_SESSION. */
    limit: z.number().int().min(1).max(50).nullish(),
  }),
  output: z.object({
    cards: z.array(srsCard),
    totalDue: z.number().int(),
  }),
} as const satisfies EndpointContract;

export const submitSrsAnswer = {
  path: "/api/srs-review/submit",
  method: "POST",
  input: z.object({
    certId: z.uuid(),
    questionId: z.uuid(),
    selectedIndex: z.number().int().min(0),
  }),
  output: z.object({
    isCorrect: z.boolean(),
    correctIndex: z.number().int(),
    explanation: z.string(),
    /** New SRS schedule after this answer. */
    nextReviewAt: z.string(),
    intervalDays: z.number().int(),
    streak: z.number().int(),
  }),
} as const satisfies EndpointContract;

export const suspendSrsCard = {
  path: "/api/srs-review/suspend",
  method: "POST",
  input: z.object({
    questionId: z.uuid(),
    /** true = suspend (remove from scheduling), false = unsuspend. */
    suspend: z.boolean(),
  }),
  output: z.object({ suspended: z.boolean() }),
} as const satisfies EndpointContract;
