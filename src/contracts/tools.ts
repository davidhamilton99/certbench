import { z } from "zod";
import type { EndpointContract } from "@/contracts/common";

/** Free public tools whose users we can capture an email lead from. */
export const TOOL_SOURCES = [
  "port-numbers-quiz",
  "subnetting-practice",
  "security-plus-acronyms-quiz",
] as const;

export type ToolSource = (typeof TOOL_SOURCES)[number];

/**
 * Capture an email lead from an anonymous free-tool user, in exchange for a
 * study-plan email. Public + rate-limited; the write and send happen server
 * side via the service role.
 */
export const captureToolLead = {
  path: "/api/tools/lead",
  method: "POST",
  input: z.object({
    email: z.email().max(254),
    source: z.enum(TOOL_SOURCES),
    /** Small, optional signal for the email (e.g. { answered, accuracy }). */
    context: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  }),
  output: z.object({ ok: z.literal(true) }),
} satisfies EndpointContract;
