import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-02-25.clover",
  typescript: true,
});

// Stripe Price ID for the Pro plan — set in environment variables
export const PRO_PRICE_ID = process.env.STRIPE_PRO_PRICE_ID!;

// Free tier limits
export const FREE_GENERATION_LIMIT = 3;
