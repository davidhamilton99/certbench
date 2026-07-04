import { defineEndpoint } from "@/server/api/define-endpoint";
import { deleteStudySet } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { deleteSet } from "@/server/data/study-sets";

export const POST = defineEndpoint(deleteStudySet, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await deleteSet(db, user.id, input.setId);
    return { deleted: true };
  },
});
