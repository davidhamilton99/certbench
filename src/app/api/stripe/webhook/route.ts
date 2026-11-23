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
 * Three rules keep a late or stray event from changing what a member has, and
 * a fourth says when a buyer is counted:
 *
 *  1. A row is changed only by events about the subscription it holds. Stripe
 *     can hold more than one subscription for a customer (a first attempt whose
 *     payment was never completed, beside the plan that was then paid for). The
 *     unfinished one expires about a day later, and that event must not end
 *     the paid plan. A row that holds no subscription yet accepts any, and it
 *     takes the subscription of the event that grants it Pro.
 *  2. A completed checkout writes its subscription as Stripe holds it now, by
 *     the mapping a change uses (standingOf): Pro while the subscription is
 *     active or in a trial, and otherwise its standing with no Pro. The event
 *     says only that the payment page was completed. Stripe may deliver it
 *     again days later, after a failed write, and it can be sent again by hand
 *     from the Dashboard; by then the payment may be past due or the buyer may
 *     have canceled, and the event must not bring Pro back. A first payment
 *     that is still pending grants nothing yet either: Pro arrives with the
 *     change that says it was paid. A subscription that has ended writes
 *     nothing. The conversion is reported only when Pro is granted.
 *  3. A change to a subscription, or a failed payment, is a reason to ask
 *     Stripe and not a fact to write. What those two events write is the
 *     subscription as Stripe holds it now, never the copy inside the event.
 *     Stripe does not deliver events in the order it made them, and it
 *     delivers one again for up to three days after a failure, so a copy can
 *     be older than what the row already says. Written as it stood, a copy
 *     that says "active" brought Pro back after the subscription had been
 *     deleted (the deletion clears the subscription from the row, and rule 1
 *     lets a row that holds none accept any), and a copy that says "past due"
 *     shut out a member who had since paid. Only the end of a subscription is
 *     taken from the event itself: an ended subscription cannot come back, so
 *     that copy cannot be out of date.
 *  4. The conversion (`subscription_activated`) is reported once, by whichever
 *     event grants Pro first: the checkout, or the change that follows a
 *     first payment that was still pending. It is reported only when the row
 *     did not have Pro before the write, so the second of a plan's two events,
 *     a checkout delivered again and a renewal paid after it fell past due
 *     (a payment recovered, not a new buyer) report nothing.
 *
 * An added exam, a one-time payment, is granted only when its money has
 * arrived: at once for a card, and for a delayed method (a bank debit) by
 * checkout.session.async_payment_succeeded, days later. That event reaches
 * this handler only if the endpoint is subscribed to it in the Stripe
 * Dashboard; until then an exam bought with a delayed method is not added,
 * where before it was added before the money arrived and never taken back.
 *
 * What rule 3 leaves open: two events for one customer handled at the same
 * moment each ask Stripe and then write, and the one that asked first can
 * write last. That takes a change of the subscription between two requests a
 * moment apart, and the next event puts the row right.
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

/** What a subscription means for the row: the three values every such write sets. */
interface Standing {
  plan: "free" | "pro";
  status: "active" | "trialing" | "past_due" | "canceled";
  current_period_end: string | null;
}

/**
 * The standing of a subscription as Stripe holds it: Pro only while it is
 * active or in a trial, and otherwise where it stands, with no Pro. The status
 * column knows four words, so a subscription that is neither running nor past
 * due (unpaid, incomplete, paused, ended) is written as "canceled". A
 * completed checkout and a change both write through this one mapping, so the
 * two can never disagree about the same subscription.
 */
function standingOf(subscription: Stripe.Subscription): Standing {
  const { status } = subscription;
  // Handle both old and new Stripe API versions
  const periodEnd =
    (subscription as unknown as Record<string, number>).current_period_end ??
    subscription.items?.data?.[0]?.current_period_end;
  return {
    plan: status === "active" || status === "trialing" ? "pro" : "free",
    status:
      status === "active" || status === "trialing" || status === "past_due" ? status : "canceled",
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  };
}

/** What a row held before an event's write: enough to tell a conversion from a repeat. */
interface PriorStanding {
  plan?: string | null;
  status?: string | null;
}

/**
 * Rule 4: whether a write is a conversion, which is reported once, as
 * `subscription_activated`, by whichever event grants it first. A conversion
 * is an account that did not have Pro and now has it. Not one:
 *  - an account that already had Pro (the second of a plan's two events, a
 *    checkout event that Stripe delivers again, or one sent again from the
 *    Dashboard);
 *  - a member whose renewal had failed and who has now paid it (past due back
 *    to active): that is a payment recovered, not a new buyer.
 */
function becomesPro(before: PriorStanding | null, after: Standing): boolean {
  if (after.plan !== "pro") return false;
  if (!before) return true;
  if (before.plan === "pro") return false;
  return before.status !== "past_due";
}

/**
 * Whether an event about `subscriptionId` concerns the subscription a row
 * holds. A row that holds none (a checkout not yet confirmed, or a plan that
 * has ended) accepts any, and so does an event that names none.
 */
function concerns(row: CustomerRow, subscriptionId: string | null | undefined): boolean {
  return !row.stripe_subscription_id || !subscriptionId || row.stripe_subscription_id === subscriptionId;
}

/**
 * The subscription as Stripe holds it now (rule 3). An event that says the
 * subscription has ended is taken at its word, because nothing comes after
 * the end. Anything else is asked of Stripe: the copy in the event was made
 * when the event was, and the subscription may have been paid for, fallen
 * past due or ended since. When Stripe does not answer, this throws, the event
 * is answered with 500 and Stripe delivers it again.
 */
