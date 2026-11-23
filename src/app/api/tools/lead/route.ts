import { defineEndpoint } from "@/server/api/define-endpoint";
import { captureToolLead } from "@/contracts/tools";
import { captureLead } from "@/server/services/tool-leads";

/**
 * Capture an email lead from a free public tool. Public, and limited to five
 * requests an hour for each visitor, so that it cannot be used to send mail in
 * bulk. The request itself succeeds whenever it was handled: `delivery` says
 * what happened to the email (sent, skipped or failed), so that the form can
 * tell the visitor the truth instead of confirming a send that did not happen.
 */
export const POST = defineEndpoint(captureToolLead, {
  auth: "public",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ input }) => {
    const delivery = await captureLead(input.email, input.source, input.context ?? {});
    return { ok: true as const, delivery };
  },
});
