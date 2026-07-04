import { defineEndpoint } from "@/server/api/define-endpoint";
import { saveDiagnosticProgress } from "@/contracts/diagnostic";
import { ApiError } from "@/contracts/common";
import { saveProgress } from "@/server/data/diagnostics";

export const POST = defineEndpoint(saveDiagnosticProgress, {
  auth: "user",
  rateLimit: { limit: 60, windowSeconds: 60 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    await saveProgress(db, user.id, input.attemptId, input.snapshot);
    return { saved: true };
  },
});
