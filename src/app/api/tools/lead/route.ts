import { defineEndpoint } from "@/server/api/define-endpoint";
import { captureToolLead } from "@/contracts/tools";
import { captureLead } from "@/server/services/tool-leads";

/**
 * Capture an email lead from a free public tool. Public + rate-limited per IP
 * so it can't be used to blast mail. The capture itself never fails the
 * request — the visitor always gets a friendly confirmation.
 */
export const POST = defineEndpoint(captureToolLead, {
  auth: "public",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ input }) => {
    await captureLead(input.email, input.source, input.context ?? {});
    return { ok: true as const };
  },
});
