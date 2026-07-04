import { z } from "zod";
import type { EndpointContract } from "./common";

/** Pipeline smoke check: auth resolution, rate limit, DB round-trip. */
export const health = {
  path: "/api/health",
  method: "GET",
  input: z.object({}),
  output: z.object({
    ok: z.boolean(),
    time: z.string(),
    /** Number of active certifications — proves an RLS-scoped DB read works. */
    certifications: z.number().int(),
    authenticated: z.boolean(),
  }),
} as const satisfies EndpointContract;
