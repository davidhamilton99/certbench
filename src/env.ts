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

/**
 * Server-side secrets. Every name the app may need lives here.
 *
 * Which of them a deployment has is written to the log as a server instance
 * starts and answered by /api/health, as true or false only
 * (src/server/api/settings.ts).
 *
 * ADDON_CERTS is deliberately not one of them and MUST STAY UNSET: set to
 * "true" it lets any account add an exam without paying
 * (src/app/api/user/certifications/route.ts).
 */
type ServerKey =
  | "SUPABASE_SERVICE_ROLE_KEY"
  | "STRIPE_SECRET_KEY"
  | "STRIPE_WEBHOOK_SECRET"
  | "STRIPE_PRO_PRICE_ID"
  | "RESEND_API_KEY"
  | "CRON_SECRET";

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
      `Missing required environment variable ${key}: set it in .env.local (dev) or the Vercel environment.`
    );
  }
  return value;
}

/**
 * Optional server config (no throw). EMAIL_POSTAL_ADDRESS is the sender's
 * postal address: the owner supplies it, and every email prints it in its
 * footer once it is set (src/server/email/templates.ts).
 *
 * LINK_SIGNING_SECRET signs the shared readiness links and the story links in
 * the post-exam email (src/server/share/readiness-token.ts,
 * src/server/story/story-token.ts). Until it is set, SUPABASE_SERVICE_ROLE_KEY
 * signs them, as it signed every link made before; once it is set, the links
 * made before stop working, and the service role key can be rotated without
 * breaking the links made after.
 */
export function serverEnvOptional(
  key: "SENTRY_DSN" | "EMAIL_FROM" | "EMAIL_POSTAL_ADDRESS" | "LINK_SIGNING_SECRET"
): string | undefined {
  return process.env[key];
}
