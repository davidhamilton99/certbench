import { defineEndpoint } from "@/server/api/define-endpoint";
import { flagQuestion } from "@/contracts/flags";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(flagQuestion, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const { error } = await db.from("question_flags").insert({
      user_id: user.id,
      question_id: input.questionId,
      reason: input.reason,
    });
    // Unique(user, question): re-flagging is a no-op success.
    if (error && error.code !== "23505")
      throw new ApiError("internal", error.message);
    return { flagged: true };
  },
});
