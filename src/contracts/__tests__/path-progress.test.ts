import { describe, expect, it } from "vitest";
import { getPathProgress } from "../path";
import { EMPTY_PATH_PROGRESS } from "@/core/path/types";

/** An answer from GET /api/path/progress, as the route sends it. */
const answer = {
  progress: EMPTY_PATH_PROGRESS,
  stored: true,
  access: "free",
  proPlan: false,
  certId: "cert-1",
  pricing: {
    discountPercent: 40,
    prices: {
      monthly: { original: "$19", discounted: "$11.40" },
      quarterly: { original: "$39", discounted: "$23.40" },
      annual: { original: "$99", discounted: "$59.40" },
    },
  },
};

// The route sends the offer's regional prices with the progress (CB-15), so
// the offer on the study path shows them at once. The browser reads the answer
// through this contract, which kept only what it listed: the prices were
// dropped, and the offer asked for them again.
describe("the study path's account answer", () => {
  it("keeps the offer's regional prices when the browser reads it", () => {
    expect(getPathProgress.output.parse(answer).pricing).toEqual(answer.pricing);
  });

  it("is read without prices from a server that sends none", () => {
    const without: Record<string, unknown> = { ...answer };
    delete without.pricing;
    expect(getPathProgress.output.parse(without).pricing).toBeUndefined();
  });

  it("refuses prices that are not in the shape the offer reads", () => {
    expect(getPathProgress.output.safeParse({ ...answer, pricing: { discountPercent: 40 } }).success).toBe(false);
  });
});
