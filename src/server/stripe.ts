import "server-only";

import Stripe from "stripe";
import { serverEnv } from "@/env";

// Lazy-initialize Stripe so builds don't require the secret key.
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  _stripe ??= new Stripe(serverEnv("STRIPE_SECRET_KEY"), {
    apiVersion: "2026-02-25.clover",
    typescript: true,
    // A call that Stripe does not answer is given up after 15 seconds and tried
    // once more. The library's own limits (80 seconds, two more attempts) would
    // hold a buyer's request, or the answer to a webhook, for minutes.
    timeout: 15_000,
    maxNetworkRetries: 1,
  });
  return _stripe;
}

/**
 * What a customer's subscriptions at Stripe mean for a new checkout.
 *
 *  - "paid": a plan is running (active, or in a trial). A second checkout
 *    would charge the same person twice.
 *  - "payment_due": a plan exists whose payment has not gone through (a failed
 *    renewal that Stripe is still retrying, or an unpaid plan). The way back is
 *    the card form in the billing portal, not a second subscription.
 *  - "none": nothing stands in the way of a new plan. This includes a first
 *    attempt whose payment was never completed ("incomplete"): that person has
 *    never had Pro and simply tries again. Stripe lets the unfinished attempt
 *    expire about a day later, and the webhook ignores that event because the
 *    row then holds the subscription that was paid for.
 */
export type SubscriptionStanding = "paid" | "payment_due" | "none";

const PAID: ReadonlySet<Stripe.Subscription.Status> = new Set(["active", "trialing"]);
const PAYMENT_DUE: ReadonlySet<Stripe.Subscription.Status> = new Set(["past_due", "unpaid"]);

/**
 * Asks Stripe, not our own table, where a customer's plan stands. Stripe has
 * the subscription the moment checkout completes, before our webhook records
 * it, so this is what stops a second purchase from another tab, or from an
 * offer seen while the webhook is still in flight.
 *
 * This decides only whether a new checkout may start. It does not decide who
 * has Pro: that is read from the subscription row, as before.
 */
export async function subscriptionStanding(
  stripe: Pick<Stripe, "subscriptions">,
  customerId: string
): Promise<SubscriptionStanding> {
  // Without a status filter, Stripe lists every subscription that isn't canceled.
  const { data } = await stripe.subscriptions.list({ customer: customerId, limit: 10 });
  if (data.some((s) => PAID.has(s.status))) return "paid";
  if (data.some((s) => PAYMENT_DUE.has(s.status))) return "payment_due";
  return "none";
}

/** A subscription in one of these states has ended: there is nothing left to cancel. */
const ENDED: ReadonlySet<Stripe.Subscription.Status> = new Set(["canceled", "incomplete_expired"]);

/** Stripe's answer when it has no customer with that id. */
function isUnknownCustomer(err: unknown): boolean {
  const e = err as { code?: unknown; param?: unknown } | null;
  return e?.code === "resource_missing" && e?.param === "customer";
}

/**
 * Cancels, at once, every subscription of a customer that could still charge
 * them, and returns how many were canceled. Used before an account is
 * deleted: once the account is gone there is nowhere left to cancel from.
 *
 * Canceling stops Stripe collecting on the customer's open invoices as well,
 * so a failed renewal is not retried afterwards. Nothing is refunded here.
 *
 * Throws what Stripe throws, so that the caller can stop. The one exception is
 * a customer that Stripe does not have: it has no subscriptions to cancel.
 */
export async function cancelLiveSubscriptions(
  stripe: Pick<Stripe, "subscriptions">,
  customerId: string
): Promise<number> {
  // Read every page first, then cancel: canceling changes what the list holds.
  const live: string[] = [];
  let startingAfter: string | undefined;
  try {
    do {
      const page = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const subscription of page.data) {
        if (!ENDED.has(subscription.status)) live.push(subscription.id);
      }
      startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
    } while (startingAfter);
  } catch (err) {
    if (isUnknownCustomer(err)) return 0;
    throw err;
  }

  for (const id of live) {
    await stripe.subscriptions.cancel(id);
  }
  return live.length;
}

/**
 * Expires every payment page of a customer that is still open, and returns
 * how many were expired. Used before an account is deleted: an open Checkout
 * Session can still be paid, and one that is paid after the account has gone
 * starts a subscription that belongs to no account and that nobody can cancel
 * from the site. Once a page has expired it can no longer be completed.
 *
 * Throws what Stripe throws, so that the caller can stop. That includes a page
 * that was completed in the moment between the list and its expiry: Stripe
 * refuses to expire it. A second try no longer finds that page open, and the
 * subscription it started, if it started one, is then among the live ones.
 * The one exception is a customer that Stripe does not have: it has no
 * payment pages to expire.
 */
export async function expireOpenCheckouts(
  stripe: Pick<Stripe, "checkout">,
  customerId: string
): Promise<number> {
  // Read every page of the list first, then expire: expiring changes what the list holds.
  const open: string[] = [];
  let startingAfter: string | undefined;
  try {
    do {
      const page = await stripe.checkout.sessions.list({
        customer: customerId,
        status: "open",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {}),
      });
      for (const session of page.data) open.push(session.id);
      startingAfter = page.has_more ? page.data.at(-1)?.id : undefined;
    } while (startingAfter);
  } catch (err) {
    if (isUnknownCustomer(err)) return 0;
    throw err;
  }

  for (const id of open) {
    await stripe.checkout.sessions.expire(id);
  }
  return open.length;
}
