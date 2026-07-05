import { defineEndpoint } from "@/server/api/define-endpoint";
import { completeOnboarding } from "@/contracts/user";
import { createEnrollment } from "@/server/data/enrollments";
import { updateProfile } from "@/server/data/profiles";
import { sendWelcome } from "@/server/services/lifecycle-email";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(completeOnboarding, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    try {
      await createEnrollment(db, user.id, input.certId, input.examDate);
    } catch (err) {
      // Re-running onboarding with an existing enrollment is fine.
      if (!(err instanceof ApiError && err.code === "conflict")) throw err;
    }
    await updateProfile(db, user.id, { onboardingCompleted: true });
    // Deduped internally and never throws — email being down can't block signup.
    if (user.email) await sendWelcome(user.id, user.email, input.certId);
    return { completed: true };
  },
});
