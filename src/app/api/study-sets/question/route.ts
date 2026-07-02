import { defineEndpoint } from "@/server/api/define-endpoint";
import { upsertStudyQuestion } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { upsertQuestion } from "@/server/data/study-sets";

export const POST = defineEndpoint(upsertStudyQuestion, {
  auth: "user",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const questionId = await upsertQuestion(
      db,
      user.id,
      input.setId,
      input.questionId ?? null,
      input.question
    );
    return { questionId };
  },
});
