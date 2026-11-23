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
    /**
     * Whether each setting this deployment depends on is present. True or
     * false only: a value is never returned. A false here is a feature that
     * is switched off (see src/server/api/settings.ts for what each one does).
     */
    settings: z.object({
      resend: z.boolean(),
      cron: z.boolean(),
      stripe: z.boolean(),
      webhook: z.boolean(),
      posthog: z.boolean(),
      serviceRole: z.boolean(),
      postalAddress: z.boolean(),
    }),
  }),
} as const satisfies EndpointContract;
