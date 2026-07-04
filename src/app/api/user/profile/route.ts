import { defineEndpoint } from "@/server/api/define-endpoint";
import { updateDisplayName } from "@/contracts/profile";
import { updateProfile } from "@/server/data/profiles";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(updateDisplayName, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await updateProfile(db, user.id, { displayName: input.displayName });
    return { updated: true };
  },
});
