import { defineEndpoint } from "@/server/api/define-endpoint";
import { createPortal } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { getStripe } from "@/server/stripe";
import { rateLimiter } from "@/server/rate-limit";
import {
  BILLING_PAGE_FAILED,
  BILLING_PAGE_LIMIT,
  NO_BILLING_RECORD,
} from "@/lib/billing/messages";
import { publicEnv } from "@/env";

/** Five billing pages an hour for each account. */
const LIMIT = { limit: 5, windowSeconds: 3600 };

/**
 * Opens Stripe's billing portal: the card form, the invoices and the cancel
 * button. It serves every signed-in account that has a Stripe customer,
 * whatever its plan. A member whose renewal failed is not Pro at that moment,
 * and the portal is the only place where the card can be put right.
 */
export const POST = defineEndpoint(createPortal, {
  auth: "user",
  handler: async ({ user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    // Counted here, under the key the endpoint factory would use, and not by
    // the factory: its refusal is a bare code, where a member needs a sentence.
    if (!(await rateLimiter.check(`${createPortal.path}:${user.id}`, LIMIT))) {
      throw new ApiError("rate_limited", BILLING_PAGE_LIMIT);
    }

    const { data: sub, error } = await db
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) {
      // A read that failed is not the same as an account without billing.
      console.error("[portal] subscription row not read:", error.message);
      throw new ApiError("internal", BILLING_PAGE_FAILED);
    }
    if (!sub?.stripe_customer_id) throw new ApiError("not_found", NO_BILLING_RECORD);

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      // Back to the plan and billing page the portal was opened from. That
      // page is open to every account; the workspace is open to Pro only, so
      // a member who came to repair a payment would be turned away from it.
      return_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/upgrade`,
    });
    return { url: session.url };
  },
});
