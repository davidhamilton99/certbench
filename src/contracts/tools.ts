import { z } from "zod";
import type { EndpointContract } from "@/contracts/common";
import { DRILL_TOOLS, MAX_ITEM_ID, MAX_ITEMS } from "@/core/drill-rounds/drill-rounds";

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

const count = z.number().int().min(0);

/** A free-drill progress snapshot (see src/core/drill-rounds/drill-rounds.ts). */
export const drillProgressSchema = z.object({
  items: z
    .record(
      z.string().min(1).max(MAX_ITEM_ID),
      z.object({ a: count, c: count, s: count, t: count })
    )
    .refine((items) => Object.keys(items).length <= MAX_ITEMS, {
      message: `At most ${MAX_ITEMS} items`,
    }),
  rounds: count.max(1_000_000),
});

/** Load the signed-in user's saved progress on one free drill. */
export const getDrillProgress = {
  path: "/api/tools/progress",
  method: "GET",
  input: z.object({ tool: z.enum(DRILL_TOOLS) }),
  output: z.object({ progress: drillProgressSchema }),
} satisfies EndpointContract;

/**
 * Save progress on one free drill. The server merges it into what's stored
 * (per item, the record with more attempts wins), so a stale tab or a second
 * device can't erase newer answers.
 */
export const saveDrillProgress = {
  path: "/api/tools/progress",
  method: "POST",
  input: z.object({ tool: z.enum(DRILL_TOOLS), progress: drillProgressSchema }),
  output: z.object({ ok: z.literal(true) }),
} satisfies EndpointContract;
