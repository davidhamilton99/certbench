import { z } from "zod";
import type { EndpointContract } from "./common";

/** Start a Stripe Checkout session for the Pro plan. */
export const createCheckout = {
  path: "/api/stripe/checkout",
  method: "POST",
  input: z.object({}),
  output: z.object({ url: z.string() }),
} as const satisfies EndpointContract;

/** Open the Stripe customer portal (manage/cancel subscription). */
export const createPortal = {
  path: "/api/stripe/portal",
  method: "POST",
  input: z.object({}),
  output: z.object({ url: z.string() }),
} as const satisfies EndpointContract;
