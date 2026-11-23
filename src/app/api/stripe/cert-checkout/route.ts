import { defineEndpoint } from "@/server/api/define-endpoint";
import { addCertCheckout } from "@/contracts/billing";
import { ApiError } from "@/contracts/common";
import { getStripe } from "@/server/stripe";
import { rateLimiter } from "@/server/rate-limit";
import { createAdminClient } from "@/server/supabase/admin";
import { getCertification } from "@/server/data/certifications";
import { listEnrollments, otherVersionIds } from "@/server/data/enrollments";
import { BASE_PRICES_CENTS, pppForCountry } from "@/lib/pricing/ppp";
import {
  CERTIFICATION_IN_PLAN,
  CERTIFICATION_NOT_FOUND,
  PAYMENT_PAGE_FAILED,
  PAYMENT_PAGE_LIMIT,
} from "@/lib/billing/messages";
import { publicEnv } from "@/env";

/** Five payment pages an hour for each account. */
const LIMIT = { limit: 5, windowSeconds: 3600 };

/**
 * One-time checkout to add a certification to an active Pro plan. Access is
 * gated by active Pro (the paywall) AND enrollment, so this is a one-time
 * "unlock this cert on your account" fee — not a second subscription, which
 * would corrupt the single-row-per-user subscription model. The add-on cert
 * is priced at the quarterly ("one exam cycle") rate, PPP-adjusted like Pro.
 * The enrollment is granted by the Stripe webhook on payment completion.
 */
export const POST = defineEndpoint(addCertCheckout, {
  auth: "pro",
  handler: async ({ input, user, db, request }) => {
    if (!user) throw new ApiError("unauthorized");

    // Counted here, under the key the endpoint factory would use, and not by
    // the factory: its refusal is a bare code, and a buyer who is turned away
    // has to be told what happened and what to do.
    if (!(await rateLimiter.check(`${addCertCheckout.path}:${user.id}`, LIMIT))) {
      throw new ApiError("rate_limited", PAYMENT_PAGE_LIMIT);
    }

    const cert = await getCertification(db, input.certId);
    if (!cert) throw new ApiError("not_found", CERTIFICATION_NOT_FOUND);

    const enrollments = await listEnrollments(db, user.id);
    if (enrollments.some((e) => e.certificationId === cert.id)) {
      throw new ApiError("conflict", CERTIFICATION_IN_PLAN);
    }
    // Pro on one version of an exam covers its others: never charge for those.
    const versions = await otherVersionIds(db, cert.id);
    if (enrollments.some((e) => versions.includes(e.certificationId))) {
      throw new ApiError("conflict", `Your plan already covers ${cert.examCode}.`);
    }

    // PPP discount from the REAL request IP (never client input), same coupons
    // the Pro checkout uses — so the add-on price matches the displayed one.
    const pppTier = pppForCountry(request.headers.get("x-vercel-ip-country"));
    const discounts = pppTier ? [{ coupon: pppTier.couponId }] : undefined;

    // A Pro user already has a Stripe customer; read it, and self-heal if not.
    // Through the admin client: accounts may only read their subscription row.
    const adminDb = createAdminClient();
    const { data: sub, error: subError } = await adminDb
      .from("user_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subError) {
      // Going on without the row would make a second Stripe customer for a
      // member who has one.
      console.error("[cert checkout] subscription row not read:", subError.message);
      throw new ApiError("internal", PAYMENT_PAGE_FAILED);
    }
    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await getStripe().customers.create(
        { email: user.email, metadata: { supabase_user_id: user.id } },
        { idempotencyKey: `create-customer-${user.id}` }
      );
      customerId = customer.id;
      // Only the customer id — never touch plan/status on an existing row.
      const { error: saveError } = await adminDb
        .from("user_subscriptions")
        .upsert(
          { user_id: user.id, stripe_customer_id: customerId },
          { onConflict: "user_id" }
        );
      if (saveError) {
        // The payment does not depend on this row: the webhook adds the exam
        // from the session's own details.
        console.error("[cert checkout] customer id not saved:", saveError.message);
      }
    }

    const origin = publicEnv.NEXT_PUBLIC_APP_URL;
    const metadata = {
      supabase_user_id: user.id,
      cert_id: cert.id,
      kind: "cert_addon",
    };
    const lineItems = [
      {
        price_data: {
          currency: "usd",
          unit_amount: BASE_PRICES_CENTS.quarterly,
          product_data: { name: `CertBench: ${cert.name} (${cert.examCode})` },
        },
        quantity: 1,
      },
    ];

    let session;
    try {
      session = await getStripe().checkout.sessions.create({
        customer: customerId,
        mode: "payment",
        line_items: lineItems,
        discounts,
        success_url: `${origin}/upgrade?added=1`,
        cancel_url: `${origin}/upgrade`,
        metadata,
      });
    } catch (err) {
      // A missing/expired PPP coupon must not block checkout — retry full price.
      if (discounts && err instanceof Error && /coupon/i.test(err.message)) {
        console.error("PPP coupon rejected on add-on, full price:", err.message);
        session = await getStripe().checkout.sessions.create({
          customer: customerId,
          mode: "payment",
          line_items: lineItems,
          success_url: `${origin}/upgrade?added=1`,
          cancel_url: `${origin}/upgrade`,
          metadata,
        });
      } else {
        throw err;
      }
    }

    if (!session.url) throw new ApiError("internal", PAYMENT_PAGE_FAILED);
    return { url: session.url };
  },
});
