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
