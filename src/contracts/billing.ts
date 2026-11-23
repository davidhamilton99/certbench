import { z } from "zod";
import type { EndpointContract } from "./common";

/** Pro billing intervals; prices resolve via Stripe lookup keys. */
export const BILLING_INTERVALS = ["monthly", "quarterly", "annual"] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

/** A PostHog id as posthog-js makes them (a UUID) or as the app identifies with (a user id). */
const posthogId = z.string().regex(/^[\w-]{1,128}$/);

/**
 * The browser's PostHog ids, sent with a request to open a payment page: the
 * id it records events under, and the session it is in. The payment is
 * recorded by the server once Stripe reports it, after this page has gone,
 * and these let that record join this visit and this person.
 *
 * They are never a reason to refuse a payment: an id that is missing or not
 * an id is dropped, and the page opens all the same.
 */
const checkoutAnalytics = z
  .object({
    distinctId: posthogId.optional().catch(undefined),
    sessionId: posthogId.optional().catch(undefined),
  })
  .optional()
  .catch(undefined);
export type CheckoutAnalytics = z.output<typeof checkoutAnalytics>;

/** Start a Stripe Checkout session for the Pro plan. */
export const createCheckout = {
  path: "/api/stripe/checkout",
  method: "POST",
  input: z.object({
    interval: z.enum(BILLING_INTERVALS).default("monthly"),
    /**
     * Where Stripe's back link returns a buyer who doesn't finish checkout. A
     * study path ("path/<exam>") also gets the buyer back there after paying;
     * from anywhere else, paying lands on /start, which opens their path.
     */
    returnTo: z
      .union([z.enum(["upgrade", "onboarding", "pricing"]), z.string().regex(/^path\/[a-z0-9-]{3,48}$/)])
      .default("upgrade"),
    analytics: checkoutAnalytics,
  }),
  output: z.object({ url: z.string() }),
} as const satisfies EndpointContract;

/**
 * Start a one-time Stripe Checkout to add a certification to an active Pro
 * plan. Access still requires active Pro (the paywall) + enrollment, so this
 * is a one-time "unlock this cert on your account" fee, not a second plan.
 */
export const addCertCheckout = {
  path: "/api/stripe/cert-checkout",
  method: "POST",
  input: z.object({
    certId: z.uuid(),
    analytics: checkoutAnalytics,
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
