import { defineEndpoint } from "@/server/api/define-endpoint";
import { suspendSrsCard } from "@/contracts/srs";
import { ApiError } from "@/contracts/common";
import { setSuspended } from "@/server/data/srs";

export const POST = defineEndpoint(suspendSrsCard, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await setSuspended(db, user.id, input.questionId, input.suspend);
    return { suspended: input.suspend };
  },
});
