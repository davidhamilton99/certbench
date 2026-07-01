import { defineEndpoint } from "@/server/api/define-endpoint";
import { addCertification } from "@/contracts/user";
import { createEnrollment } from "@/server/data/enrollments";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(addCertification, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await createEnrollment(db, user.id, input.certId, input.examDate);
    return { enrolled: true };
  },
});
