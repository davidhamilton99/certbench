import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathLab } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { loadPathBank } from "@/server/path/bank";
import { getPathAccess } from "@/server/path/access";
import { pbqRegistry } from "@/data/pbq";

/**
 * One lab from an exam's library. Pro on this exam only: gated here, at the
 * data, like the labs that close each domain.
 */
export const POST = defineEndpoint(getPathLab, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const bank = await loadPathBank(input.cert);
    if (!bank) throw new ApiError("not_found", "That exam isn't available.");

    const { level } = await getPathAccess(db, user, bank.certId);
    if (level !== "pro") throw new ApiError("quota_exceeded", "Hands-on labs are part of Pro.");

    const lab = pbqRegistry[input.cert]?.find((s) => s.id === input.id);
    if (!lab) throw new ApiError("not_found", "That lab isn't available.");
    return { lab };
  },
});
