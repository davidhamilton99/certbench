import { defineEndpoint } from "@/server/api/define-endpoint";
import { addCertification } from "@/contracts/user";
import { addEnrollment } from "@/server/services/enrollment-writes";
import { ApiError } from "@/contracts/common";

/**
 * Enrol in an additional certification. Access is now scoped to the cert a
 * user bought, so a free self-serve enroll would be a paywall bypass: adding
 * another cert must go through a purchase. Gated off until that flow is wired
 * (set ADDON_CERTS=true to re-enable once per-cert billing exists).
 */
export const POST = defineEndpoint(addCertification, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user }) => {
    if (!user) throw new ApiError("unauthorized");
    if (process.env.ADDON_CERTS !== "true") {
      throw new ApiError(
        "forbidden",
        "Adding a certification isn't available yet — it's coming soon."
      );
    }
    await addEnrollment(user.id, input.certId, input.examDate);
    return { enrolled: true };
  },
});
