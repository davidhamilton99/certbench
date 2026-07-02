import { defineEndpoint } from "@/server/api/define-endpoint";
import { updateStudySet } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { updateSet } from "@/server/data/study-sets";

export const POST = defineEndpoint(updateStudySet, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await updateSet(db, user.id, input.setId, {
      title: input.title,
      description: input.description,
      isPublic: input.isPublic,
    });
    return { updated: true };
  },
});
