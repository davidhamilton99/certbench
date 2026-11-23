import { SUPPORT_EMAIL } from "@/lib/errors/user-message";

/**
 * The sentences the billing endpoints answer with when they refuse or fail.
 * A visitor reads them as written (see `userMessage` in
 * src/lib/errors/user-message.ts, which shows an endpoint's own sentence for
 * every error code except "internal"), so each one says what happened and
 * what to do next.
 */

/** A second checkout for an account whose plan is running. */
export const ALREADY_PRO =
  "This account already has CertBench Pro. If you have just paid, your study path opens as soon as the payment is confirmed. Please reload the page.";

/**
 * A checkout for an account whose subscription is past due, unpaid, or still
 * waiting for its first payment. The card form is in the billing portal,
 * which opens from the "Manage billing" button on the billing page. An error
 * cannot carry a link, so the sentence gives the address, as the help page does.
 */
export const PAYMENT_DUE =
  "Your subscription has a payment that has not been completed. Please go to certbench.dev/upgrade, choose Manage billing, and update your payment method. You do not need to subscribe again.";

/** The limit on opening a payment page: five requests an hour for each account. */
export const PAYMENT_PAGE_LIMIT = `Too many attempts to open the payment page were made in the past hour. Please try again later, or write to ${SUPPORT_EMAIL}.`;

/** The same limit on the billing portal. */
export const BILLING_PAGE_LIMIT = `Too many attempts to open the billing page were made in the past hour. Please try again later, or write to ${SUPPORT_EMAIL}.`;

/** Stripe has no price for the billing period that was chosen. */
export const BILLING_PERIOD_UNAVAILABLE = `That billing period is not available at present. Please choose monthly billing, or write to ${SUPPORT_EMAIL}.`;

/** The payment page could not be made, for a reason the visitor cannot act on. */
export const PAYMENT_PAGE_FAILED = "The payment page could not be opened. Please try again.";

/** The billing portal could not be made, for a reason the visitor cannot act on. */
export const BILLING_PAGE_FAILED = "The billing page could not be opened. Please try again.";

/** An account that has never started a checkout has no customer at Stripe, so no portal. */
export const NO_BILLING_RECORD = "There is no billing record for this account.";

/** The exam that was to be added to a plan is not one CertBench has. */
export const CERTIFICATION_NOT_FOUND = "That certification could not be found.";

/** The exam is on the plan already. */
export const CERTIFICATION_IN_PLAN = "That certification is already in your plan.";
