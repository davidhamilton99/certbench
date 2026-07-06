import { defineEndpoint } from "@/server/api/define-endpoint";
import { submitTestimonial } from "@/contracts/testimonials";
import { insertTestimonial } from "@/server/data/testimonials";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(submitTestimonial, {
  auth: "user",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await insertTestimonial(db, user.id, {
      certId: input.certId,
      passed: input.passed,
      quote: input.quote,
      displayName: input.displayName,
    });
    return { submitted: true };
  },
});
