import { defineEndpoint } from "@/server/api/define-endpoint";
import { addCertification } from "@/contracts/user";
import { addEnrollment } from "@/server/services/enrollment-writes";
import { ApiError } from "@/contracts/common";

/**
 * Adds an exam to an account without a purchase. This endpoint is closed, and
 * nothing in the app calls it.
 *
 * ADDON_CERTS MUST STAY UNSET in every environment (local, preview and
 * production). Pro access is scoped to the exams an account is enrolled in,
 * so setting ADDON_CERTS to "true" would let any signed-in account add every
 * exam for nothing: a way around the purchase. An exam is added to a plan by
 * buying it (src/app/api/stripe/cert-checkout), which is the only way in.
 *
 * The variable is left out of .env.example on purpose, and a server instance
 * that starts with it set writes a warning to the log (src/server/api/settings.ts).
 * The route is kept so that an old client that still calls it is answered
 * with a refusal and not with a missing page.
 */
export const POST = defineEndpoint(addCertification, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user }) => {
    if (!user) throw new ApiError("unauthorized");
    if (process.env.ADDON_CERTS !== "true") {
      throw new ApiError("forbidden", "Adding an exam this way is not available.");
    }
    await addEnrollment(user.id, input.certId, input.examDate);
    return { enrolled: true };
  },
});
