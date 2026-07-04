import { defineEndpoint } from "@/server/api/define-endpoint";
import { reportCommunitySet } from "@/contracts/community";
import { ApiError } from "@/contracts/common";
import { reportSet } from "@/server/data/community";

export const POST = defineEndpoint(reportCommunitySet, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await reportSet(db, user.id, input.setId, input.reason);
    return { reported: true };
  },
});
