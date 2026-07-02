import { defineEndpoint } from "@/server/api/define-endpoint";
import { deleteStudyQuestion } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { deleteQuestion } from "@/server/data/study-sets";

export const POST = defineEndpoint(deleteStudyQuestion, {
  auth: "user",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await deleteQuestion(db, user.id, input.setId, input.questionId);
    return { deleted: true };
  },
});