async function asStripeHoldsIt(sent: Stripe.Subscription): Promise<Stripe.Subscription> {
  if (ENDED.has(sent.status)) return sent;
  return getStripe().subscriptions.retrieve(sent.id);
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
 * Whether a payment page's money has arrived. A card is paid when the page is
 * completed; a delayed method completes the page first and is paid later.
 */
function isPaid(session: Stripe.Checkout.Session): boolean {
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

/**
 * Writes what an event means to the database. Returns the first database
 * call that failed, or null once everything the event asks for is recorded
 * (which includes an event that asks for nothing).
 */
async function record(event: Stripe.Event): Promise<Failure | null> {
  const supabase = createAdminClient();

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId) return null;

      // One-time cert add-on (mode=payment): grant/reactivate the enrollment
      // in the purchased cert. Access still requires active Pro, so this just
      // adds the cert to the user's plan. Upsert is idempotent on retries.
      // Only once the money has arrived: see the note above POST.
      if (session.metadata?.kind === "cert_addon") {
        const certId = session.metadata.cert_id;
        if (!certId || !isPaid(session)) return null;

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

      // A plan's first payment made with a delayed method is granted by the
      // change that says it was paid (rule 2), not by this event.
      if (event.type !== "checkout.session.completed") return null;
      if (!session.subscription) return null;

      const subscription = await getStripe().subscriptions.retrieve(
        session.subscription as string
      );

      // The subscription as it stands now, not as it stood when the event was
      // first sent: one that has ended since (this is a late redelivery) grants
      // nothing, and no conversion is reported for it.
      if (ENDED.has(subscription.status)) return null;

      // Rule 2: what Stripe holds now. A completed payment page is not a paid
      // plan. By the time this event arrives the subscription may be past due
      // (a late delivery, or an old event sent again from the Dashboard), and
      // a first payment may still be pending. The row is written all the same,
      // with the subscription, its standing and no Pro: the change that says
      // it was paid then finds a row that holds this subscription and grants
      // Pro.
      const standing = standingOf(subscription);

      // What the row held before this write decides whether this is a
      // conversion (rule 4). Read first; a read that fails leaves the event
      // for Stripe to send again, before anything has been written.
      const { data: before, error: beforeError } = await supabase
        .from("user_subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .maybeSingle();
      if (beforeError) return failure("subscription lookup", beforeError);

      const { error } = await supabase.from("user_subscriptions").upsert(
        {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          ...standing,
        },
        { onConflict: "user_id" }
      );
      if (error) return failure("subscription upsert", error);

      // The conversion event, fired server-side (reliable source of truth,
      // unlike a success-redirect the user may never reach) and only once the
      // row is written: a conversion is a buyer who has Pro. distinct_id is the
      // Supabase user id, so it joins the funnel this person built in-browser.
      if (becomesPro(before as PriorStanding | null, standing)) {
        captureAfterResponse(userId, "subscription_activated", {
          stripe_subscription_id: subscription.id,
          plan: "pro",
        });
      }
      return null;
    }

    case "customer.subscription.updated": {
      const sent = event.data.object as Stripe.Subscription;
      const customerId = sent.customer as string;

      // maybeSingle, so that "no such customer here" (nothing to do) can be
      // told apart from a read that failed (Stripe must send the event again).
      const { data: sub, error: readError } = await supabase
        .from("user_subscriptions")
        .select("user_id, stripe_subscription_id, plan, status")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      if (readError) return failure("subscription lookup", readError);

      if (!sub) return null;
      // About another subscription of the same customer: not this row's business.
      if (!concerns(sub as CustomerRow, sent.id)) return null;

      // Rule 3: the subscription as it stands now, not as the event copied it.
      const subscription = await asStripeHoldsIt(sent);
      // A subscription that has ended ends the plan of the row that holds it.
      // A row that holds none has nothing of this subscription's left to end:
      // either its deletion has already been recorded (and this is a late
      // event about it), or it was never this row's plan.
      if (ENDED.has(subscription.status) && !(sub as CustomerRow).stripe_subscription_id) return null;

      const standing = standingOf(subscription);
      // Pro granted to a row that holds no subscription (the plan's own event
      // has arrived before its checkout) is recorded together with the
      // subscription it comes from. A row that holds none accepts any event
      // (rule 1), so the late end of an older subscription of the same
      // customer, arriving in the seconds before the checkout is recorded,
      // would otherwise end the plan that has just been paid for.
      const takesSubscription =
        standing.plan === "pro" && !(sub as CustomerRow).stripe_subscription_id;

      const { error } = await supabase
        .from("user_subscriptions")
        .update(takesSubscription ? { ...standing, stripe_subscription_id: sent.id } : standing)
        .eq("stripe_customer_id", customerId);
      if (error) return failure("subscription update", error);

      // A first payment that was still pending when its checkout completed is
      // granted here, and so is a plan whose own event arrives before its
      // checkout: either way this is the buyer's conversion (rule 4).
      if (becomesPro(sub as PriorStanding, standing)) {
        captureAfterResponse((sub as CustomerRow).user_id, "subscription_activated", {
          stripe_subscription_id: sent.id,
          plan: "pro",
        });
      }
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
      const held = (sub as CustomerRow | null)?.stripe_subscription_id;
      if (!sub || !held) return null;
      if (!concerns(sub as CustomerRow, invoiceSubscriptionId(invoice))) return null;

      // Rule 3: the payment failed when the event was made. Whether it is still
      // owed is for Stripe to say. A member who has paid since is not marked
      // past due (that would shut them out until their next renewal), and a
      // plan that has ended since is recorded by its own event.
      const subscription = await getStripe().subscriptions.retrieve(held);
      if (subscription.status !== "past_due") return null;

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
