import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathStop } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { loadPathBank } from "@/server/path/bank";
import { buildStop } from "@/server/path/build-stop";
import { getPathAccess } from "@/server/path/access";
import { buildPlan, isFreeStop } from "@/core/path/plan";
import { seedFrom } from "@/core/path/compose";

/**
 * One stop of a guided path. The warm-up is open to anyone; later stops need
 * an account, and stops past the readiness checkpoint need Pro on this exam.
 * Gated here, at the data, not just in the page.
 */
export const POST = defineEndpoint(getPathStop, {
  auth: "public",
  rateLimit: { limit: 600, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    const bank = await loadPathBank(input.cert);
    if (!bank) throw new ApiError("not_found", "That exam isn't available.");
    const plan = buildPlan(bank.structure);

    if (input.index > 0) {
      if (!user) throw new ApiError("unauthorized", "Save your progress with a free account to keep going.");
      if (!isFreeStop(plan, input.index)) {
        const { level } = await getPathAccess(db, user, bank.certId);
        if (level !== "pro") throw new ApiError("quota_exceeded", "The rest of the path is part of Pro.");
      }
    }

    const built = buildStop({
      bank,
      plan,
      index: input.index,
      seen: input.seen,
      missed: input.missed,
      seed: seedFrom(user?.id ?? "visitor", input.cert, input.index, input.run),
    });
    if (!built) throw new ApiError("not_found", "That stop doesn't exist.");
    return built;
  },
});
