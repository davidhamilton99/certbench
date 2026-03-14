import Stripe from "stripe";

// Lazy-initialize Stripe to avoid build-time errors when env vars aren't set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-02-25.clover",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() instead */
export const stripe = undefined as unknown as Stripe;

// Stripe Price ID for the Pro plan — set in environment variables
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!;

// Free tier limits
export const FREE_GENERATION_LIMIT = 3;
