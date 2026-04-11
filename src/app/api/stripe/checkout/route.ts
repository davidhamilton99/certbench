import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { getStripe, PRO_PRICE_ID } from "@/lib/stripe/config";
import { withErrorHandler } from "@/lib/api/errors";
import { rateLimit } from "@/lib/rate-limit";

function getAdminSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function handler() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { limited } = rateLimit(`checkout:${user.id}`, 5, 3_600_000);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  const adminDb = getAdminSupabase();

  // Check if user already has a Stripe customer ID
  const { data: sub } = await adminDb
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = sub?.stripe_customer_id;

  // Create Stripe customer if needed
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

  const origin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=true`,
    cancel_url: `${origin}/upgrade`,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}

export const POST = withErrorHandler(handler as Parameters<typeof withErrorHandler>[0]);
