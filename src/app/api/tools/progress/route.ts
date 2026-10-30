import { defineEndpoint } from "@/server/api/define-endpoint";
import { getDrillProgress, saveDrillProgress } from "@/contracts/tools";
import { ApiError } from "@/contracts/common";
import {
  getDrillProgress as loadProgress,
  saveDrillProgress as storeProgress,
} from "@/server/data/drill-progress";
import { mergeProgress } from "@/core/drill-rounds/drill-rounds";

/**
 * Saved progress on the free public drills. Any signed-in user — the drills
 * are free with an account, so this is deliberately NOT behind Pro. Rows are
 * scoped to the caller by RLS as well as by the user id here.
 */
export const GET = defineEndpoint(getDrillProgress, {
  auth: "user",
  rateLimit: { limit: 120, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    return { progress: await loadProgress(db, user.id, input.tool) };
  },
});

export const POST = defineEndpoint(saveDrillProgress, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const stored = await loadProgress(db, user.id, input.tool);
    await storeProgress(db, user.id, input.tool, mergeProgress(stored, input.progress));
    return { ok: true as const };
  },
});
