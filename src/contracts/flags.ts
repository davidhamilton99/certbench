import { z } from "zod";
import type { EndpointContract } from "./common";

/** Report a problem with a cert question (one flag per user per question). */
export const flagQuestion = {
  path: "/api/questions/flag",
  method: "POST",
  input: z.object({
    questionId: z.uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  output: z.object({ flagged: z.boolean() }),
} as const satisfies EndpointContract;
