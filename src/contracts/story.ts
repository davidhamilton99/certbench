import { z } from "zod";
import type { EndpointContract } from "./common";

/**
 * How an exam went, from the post-exam email's signed link: no sign-in. A
 * story lands as a pending testimonial for moderation. A "not this time" with
 * nothing written is still counted, just not stored.
 */
export const submitStory = {
  path: "/api/story",
  method: "POST",
  input: z.object({
    token: z.string().min(10).max(1000),
    passed: z.boolean(),
    quote: z.string().trim().max(600),
    displayName: z.string().trim().min(1).max(60),
  }),
  output: z.object({ submitted: z.boolean() }),
} as const satisfies EndpointContract;
