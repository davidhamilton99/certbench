import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/server/stripe";
import { createAdminClient } from "@/server/supabase/admin";
import { captureServerEvent } from "@/server/analytics";
import { afterResponse } from "@/server/api/after-response";
import { reportServerError, type ErrorPlace } from "@/server/api/report-error";
import { serverEnv } from "@/env";

/** This handler, as an error report names it. */
const WEBHOOK: ErrorPlace = { route: "/api/stripe/webhook", method: "POST", kind: "route" };

/** What stopped an event from being recorded. */
interface Failure {
  /** Which step, in plain words, for the log. */
  step: string;
  message: string;
  code: string | null;
}

function failure(step: string, error: { message: string; code?: string }): Failure {
  return { step, message: error.message, code: error.code || null };
}

/**
 * Sends an analytics event once the answer to Stripe has gone (Next's
 * `after()`), so that a slow analytics call can never hold the
 * acknowledgement back. Scheduling it is never what fails a webhook.
 */
function captureAfterResponse(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  afterResponse(() => captureServerEvent(distinctId, event, properties));
}

/**
 * Stripe webhook. The event-sync logic was ported near-verbatim from the
 * previous app (same URL path; the live endpoint configuration doesn't
 * change). Raw-body signature verification, so this is the second documented
 * exception to the defineEndpoint factory.
 *
 * A 200 tells Stripe that the event has been recorded, and Stripe then never
 * sends it again. So every database call is checked, and when one fails the
 * answer is 500: Stripe delivers the event again, with a growing delay, for
 * up to three days. The same holds when a step throws (Stripe does not answer
 * when asked for the subscription, say). Every write here is an upsert or an
 * update, so recording the same event twice is safe.
 *
 * Two rules keep a late or stray event from changing what a member has:
 *
 *  1. A row is changed only by events about the subscription it holds. Stripe
 *     can hold more than one subscription for a customer (a first attempt whose
 *     payment was never completed, beside the plan that was then paid for). The
 *     unfinished one expires about a day later, and that event must not end
 *     the paid plan. A row that holds no subscription yet accepts any.
 *  2. A completed checkout grants Pro only while its subscription is alive.
 *     Stripe may deliver the event again days later, after a failed write; by
 *     then the buyer may have canceled, and the retry must not bring Pro back.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      serverEnv("STRIPE_WEBHOOK_SECRET")
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let failed: Failure | null;
  let thrown: unknown;
  try {
    failed = await record(event);
  } catch (err) {
    // Not an answer from the database: a step threw. The event is unrecorded
    // all the same, and it is logged and reported like any other failure.
    thrown = err;
    failed = {
      step: "event handling",
      message: err instanceof Error ? err.message : String(err),
      code: null,
    };
  }
  if (failed) {
    console.error(
      `[stripe webhook] ${failed.step} failed for event ${event.id} (${event.type}):`,
      failed.message
    );
    // On the job, not on a person, as the daily email run reports its failures.
    captureAfterResponse("system:stripe-webhook", "stripe_webhook_failed", {
      event_id: event.id,
      event_type: event.type,
      step: failed.step,
      code: failed.code,
    });
    // And as a `server_error`, the one event every fault on the server is filed
    // under, so that a single alert covers this handler too. That event names
    // the route only; the step is in `stripe_webhook_failed` above, and the
    // database's own words stay in the log.
    const fault = thrown ?? new Error(`Stripe webhook: ${failed.step} failed`);
    afterResponse(() => reportServerError(fault, WEBHOOK));
    return NextResponse.json({ error: "The event could not be recorded" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/** The row for a Stripe customer: whose it is and which subscription it holds. */
interface CustomerRow {
  user_id: string;
  stripe_subscription_id: string | null;
}

/** A subscription in one of these states has ended and gives nobody Pro. */
const ENDED: ReadonlySet<string> = new Set(["canceled", "incomplete_expired"]);

/**
 * Whether an event about `subscriptionId` concerns the subscription a row
 * holds. A row that holds none (a checkout not yet confirmed, or a plan that
 * has ended) accepts any, and so does an event that names none.
 */
function concerns(row: CustomerRow, subscriptionId: string | null | undefined): boolean {
  return !row.stripe_subscription_id || !subscriptionId || row.stripe_subscription_id === subscriptionId;
}

/** The subscription an invoice belongs to, in the older and the newer shape of Stripe's API. */
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const loose = invoice as unknown as {
    subscription?: string | { id?: string } | null;
    parent?: { subscription_details?: { subscription?: string | { id?: string } | null } | null } | null;
  };
  const value = loose.subscription ?? loose.parent?.subscription_details?.subscription ?? null;
  if (!value) return null;
  return typeof value === "string" ? value : (value.id ?? null);
}

