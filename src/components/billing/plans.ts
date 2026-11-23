import type { BillingInterval } from "@/contracts/billing";

/**
 * The billing periods, for code that only needs their names. The contract in
 * src/contracts/billing.ts holds the same list beside its schemas, which a
 * page should not load to name a period (a test keeps the two equal). This
 * module has no "use client", so a page on the server can call it too.
 */
export const BILLING_PERIODS = ["monthly", "quarterly", "annual"] as const satisfies readonly BillingInterval[];

/** Whether a value, from a page's address for example, names a billing period. */
export function isBillingPeriod(value: unknown): value is BillingInterval {
  return typeof value === "string" && (BILLING_PERIODS as readonly string[]).includes(value);
}

/** Where the words "billing page" lead: the help entry that says how to cancel. */
export const BILLING_HELP_HREF = "/help#account";

/** The pricing page with a billing period already chosen. */
export function pricingWithPlan(plan: BillingInterval): string {
  return `/pricing?plan=${plan}`;
}

/**
 * Where a visitor who is not signed in goes when they ask to pay on the
 * pricing page: to create an account, with the way back to the pricing page
 * and the period they chose. The register page says that payment comes next,
 * and returns there once the account exists.
 */
export function registerThenPay(plan: BillingInterval): string {
  return `/register?next=${encodeURIComponent(pricingWithPlan(plan))}`;
}
