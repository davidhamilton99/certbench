import { defineEndpoint } from "@/server/api/define-endpoint";
import { getRegionPricing } from "@/contracts/billing";
import { regionPricing } from "@/lib/pricing/ppp";

/**
 * Region-adjusted display pricing. Public, keyed off the Vercel edge geo
 * header (`x-vercel-ip-country`). The optional `country` input is honoured
 * only outside production so the pricing UI can be tested locally; in
 * production the real header always wins. Either way this is display-only —
 * the checkout route re-derives the coupon from the request IP.
 */
export const GET = defineEndpoint(getRegionPricing, {
  auth: "public",
  handler: async ({ input, request }) => {
    const headerCountry = request.headers.get("x-vercel-ip-country");
    const country =
      headerCountry ??
      (process.env.NODE_ENV !== "production" ? input.country ?? null : null);
    return regionPricing(country);
  },
});
