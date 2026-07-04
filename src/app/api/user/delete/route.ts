import { defineEndpoint } from "@/server/api/define-endpoint";
import { deleteAccount as deleteAccountContract } from "@/contracts/profile";
import { deleteAccount } from "@/server/services/delete-account";
import { ApiError } from "@/contracts/common";

export const POST = defineEndpoint(deleteAccountContract, {
  auth: "user",
  rateLimit: { limit: 3, windowSeconds: 60 },
  handler: async ({ user }) => {
    if (!user) throw new ApiError("unauthorized");
    await deleteAccount(user.id);
    return { deleted: true };
  },
});