/**
 * Writes what an event means to the database. Returns the first database
 * call that failed, or null once everything the event asks for is recorded
 * (which includes an event that asks for nothing).
 */
async function record(event: Stripe.Event): Promise<Failure | null> {
  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) return null;

      // One-time cert add-on (mode=payment): grant/reactivate the enrollment
      // in the purchased cert. Access still requires active Pro, so this just
      // adds the cert to the user's plan. Upsert is idempotent on retries.
      if (session.metadata?.kind === "cert_addon") {
        const certId = session.metadata.cert_id;
        if (!certId) return null;

        const { error } = await supabase.from("user_enrollments").upsert(
          { user_id: userId, certification_id: certId, is_active: true },
          { onConflict: "user_id,certification_id" }
        );
        if (error) return failure("cert add-on enrollment", error);

        captureAfterResponse(userId, "cert_added", {
          certification_id: certId,
        });
        return null;
      }

      if (!session.subscription) return null;

      const subscription = await getStripe().subscriptions.retrieve(
        session.subscription as string
      );

      // The subscription as it stands now, not as it stood when the event was
      // first sent: one that has ended since (this is a late redelivery) grants
      // nothing, and no conversion is reported for it.
      if (ENDED.has(subscription.status)) return null;

      // Handle both old and new Stripe API versions
      const periodEnd =
        (subscription as unknown as Record<string, number>).current_period_end ??
        subscription.items?.data?.[0]?.current_period_end;

      const { error } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan: "pro",
          status: "active",
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        },
        { onConflict: "user_id" }
      );
      if (error) return failure("subscription upsert", error);

      // The conversion event, fired server-side (reliable source of truth,
      // unlike a success-redirect the user may never reach) and only once the
      // row is written: a conversion is a buyer who has Pro. distinct_id is the
      // Supabase user id, so it joins the funnel this person built in-browser.
      captureAfterResponse(userId, "subscription_activated", {
        stripe_subscription_id: subscription.id,
        plan: "pro",
      });
      return null;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      // maybeSingle, so that "no such customer here" (nothing to do) can be
      // told apart from a read that failed (Stripe must send the event again).
      const { data: sub, error: readError } = await supabase
        .from("user_subscriptions")
        .select("user_id, stripe_subscription_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (readError) return failure("subscription lookup", readError);

      if (!sub) return null;
      // About another subscription of the same customer: not this row's business.
      if (!concerns(sub as CustomerRow, subscription.id)) return null;

      const isActive =
        subscription.status === "active" || subscription.status === "trialing";

      const periodEnd =
        (subscription as unknown as Record<string, number>).current_period_end ??
        subscription.items?.data?.[0]?.current_period_end;

      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          plan: isActive ? "pro" : "free",
          status:
            subscription.status === "active"
              ? "active"
              : subscription.status === "trialing"
                ? "trialing"
                : subscription.status === "past_due"
                  ? "past_due"
                  : "canceled",
          current_period_end: periodEnd
            ? new Date(periodEnd * 1000).toISOString()
            : null,
        })
        .eq("stripe_customer_id", customerId);
      if (error) return failure("subscription update", error);
      return null;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data: sub, error: readError } = await supabase
        .from("user_subscriptions")
        .select("user_id, stripe_subscription_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (readError) return failure("subscription lookup", readError);

      if (!sub) return null;
      // The end of a subscription the row does not hold (an unfinished first
      // attempt that has expired, say) does not end the plan it does hold.
      if (!concerns(sub as CustomerRow, subscription.id)) return null;

      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          plan: "free",
          status: "canceled",
          stripe_subscription_id: null,
        })
        .eq("stripe_customer_id", customerId);
      if (error) return failure("subscription cancellation", error);
      return null;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: sub, error: readError } = await supabase
        .from("user_subscriptions")
        .select("user_id, stripe_subscription_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (readError) return failure("subscription lookup", readError);

      // A payment is "past due" only for a plan the row holds. A first payment
      // that failed before any plan was recorded leaves nothing to keep, and an
      // invoice for another subscription is not this row's business.
      if (!sub || !(sub as CustomerRow).stripe_subscription_id) return null;
      if (!concerns(sub as CustomerRow, invoiceSubscriptionId(invoice))) return null;

      // Mark the subscription as past due so the app can show a billing warning.
      const { error } = await supabase
        .from("user_subscriptions")
        .update({ status: "past_due" })
        .eq("stripe_customer_id", customerId);
      if (error) return failure("past-due mark", error);
      return null;
    }
  }

  return null;
}
