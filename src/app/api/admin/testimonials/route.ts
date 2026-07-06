import { defineEndpoint } from "@/server/api/define-endpoint";
import { moderateTestimonial } from "@/contracts/testimonials";
import { setTestimonialStatus } from "@/server/data/testimonials";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(moderateTestimonial, {
  auth: "admin",
  handler: async ({ input, db }) => {
    if (input.status !== "approved" && input.status !== "hidden") {
      throw new ApiError("validation_failed", "Invalid status");
    }
    await setTestimonialStatus(db, input.id, input.status);
    return { moderated: true };
  },
});
