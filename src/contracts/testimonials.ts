import { z } from "zod";
import type { EndpointContract } from "./common";

/** Submit a post-exam story (always lands as pending for moderation). */
export const submitTestimonial = {
  path: "/api/testimonials",
  method: "POST",
  input: z.object({
    certId: z.uuid().nullable(),
    passed: z.boolean(),
    quote: z.string().trim().min(10).max(600),
    displayName: z.string().trim().min(1).max(60),
  }),
  output: z.object({ submitted: z.boolean() }),
} as const satisfies EndpointContract;

/** Admin: approve or hide a submitted testimonial. */
export const moderateTestimonial = {
  path: "/api/admin/testimonials",
  method: "POST",
  input: z.object({
    id: z.uuid(),
    status: z.enum(["approved", "hidden"]),
  }),
  output: z.object({ moderated: z.boolean() }),
} as const satisfies EndpointContract;
