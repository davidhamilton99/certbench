import { z } from "zod";
import type { EndpointContract } from "./common";

/** Completes onboarding: enrol in a cert (+ optional exam date). */
export const completeOnboarding = {
  path: "/api/user/onboarding",
  method: "POST",
  input: z.object({
    certId: z.uuid(),
    /** ISO date (yyyy-mm-dd) or null when the user hasn't booked yet. */
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  }),
  output: z.object({ completed: z.boolean() }),
} as const satisfies EndpointContract;

/** Enrol in an additional certification after onboarding. */
export const addCertification = {
  path: "/api/user/certifications",
  method: "POST",
  input: z.object({
    certId: z.uuid(),
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  }),
  output: z.object({ enrolled: z.boolean() }),
} as const satisfies EndpointContract;

/** Update the exam date for an enrollment. */
export const updateExamDate = {
  path: "/api/user/exam-date",
  method: "POST",
  input: z.object({
    certId: z.uuid(),
    examDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
  }),
  output: z.object({ updated: z.boolean() }),
} as const satisfies EndpointContract;
