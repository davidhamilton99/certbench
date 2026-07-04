import { z } from "zod";
import type { EndpointContract } from "./common";

export const updateDisplayName = {
  path: "/api/user/profile",
  method: "POST",
  input: z.object({
    displayName: z.string().trim().min(1).max(60),
  }),
  output: z.object({ updated: z.boolean() }),
} as const satisfies EndpointContract;

/** Permanently deletes the account and all owned data (FK cascades). */
export const deleteAccount = {
  path: "/api/user/delete",
  method: "POST",
  input: z.object({
    /** Client must send the literal string DELETE — belt-and-braces. */
    confirm: z.literal("DELETE"),
  }),
  output: z.object({ deleted: z.boolean() }),
} as const satisfies EndpointContract;
