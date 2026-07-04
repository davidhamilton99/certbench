import { defineEndpoint } from "@/server/api/define-endpoint";
import { createStudySet } from "@/contracts/study-sets";
import { ApiError } from "@/contracts/common";
import { createSet } from "@/server/data/study-sets";

export const POST = defineEndpoint(createStudySet, {
  auth: "user",
  rateLimit: { limit: 10, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const setId = await createSet(db, user.id, {
      title: input.title,
      description: input.description ?? null,
      category: input.category ?? null,
      sourcePreview: input.sourcePreview ?? null,
      questions: input.questions,
    });
    return { setId };
  },
});
