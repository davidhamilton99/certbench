import { defineEndpoint } from "@/server/api/define-endpoint";
import { clearSetProgress } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { clearSetProgressRow } from "@/server/data/study-sets";

export const POST = defineEndpoint(clearSetProgress, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await clearSetProgressRow(db, user.id, input.setId);
    return { cleared: true };
  },
});
