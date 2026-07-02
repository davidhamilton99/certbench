import { defineEndpoint } from "@/server/api/define-endpoint";
import { createCheckout } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { getStripe } from "@/server/stripe";
import { createAdminClient } from "@/server/supabase/admin";
import { publicEnv, serverEnv } from "@/env";

export const POST = defineEndpoint(createCheckout, {
  auth: "user",
  rateLimit: { limit: 5, windowSeconds: 3600 },
  handler: async ({ user }) => {
    if (!user) throw new ApiError("unauthorized");

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
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: serverEnv("STRIPE_PRO_PRICE_ID"), quantity: 1 }],
      success_url: `${origin}/dashboard?upgraded=true`,
      cancel_url: `${origin}/upgrade`,
      metadata: { supabase_user_id: user.id },
    });

    if (!session.url) throw new ApiError("internal", "Stripe returned no URL");
    return { url: session.url };
  },
});
