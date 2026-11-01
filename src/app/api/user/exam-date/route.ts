import { defineEndpoint } from "@/server/api/define-endpoint";
import { updateExamDate as updateExamDateContract } from "@/contracts/user";
import { setExamDate } from "@/server/services/enrollment-writes";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(updateExamDateContract, {
  auth: "user",
  rateLimit: { limit: 20, windowSeconds: 60 },
  handler: async ({ input, user }) => {
    if (!user) throw new ApiError("unauthorized");
    await setExamDate(user.id, input.certId, input.examDate);
    return { updated: true };
  },
});
