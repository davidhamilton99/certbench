import "server-only";

import Stripe from "stripe";
import { serverEnv } from "@/env";

// Lazy-initialize Stripe so builds don't require the secret key.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  _stripe ??= new Stripe(serverEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
  return _stripe;
}

/**
 * Whether a customer already pays for a plan. Stripe has the subscription the
 * moment checkout completes, before our webhook records it, so this is what
 * stops a second purchase from another tab, or from an offer seen while the
 * webhook is still in flight.
 */
export async function hasLiveSubscription(
  stripe: Pick<Stripe, "subscriptions">,
  customerId: string
): Promise<boolean> {
  // Without a status filter, Stripe lists every subscription that isn't canceled.
  const { data } = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
  return data.some((s) => s.status === "active" || s.status === "trialing");
}
