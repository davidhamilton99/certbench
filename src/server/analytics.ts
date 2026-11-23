import "server-only";

import { publicEnv } from "@/env";

const POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * How long one send may take. An event is never worth a wait: a webhook
 * answers Stripe after it, and the daily job sends one for each email.
 */
export const ANALYTICS_TIME_LIMIT_MS = 2_000;

/**
 * What every event from this server carries. The server's address is where
 * Vercel runs (Ashburn, in the United States), not where the person is, so it
 * is never looked up: until November 2026 every purchase was placed in
 * Ashburn, and so was the buyer's person, over the country their own browser
 * had reported. PostHog's server libraries send `$geoip_disable` for the same
 * reason.
 */
const FROM_THE_SERVER = { $lib: "certbench-server", $geoip_disable: true } as const;

/** One event as PostHog's capture API takes it. */
interface ServerEvent {
  event: string;
  distinct_id: string;
  properties: Record<string, unknown>;
  /** When it happened (ISO 8601), where that is not the moment it is sent. */
  timestamp?: string;
}

/**
 * Sends events to PostHog in one request, in order. No-ops when no PostHog key
 * is configured, and never throws: a webhook must not fail because analytics
 * is down. A send that has not finished within the time limit is abandoned,
 * and a send that fails is written to the log.
 */
async function send(events: ServerEvent[]): Promise<void> {
  const apiKey = publicEnv.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;
  try {
    const res = await fetch(`${POSTHOG_HOST}/batch/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        batch: events.map((e) => ({ ...e, properties: { ...e.properties, ...FROM_THE_SERVER } })),
      }),
      signal: AbortSignal.timeout(ANALYTICS_TIME_LIMIT_MS),
    });
    if (!res.ok) console.error(`PostHog server capture was refused: ${res.status}`);
  } catch (err) {
    console.error("PostHog server capture failed:", err);
  }
}

/**
 * Fire a product event from the server (the daily email job, a story sent in,
 * a fault) into PostHog, attributed to `distinctId`. Pass the Supabase user id,
 * the same id the browser identifies with, so the server event lands on the
 * same person as that user's client events. A purchase goes through
 * `capturePurchase` instead, which also puts it on the visit it came from.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  await send([{ event, distinct_id: distinctId, properties: { ...properties } }]);
}

/**
 * The browser a payment page was opened from, as the page kept it for the
 * webhook (src/server/purchase-visit.ts). Any of it may be missing: PostHog
 * had not loaded (an ad blocker), or the page was opened before it was kept.
 */
export interface BrowserVisit {
  /** The id PostHog knew the browser by: the user id once identified, an anonymous id before. */
  distinctId?: string;
  /** The PostHog session the payment page was opened from. */
  sessionId?: string;
  /** The browser's user agent, from the request that opened the payment page. */
  userAgent?: string;
}

/**
 * A purchase is placed on the visit that opened its payment page when it was
 * paid within this long of being at that page. A card is paid in minutes. A
 * bank debit is paid days later, long after the visit ended, and placing it
 * there would stretch that visit to days.
 */
export const VISIT_WINDOW_SECONDS = 60 * 60;

/** A purchase, as the Stripe webhook reports it. */
export interface Purchase {
  /** The buyer's Supabase user id: the id their browser is identified by once signed in. */
  userId: string;
  /** `subscription_activated` for a plan, `cert_added` for an exam added to one. */
  event: string;
  properties: Record<string, unknown>;
  visit: BrowserVisit;
  /**
   * When the buyer was at the payment page, in Stripe's seconds: when the page
   * was opened, or when the subscription it made was created.
   */
  checkoutAt?: number | null;
  /** When the payment was made, in Stripe's seconds: the time of the event that reports it. */
  paidAt?: number;
}

/**
 * Records a purchase on the buyer, and on the visit that led to it, so that
 * PostHog can say which page, source and campaign a sale came from.
 *
 *  - The event is the buyer's: its distinct id is the user id, as before.
 *  - A browser that had not been identified when it opened the payment page
 *    (the pricing page identifies nobody, for example) is identified as the
 *    buyer first, as the browser itself would have done: its anonymous visit
 *    then belongs to the buyer. PostHog refuses to merge a browser already
 *    identified as someone else, so that can never join two people.
 *  - `$session_id` puts the purchase in the session it came from, whose
 *    landing page, referrer and campaign every breakdown by session reads.
 *  - The browser's own user agent makes it a person's event. Without one,
 *    PostHog classed every purchase as a bot's (`$virt_is_bot`), so a view
 *    with bots filtered out counted no buyers at all.
 *  - It is dated when it was paid, not when it was sent, which is later when
 *    Stripe delivers the event again after a failure.
 */
export async function capturePurchase({
  userId,
  event,
  properties,
  visit,
  checkoutAt,
  paidAt,
}: Purchase): Promise<void> {
  const timestamp =
    typeof paidAt === "number" && Number.isFinite(paidAt) ? new Date(paidAt * 1000).toISOString() : undefined;
  const browser = visit.userAgent ? { $raw_user_agent: visit.userAgent } : {};
  const onVisit =
    !!visit.sessionId &&
    typeof checkoutAt === "number" &&
    typeof paidAt === "number" &&
    paidAt - checkoutAt <= VISIT_WINDOW_SECONDS;

  const events: ServerEvent[] = [];
  if (visit.distinctId && visit.distinctId !== userId) {
    events.push({
      event: "$identify",
      distinct_id: userId,
      properties: { ...browser, $anon_distinct_id: visit.distinctId },
      timestamp,
    });
  }
  events.push({
    event,
    distinct_id: userId,
    properties: { ...properties, ...browser, ...(onVisit ? { $session_id: visit.sessionId } : {}) },
    timestamp,
  });
  await send(events);
}
