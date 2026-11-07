import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathRehearsal } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { loadPathBank } from "@/server/path/bank";
import { buildRehearsal } from "@/server/path/rehearsal";
import { getPathAccess } from "@/server/path/access";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import { seedFrom } from "@/core/path/compose";

/**
 * An exam rehearsal, drawn fresh. Pro on this exam only: gated here, at the
 * data, like every stop past the checkpoint.
 */
export const POST = defineEndpoint(getPathRehearsal, {
  auth: "user",
  rateLimit: { limit: 30, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const bank = await loadPathBank(input.cert);
    if (!bank) throw new ApiError("not_found", "That exam isn't available.");

    const { level } = await getPathAccess(db, user, bank.certId);
    if (level !== "pro") throw new ApiError("quota_exceeded", "Exam rehearsals are part of Pro.");

    const reps = buildRehearsal({
      bank,
      size: input.size,
      seen: input.seen,
      seed: seedFrom(user.id, input.cert, "rehearsal", input.run),
    });
    if (reps.length === 0) throw new ApiError("not_found", "No questions are available for this exam yet.");
    return { reps, minutes: REHEARSAL_FORMATS[input.size].minutes };
  },
});
