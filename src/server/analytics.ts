import "server-only";

import { publicEnv } from "@/env";

const POSTHOG_HOST = "https://us.i.posthog.com";

/**
 * How long one event may take to send. An event is never worth a wait: a
 * webhook answers Stripe after it, and the daily job sends one for each email.
 */
export const ANALYTICS_TIME_LIMIT_MS = 2_000;

/**
 * Fire a product event from the server (e.g. a Stripe webhook) into PostHog,
 * attributed to `distinctId`. Pass the Supabase user id, the same id the
 * browser identifies with, so the server event lands on the same person as
 * that user's client events and the conversion funnel joins up.
 *
 * No-ops when no PostHog key is configured, and never throws: a webhook must
 * not fail because analytics is down. A send that has not finished within the
 * time limit is abandoned, and reported to the log like any other failure.
 */
export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const apiKey = publicEnv.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return;
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        event,
        distinct_id: distinctId,
        properties: { ...properties, $lib: "certbench-server" },
      }),
      signal: AbortSignal.timeout(ANALYTICS_TIME_LIMIT_MS),
    });
  } catch (err) {
    console.error("PostHog server capture failed:", err);
  }
}
