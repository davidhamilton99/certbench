import { defineEndpoint } from "@/server/api/define-endpoint";
import { createCheckout, type BillingInterval } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { getStripe } from "@/server/stripe";
import { createAdminClient } from "@/server/supabase/admin";
import { pppForCountry } from "@/lib/pricing/ppp";
import { publicEnv, serverEnv } from "@/env";

/** Stripe lookup keys, created by scripts/setup-stripe-prices.mjs. */
const LOOKUP_KEYS: Record<BillingInterval, string> = {
  monthly: "certbench_pro_monthly",
  quarterly: "certbench_pro_quarterly",
  annual: "certbench_pro_annual",
};

/**
 * Resolve the Stripe price for an interval by lookup key. Monthly falls
 * back to STRIPE_PRO_PRICE_ID so checkout keeps working in environments
 * where the new prices haven't been created yet.
 */
async function resolvePriceId(interval: BillingInterval): Promise<string> {
  const { data } = await getStripe().prices.list({
    lookup_keys: [LOOKUP_KEYS[interval]],
    active: true,
    limit: 1,
  });
  if (data[0]) return data[0].id;
  if (interval === "monthly") return serverEnv("STRIPE_PRO_PRICE_ID");
  throw new ApiError(
    "internal",
    "That billing option isn't available yet — try monthly, or contact support."
  );
}

export const POST = defineEndpoint(createCheckout, {
  auth: "user",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ input, user, request }) => {
    if (!user) throw new ApiError("unauthorized");

    // Purchasing-power discount, derived from the REAL request IP country —
    // never from client input — so the coupon can't be spoofed. Coupons are
    // created by scripts/setup-stripe-coupons.mjs; if one is missing (not yet
    // set up) checkout still proceeds at full price.
    const pppTier = pppForCountry(request.headers.get("x-vercel-ip-country"));
    const discounts = pppTier
      ? [{ coupon: pppTier.couponId }]
      : undefined;

    // The customer-id bootstrap writes through the admin client because the
    // RLS policy only allows users to read their subscription row.
    const adminDb = createAdminClient();
    const { data: sub } = await adminDb
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `create-customer-${user.id}` }
      );
      customerId = customer.id;

      await adminDb.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "active",
        },
        { onConflict: "user_id" }
      );
    }

    const origin = publicEnv.NEXT_PUBLIC_APP_URL;
    let session;
    try {
      session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: await resolvePriceId(input.interval), quantity: 1 }],
        discounts,
        success_url: `${origin}/dashboard?upgraded=true`,
        cancel_url: `${origin}/upgrade`,
        metadata: { supabase_user_id: user.id },
      });
    } catch (err) {
      // A missing/expired PPP coupon must not block checkout — retry at full price.
      if (discounts && err instanceof Error && /coupon/i.test(err.message)) {
        console.error("PPP coupon rejected, falling back to full price:", err.message);
        session = await getStripe().checkout.sessions.create({
          customer: customerId,
          mode: "subscription",
          line_items: [{ price: await resolvePriceId(input.interval), quantity: 1 }],
          success_url: `${origin}/dashboard?upgraded=true`,
          cancel_url: `${origin}/upgrade`,
          metadata: { supabase_user_id: user.id },
        });
      } else {
        throw err;
      }
    }

    if (!session.url) throw new ApiError("internal", "Stripe returned no URL");
    return { url: session.url };
  },
});
