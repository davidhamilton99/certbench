import { defineEndpoint } from "@/server/api/define-endpoint";
import { toggleBookmark } from "@/contracts/community";
import { ApiError } from "@/contracts/common";
import { setBookmark } from "@/server/data/community";

export const POST = defineEndpoint(toggleBookmark, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await setBookmark(db, user.id, input.setId, input.bookmarked);
    return { bookmarked: input.bookmarked };
  },
});
