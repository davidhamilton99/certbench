import { defineEndpoint } from "@/server/api/define-endpoint";
import { createPortal } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { getStripe } from "@/server/stripe";
import { publicEnv } from "@/env";

export const POST = defineEndpoint(createPortal, {
  auth: "user",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ user, db }) => {
    if (!user) throw new ApiError("unauthorized");

    const { data: sub } = await db
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!sub?.stripe_customer_id)
      throw new ApiError("not_found", "No billing account found");

    const session = await getStripe().billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${publicEnv.NEXT_PUBLIC_APP_URL}/dashboard`,
    });
    return { url: session.url };
  },
});
