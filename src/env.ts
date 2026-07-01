import { z } from "zod";

/**
 * Environment contract — the single authority on required env vars.
 *
 * `publicEnv`: NEXT_PUBLIC_* vars, inlined at build time, safe everywhere.
 * `serverEnv(key)`: secrets, validated per key at point of use so a missing
 *   Stripe key doesn't break endpoints that never touch Stripe. Throws a
 *   clear error naming the variable when a required secret is absent.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.url().default("https://certbench.dev"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
});

// NEXT_PUBLIC_* vars must be referenced literally for Next.js to inline them.
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
});

/** Server-side secrets. Every name the app may need lives here. */
const SERVER_KEYS = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRO_PRICE_ID",
] as const;

type ServerKey = (typeof SERVER_KEYS)[number];

/**
 * Fetch a required server secret. Throws with the variable name if missing —
 * the failure surfaces at the feature that needs it, not app-wide.
 */
export function serverEnv(key: ServerKey): string {
  if (typeof window !== "undefined") {
    throw new Error("serverEnv() must not be called in the browser");
  }
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${key} — set it in .env.local (dev) or the Vercel environment.`
    );
  }
  return value;
}

/** Optional server config (no throw). */
export function serverEnvOptional(key: "SENTRY_DSN"): string | undefined {
  return process.env[key];
}
