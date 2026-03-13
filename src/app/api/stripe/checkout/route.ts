import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, PRO_PRICE_ID } from "@/lib/stripe/config";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a Stripe customer ID
  const { data: sub } = await supabase
    .from("user_subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId = sub?.stripe_customer_id;

  // Create Stripe customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;

    // Upsert subscription record with customer ID
    await supabase.from("user_subscriptions").upsert(
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

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: PRO_PRICE_ID, quantity: 1 }],
    success_url: `${origin}/dashboard?upgraded=true`,
    cancel_url: `${origin}/pricing`,
    metadata: { supabase_user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
