import { BASE_PRICES_CENTS, formatUsd } from "./ppp";

/**
 * The price of Pro and what one plan covers, worded once. Every page, table
 * and email that states the price uses these strings, so a change to
 * BASE_PRICES_CENTS reaches all of them and no page leaves out a plan, the
 * currency or the regional adjustment.
 *
 * These are the list prices. A page that shows a visitor their own regional
 * price (the plan chooser) takes its figures from `regionPricing` instead.
 */

/** The three list prices as figures: "$19", "$39" and "$99". */
export const PRO_PRICES = {
  monthly: formatUsd(BASE_PRICES_CENTS.monthly),
  quarterly: formatUsd(BASE_PRICES_CENTS.quarterly),
  annual: formatUsd(BASE_PRICES_CENTS.annual),
} as const;

/** The three plans as one clause without a full stop, for a table cell or a card. */
export const PRO_PRICE_SHORT = `Pro costs ${PRO_PRICES.monthly} a month, ${PRO_PRICES.quarterly} every three months, or ${PRO_PRICES.annual} a year`;

/** The three plans as a sentence. */
export const PRO_PRICE_SENTENCE = `CertBench Pro costs ${PRO_PRICES.monthly} a month, ${PRO_PRICES.quarterly} every three months, or ${PRO_PRICES.annual} a year.`;

/** The currency and the regional adjustment, which belong beside any stated price. */
export const PRO_PRICE_REGION_NOTE = "Prices are in US dollars and are adjusted by region.";

/** The price in full: the three plans, the currency and the regional adjustment. */
export const PRO_PRICE_TERMS = `${PRO_PRICE_SENTENCE} ${PRO_PRICE_REGION_NOTE}`;

/**
 * What one Pro plan covers. Access is granted for each exam (the enrollment),
 * so A+ is two exams, and the two versions of Security+ count as one.
 */
export const PRO_SCOPE_TERMS =
  "Pro covers one exam. For A+, Core 1 and Core 2 are separate exams. For Security+, Pro covers both versions, SY0-801 and SY0-701.";
