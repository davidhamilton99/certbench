/**
 * Typed, centralized wrapper over the PostHog browser client (loaded in
 * app/layout.tsx). This is the ONE place that knows every product event we
 * track, so event names and shapes can't drift across the codebase and the
 * conversion funnel stays legible.
 *
 * Safe to call anywhere: every function no-ops when PostHog isn't present
 * (SSR, local dev without a key, or a viewer with an ad blocker) and never
 * throws — analytics must never break the app.
 */

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, props?: Record<string, unknown>) => void;
      identify: (id: string, props?: Record<string, unknown>) => void;
      reset: () => void;
    };
  }
}

type Surface = "authed" | "public";

/**
 * Every product event we track, with its required properties. Add an event
 * here first; `track()` won't accept a name or shape that isn't in this map.
 */
type EventMap = {
  hero_question_answered: { correct: boolean };
  signup_submitted: { method: "email" | "google" };
  pbq_started: { scenario_id: string; scenario_type: string; surface: Surface };
  upsell_viewed: { context: string };
  upsell_clicked: { context: string; href: string };
  pricing_viewed: { surface: "upgrade" | "pricing" };
  checkout_started: { interval: string };
};

/** Capture a typed product event. */
export function track<K extends keyof EventMap>(event: K, props: EventMap[K]): void {
  if (typeof window === "undefined") return;
  try {
    window.posthog?.capture(event, props);
  } catch {
    /* analytics must never break the app */
  }
}

/**
 * Tie subsequent events to a known user. PostHog runs `identified_only`, so
 * without this a signed-in user's events stay anonymous and the funnel can't
 * follow a person from signup through to conversion.
 */
export function identifyUser(id: string, props?: { email?: string }): void {
  if (typeof window === "undefined") return;
  try {
    window.posthog?.identify(id, props);
  } catch {
    /* no-op */
  }
}

/** Clear identity on sign-out so events don't bleed across accounts on a shared device. */
export function resetAnalytics(): void {
  if (typeof window === "undefined") return;
  try {
    window.posthog?.reset();
  } catch {
    /* no-op */
  }
}
