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
