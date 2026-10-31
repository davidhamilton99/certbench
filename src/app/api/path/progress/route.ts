import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathProgress, savePathProgress } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import {
  getPathProgress as loadProgress,
  savePathProgress as storeProgress,
} from "@/server/data/path-progress";
import { mergePathProgress, sanitizePathProgress } from "@/core/path/progress";

/**
 * Saved progress on a guided path. Any signed-in user — the free stretch of
 * the path is free with an account, so this is deliberately NOT behind Pro.
 * Rows are scoped to the caller by RLS as well as by the user id here.
 */
export const GET = defineEndpoint(getPathProgress, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    return loadProgress(db, user.id, input.cert);
  },
});

export const POST = defineEndpoint(savePathProgress, {
  auth: "user",
  rateLimit: { limit: 480, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const { progress: stored, stored: available } = await loadProgress(db, user.id, input.cert);
    if (!available) return { ok: true as const, stored: false };
    const merged = mergePathProgress(stored, sanitizePathProgress(input.progress));
    return { ok: true as const, stored: await storeProgress(db, user.id, input.cert, merged) };
  },
});
