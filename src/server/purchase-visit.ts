import "server-only";

import type { BrowserVisit } from "@/server/analytics";
import type { CheckoutAnalytics } from "@/contracts/billing";

/**
 * Where a payment page keeps the browser it was opened from until the webhook
 * records the purchase: in the Checkout Session's metadata and, for a plan, in
 * the subscription's too (the change that grants Pro after a delayed first
 * payment has only the subscription). Each name says what it is for to anyone
 * reading it in the Stripe Dashboard.
 */
const KEY = {
  distinctId: "posthog_distinct_id",
  sessionId: "posthog_session_id",
  userAgent: "posthog_user_agent",
} as const;

/** The longest value Stripe keeps in metadata. A browser's user agent is far shorter (under 150 characters here). */
const STRIPE_VALUE_LIMIT = 500;

/**
 * The metadata a payment page is opened with: the browser's PostHog ids, as
 * the page sent them, and the user agent of the request that opens it, which
 * is the buyer's own browser. Only what is known is written, so a page opened
 * without PostHog (an ad blocker) carries the user agent alone.
 */
export function visitMetadata(
  analytics: CheckoutAnalytics | undefined,
  userAgent: string | null
): Record<string, string> {
  const metadata: Record<string, string> = {};
  if (analytics?.distinctId) metadata[KEY.distinctId] = analytics.distinctId;
  if (analytics?.sessionId) metadata[KEY.sessionId] = analytics.sessionId;
  const agent = userAgent?.trim();
  if (agent) metadata[KEY.userAgent] = agent.slice(0, STRIPE_VALUE_LIMIT);
  return metadata;
}

/** The browser a payment page or subscription was opened from, read back from its metadata. */
export function visitOf(metadata: Record<string, string> | null | undefined): BrowserVisit {
  return {
    distinctId: metadata?.[KEY.distinctId] || undefined,
    sessionId: metadata?.[KEY.sessionId] || undefined,
    userAgent: metadata?.[KEY.userAgent] || undefined,
  };
}
