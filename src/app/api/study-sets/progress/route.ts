import { defineEndpoint } from "@/server/api/define-endpoint";
import { saveSetProgress } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { saveSetProgressRow } from "@/server/data/study-sets";

export const POST = defineEndpoint(saveSetProgress, {
  auth: "user",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await saveSetProgressRow(db, user.id, input.setId, {
      currentIndex: input.currentIndex,
      correctCount: input.correctCount,
      totalQuestions: input.totalQuestions,
    });
    return { saved: true };
  },
});
