import { defineEndpoint } from "@/server/api/define-endpoint";
import { createCheckout, type BillingInterval } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { expireOpenCheckouts, getStripe, subscriptionStanding } from "@/server/stripe";
import { rateLimiter } from "@/server/rate-limit";
import { createAdminClient } from "@/server/supabase/admin";
import { visitMetadata } from "@/server/purchase-visit";
import { pppForCountry } from "@/lib/pricing/ppp";
import { afterCheckoutPath } from "@/lib/billing/after-checkout";
import {
  ALREADY_PRO,
  BILLING_PERIOD_UNAVAILABLE,
  PAYMENT_DUE,
  PAYMENT_PAGE_FAILED,
  PAYMENT_PAGE_LIMIT,
} from "@/lib/billing/messages";
import { publicEnv, serverEnv } from "@/env";

/** Stripe lookup keys, created by scripts/setup-stripe-prices.mjs. */
const LOOKUP_KEYS: Record<BillingInterval, string> = {
  monthly: "certbench_pro_monthly",
  quarterly: "certbench_pro_quarterly",
  annual: "certbench_pro_annual",
};

/**
 * The Stripe price id for each interval, kept for the life of this server
 * instance. An id changes only when the owner replaces a price in Stripe, so
 * asking Stripe for it on every checkout only made the button slower.
 */
const priceIds = new Map<BillingInterval, string>();

/**
 * Resolve the Stripe price for an interval by lookup key. Monthly falls
 * back to STRIPE_PRO_PRICE_ID so checkout keeps working in environments
 * where the new prices haven't been created yet.
 */
async function resolvePriceId(interval: BillingInterval): Promise<string> {
  const held = priceIds.get(interval);
  if (held) return held;

  const { data } = await getStripe().prices.list({
    lookup_keys: [LOOKUP_KEYS[interval]],
    active: true,
    limit: 1,
  });
  if (data[0]) {
    priceIds.set(interval, data[0].id);
    return data[0].id;
  }
  // The fallback is not kept: once the price exists under its lookup key, the
  // next checkout should find it.
  if (interval === "monthly") return serverEnv("STRIPE_PRO_PRICE_ID");
  // Not "internal", so that the visitor reads this sentence and its way out.
  throw new ApiError("not_found", BILLING_PERIOD_UNAVAILABLE);
}

/** Five payment pages an hour for each account. */
const LIMIT = { limit: 5, windowSeconds: 3600 };

export const POST = defineEndpoint(createCheckout, {
  auth: "user",
  handler: async ({ input, user, request }) => {
    if (!user) throw new ApiError("unauthorized");

    // Counted here, under the key the endpoint factory would use, and not by
    // the factory: its refusal is a bare code, and a buyer who is turned away
    // has to be told what happened and what to do.
    if (!(await rateLimiter.check(`${createCheckout.path}:${user.id}`, LIMIT))) {
      throw new ApiError("rate_limited", PAYMENT_PAGE_LIMIT);
    }

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
    const { data: sub, error: subError } = await adminDb
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subError) {
      // Going on without the row would treat a paying member as a new buyer:
      // a second Stripe customer, no check for a running plan, and the row
      // reset to free.
      console.error("[checkout] subscription row not read:", subError.message);
      throw new ApiError("internal", PAYMENT_PAGE_FAILED);
    }

    let customerId = sub?.stripe_customer_id;
    // One plan per customer: a second click must not start a second
    // subscription, and a plan whose payment failed is put right in the
    // billing portal, not by buying another.
    if (customerId) {
      const stripe = getStripe();
      // An earlier payment page that is still open (the Back button, a second
      // tab) could be paid as well as the new one, and that would start two
      // subscriptions. Every open page is expired first and the standing is
      // read after that, so that a page paid a moment earlier has its
      // subscription in what is read: such a page refuses to expire, and the
      // buyer is answered as a member who has Pro. If a page could not be
      // expired for any other reason, no new page is made either.
      let pagesExpired = true;
      try {
        await expireOpenCheckouts(stripe, customerId);
      } catch (err) {
        console.error("[checkout] an open payment page was not expired:", err);
        pagesExpired = false;
      }
      const standing = await subscriptionStanding(stripe, customerId);
      if (standing === "paid") throw new ApiError("conflict", ALREADY_PRO);
      if (standing === "payment_due") throw new ApiError("conflict", PAYMENT_DUE);
      if (!pagesExpired) throw new ApiError("internal", PAYMENT_PAGE_FAILED);
    }
    if (!customerId) {
      const customer = await getStripe().customers.create(
        {
          email: user.email,
          metadata: { supabase_user_id: user.id },
        },
        { idempotencyKey: `create-customer-${user.id}` }
      );
      customerId = customer.id;

      const { error: saveError } = await adminDb.from("user_subscriptions").upsert(
        {
          user_id: user.id,
          stripe_customer_id: customerId,
          plan: "free",
          status: "active",
        },
        { onConflict: "user_id" }
      );
      if (saveError) {
        // The buyer can still pay: the webhook writes this customer id with
        // the subscription. Stopping here would lose a sale to a passing fault.
        console.error("[checkout] customer id not saved:", saveError.message);
      }
    }

    const origin = publicEnv.NEXT_PUBLIC_APP_URL;
    // The browser this page is opened from, kept on the page and on the plan
    // it starts, so that the webhook can record the purchase on this visit.
    const visit = visitMetadata(input.analytics, request.headers.get("user-agent"));
    const page = {
      customer: customerId,
      mode: "subscription" as const,
      // Backing out of an offer returns to that offer, not the app.
      cancel_url: `${origin}/${input.returnTo}`,
      // Paying lands on the path itself, which waits for the activation webhook
      // and opens with the unlock moment. Never the workspace.
      success_url: `${origin}${afterCheckoutPath(input.returnTo)}`,
      metadata: { supabase_user_id: user.id, ...visit },
      ...(Object.keys(visit).length > 0 ? { subscription_data: { metadata: visit } } : {}),
    };
    let session;
    try {
      try {
        session = await getStripe().checkout.sessions.create({
          ...page,
          line_items: [{ price: await resolvePriceId(input.interval), quantity: 1 }],
          discounts,
        });
      } catch (err) {
        // A missing/expired PPP coupon must not block checkout — retry at full price.
        if (discounts && err instanceof Error && /coupon/i.test(err.message)) {
          console.error("PPP coupon rejected, falling back to full price:", err.message);
          session = await getStripe().checkout.sessions.create({
            ...page,
            line_items: [{ price: await resolvePriceId(input.interval), quantity: 1 }],
          });
        } else {
          throw err;
        }
      }
    } finally {
      // A price that was replaced in Stripe would fail every checkout for as
      // long as this instance lives. After a failure, ask for the id again.
      if (!session) priceIds.delete(input.interval);
    }

    if (!session.url) throw new ApiError("internal", PAYMENT_PAGE_FAILED);
    return { url: session.url };
  },
});
