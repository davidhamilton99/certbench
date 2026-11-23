import { defineEndpoint } from "@/server/api/define-endpoint";
import { getPathLab } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { certIdFor } from "@/server/path/cert-id";
import { getPathAccess } from "@/server/path/access";
import { pbqRegistry } from "@/data/pbq";

/**
 * One lab from an exam's library. Pro on this exam only: gated here, at the
 * data, like the labs that close each domain. The labs are in the code, so
 * the only thing read is the account's access to this exam.
 */
export const POST = defineEndpoint(getPathLab, {
  auth: "user",
  rateLimit: { limit: 240, windowSeconds: 3600 },
  handler: async ({ input, user, db }) => {
    if (!user) throw new ApiError("unauthorized");
    const certId = await certIdFor(input.cert);
    if (!certId) throw new ApiError("not_found", "That exam is not available.");

    const { level } = await getPathAccess(db, user, certId);
    if (level !== "pro") throw new ApiError("quota_exceeded", "The hands-on labs on your study path are included with Pro.");

    const lab = pbqRegistry[input.cert]?.find((s) => s.id === input.id);
    if (!lab) throw new ApiError("not_found", "That lab is not available.");
    return { lab };
  },
});
