import { defineEndpoint } from "@/server/api/define-endpoint";
import { updateExamDate as updateExamDateContract } from "@/contracts/user";
import { updateExamDate } from "@/server/data/enrollments";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(updateExamDateContract, {
  auth: "user",
  rateLimit: { limit: 20, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await updateExamDate(db, user.id, input.certId, input.examDate);
    return { updated: true };
  },
});
