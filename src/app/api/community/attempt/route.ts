import { defineEndpoint } from "@/server/api/define-endpoint";
import { recordCommunityAttempt } from "@/contracts/community";
import { recordAttempt } from "@/server/data/community";

export const POST = defineEndpoint(recordCommunityAttempt, {
  auth: "public",
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ input, db }) => {
    await recordAttempt(db, input.setId);
    return { recorded: true };
  },
});
