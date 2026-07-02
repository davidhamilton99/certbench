import { defineEndpoint } from "@/server/api/define-endpoint";
import { resolveQuestionFlag } from "@/contracts/flags";
import { resolveFlag } from "@/server/data/flags";

export const POST = defineEndpoint(resolveQuestionFlag, {
  auth: "admin",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, db }) => {
    await resolveFlag(db, input.flagId, input.status, input.adminNotes ?? null);
    return { resolved: true };
  },
});
