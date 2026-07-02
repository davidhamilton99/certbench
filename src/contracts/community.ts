import { z } from "zod";
import type { EndpointContract } from "./common";

/** Bump the public play counter when someone starts a community set. */
export const recordCommunityAttempt = {
  path: "/api/community/attempt",
  method: "POST",
  input: z.object({ setId: z.uuid() }),
  output: z.object({ recorded: z.boolean() }),
} as const satisfies EndpointContract;

export const toggleBookmark = {
  path: "/api/community/bookmark",
  method: "POST",
  input: z.object({ setId: z.uuid(), bookmarked: z.boolean() }),
  output: z.object({ bookmarked: z.boolean() }),
} as const satisfies EndpointContract;

export const reportCommunitySet = {
  path: "/api/community/report",
  method: "POST",
  input: z.object({
    setId: z.uuid(),
    reason: z.string().trim().min(3).max(500),
  }),
  output: z.object({ reported: z.boolean() }),
} as const satisfies EndpointContract;
