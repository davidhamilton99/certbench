import { defineEndpoint } from "@/server/api/define-endpoint";
import { savePracticeExamProgress } from "@/contracts/practice-exam";
import { ApiError } from "@/contracts/common";
import { saveProgress } from "@/server/data/practice-exams";

export const POST = defineEndpoint(savePracticeExamProgress, {
  auth: "user",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await saveProgress(db, user.id, input.attemptId, input.snapshot);
    return { saved: true };
  },
});
