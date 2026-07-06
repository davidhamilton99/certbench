import { z } from "zod";
import type { EndpointContract } from "./common";

/** Pro billing intervals; prices resolve via Stripe lookup keys. */
export const BILLING_INTERVALS = ["monthly", "quarterly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** Start a Stripe Checkout session for the Pro plan. */
export const createCheckout = {
  path: "/api/stripe/checkout",
  method: "POST",
  input: z.object({
    interval: z.enum(BILLING_INTERVALS).default("monthly"),
  }),
  output: z.object({ url: z.string() }),
} as const satisfies EndpointContract;

/** Open the Stripe customer portal (manage/cancel subscription). */
export const createPortal = {
  path: "/api/stripe/portal",
  method: "POST",
  input: z.object({}),
  output: z.object({ url: z.string() }),
} as const satisfies EndpointContract;

const intervalPrice = z.object({
  original: z.string(),
  discounted: z.string(),
});

/**
 * Region-adjusted display pricing (purchasing-power parity). DISPLAY ONLY —
 * the checkout endpoint re-derives the real discount from the request IP,
 * so this response can never be used to obtain a discount fraudulently.
 */
export const getRegionPricing = {
  path: "/api/pricing/region",
  method: "GET",
  input: z.object({
    /** Dev/test override; ignored in production (real geo header wins). */
    country: z.string().length(2).optional(),
  }),
  output: z.object({
    discountPercent: z.number().nullable(),
    prices: z.object({
      monthly: intervalPrice,
      quarterly: intervalPrice,
      annual: intervalPrice,
    }),
  }),
} as const satisfies EndpointContract;
