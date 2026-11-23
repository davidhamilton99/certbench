import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathProgress, savePathProgress } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import {
  getPathProgress as loadProgress,
  savePathProgress as storeProgress,
} from "@/server/data/path-progress";
import { mergePathProgress, sanitizePathProgress } from "@/core/path/progress";
import { certIdFor } from "@/server/path/cert-id";
import { getPathAccess } from "@/server/path/access";

/**
 * Saved progress on a study path. Any signed-in user: the free stretch of
 * the path is free with an account, so this is deliberately NOT behind Pro.
 * Rows are scoped to the caller by RLS as well as by the user id here.
 *
 * This is the request a returning learner's screen waits for, so it reads
 * only what it answers with: the saved progress and the account's access,
 * both started at once. It needs the exam's id and not its questions.
 */
export const GET = defineEndpoint(getPathProgress, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const [saved, account] = await Promise.all([
      loadProgress(db, user.id, input.cert),
      certIdFor(input.cert).then(async (certId) =>
        certId ? { certId, access: await getPathAccess(db, user, certId) } : null
      ),
    ]);
    if (!account) throw new ApiError("not_found", "That exam is not available.");
    return {
      ...saved,
      access: account.access.level === "pro" ? ("pro" as const) : ("free" as const),
      proPlan: account.access.proPlan,
      certId: account.certId,
    };
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
