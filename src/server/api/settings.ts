import "server-only";

/**
 * Which optional and required settings this deployment has, as true or false.
 *
 * A missing setting does not stop the site: it quietly switches a feature
 * off (no email, no daily job, no payment confirmation, no analytics, no
 * postal address in the emails). These
 * flags make that visible, in one line when a server instance starts and in
 * the health endpoint's answer. They say only whether each setting is present.
 * A value is never read out, logged or returned.
 */
export interface SettingFlags {
  /** RESEND_API_KEY: without it no email is sent. */
  resend: boolean;
  /** CRON_SECRET: without it the daily email job fails before it starts. */
  cron: boolean;
  /** STRIPE_SECRET_KEY: without it checkout and the billing portal fail. */
  stripe: boolean;
  /** STRIPE_WEBHOOK_SECRET: without it no payment is confirmed. */
  webhook: boolean;
  /** NEXT_PUBLIC_POSTHOG_KEY: without it no event is recorded, server errors included. */
  posthog: boolean;
  /**
   * SUPABASE_SERVICE_ROLE_KEY: without it nothing is rate-limited, and every
   * write the server makes on an account's behalf fails (enrollment, billing,
   * email preferences, account deletion).
   */
  serviceRole: boolean;
  /**
   * EMAIL_POSTAL_ADDRESS: the sender's postal address, which the owner
   * supplies. Without it every email is sent with no postal address in its
   * footer (src/server/email/templates.ts).
   */
  postalAddress: boolean;
}

/** What stops working when a setting is absent, for the line a server instance logs as it starts. */
const WHEN_MISSING: Record<keyof SettingFlags, string> = {
  resend: "RESEND_API_KEY is not set: no email is sent.",
  cron: "CRON_SECRET is not set: the daily email job fails before it starts.",
  stripe: "STRIPE_SECRET_KEY is not set: checkout and the billing portal fail.",
  webhook: "STRIPE_WEBHOOK_SECRET is not set: no payment is confirmed.",
  posthog: "NEXT_PUBLIC_POSTHOG_KEY is not set: no event is recorded, server errors included.",
  serviceRole:
    "SUPABASE_SERVICE_ROLE_KEY is not set: nothing is rate-limited, and every write the server makes for an account fails.",
  postalAddress: "EMAIL_POSTAL_ADDRESS is not set: emails print no postal address.",
};

const isSet = (name: string) => Boolean(process.env[name]);

/**
 * Read straight from the environment, not through src/env.ts: this runs as a
 * server instance starts, and must not be able to stop it.
 */
export function settingFlags(): SettingFlags {
  return {
    resend: isSet("RESEND_API_KEY"),
    cron: isSet("CRON_SECRET"),
    stripe: isSet("STRIPE_SECRET_KEY"),
    webhook: isSet("STRIPE_WEBHOOK_SECRET"),
    // Written out in full: Next puts a NEXT_PUBLIC_ value into the code only where it is named literally.
    posthog: Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY),
    serviceRole: isSet("SUPABASE_SERVICE_ROLE_KEY"),
    // A value of spaces alone prints no address (the templates trim it), so it counts as absent.
    postalAddress: Boolean(process.env.EMAIL_POSTAL_ADDRESS?.trim()),
  };
}

/**
 * The lines a server instance logs as it starts: one with every flag, one for
 * each setting that is absent saying what that switches off, and a warning if
 * ADDON_CERTS is on (see src/app/api/user/certifications/route.ts: it must
 * stay unset).
 */
export function bootLines(
  flags: SettingFlags = settingFlags(),
  addonCerts: boolean = process.env.ADDON_CERTS === "true"
): { summary: string; warnings: string[] } {
  const names = Object.keys(WHEN_MISSING) as (keyof SettingFlags)[];
  const summary = `[boot] settings: ${names.map((name) => `${name}=${flags[name]}`).join(" ")}`;
  const warnings = names.filter((name) => !flags[name]).map((name) => `[boot] ${WHEN_MISSING[name]}`);
  if (addonCerts) {
    warnings.push("[boot] ADDON_CERTS is set to true: any account can add an exam without paying. It must stay unset.");
  }
  return { summary, warnings };
}

/** Writes the boot lines to the server log. Called once, from src/instrumentation.ts. */
export function logBootLines(): void {
  const { summary, warnings } = bootLines();
  console.info(summary);
  for (const warning of warnings) console.warn(warning);
}
