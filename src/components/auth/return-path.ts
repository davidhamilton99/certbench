import type { PRO_PRICES } from "@/lib/pricing/terms";

/**
 * Where a visitor goes after signing in or creating an account: the `next`
 * value in the address. It is honoured only when it is a path on this site,
 * so a link cannot use the sign-in page to send someone elsewhere. This file
 * has no client code in it: the sign-in callback on the server reads it too.
 */
export function returnPath(raw: string | null | undefined, origin: string): string | null {
  if (!raw || !raw.startsWith("/")) return null;
  try {
    const url = new URL(raw, origin);
    // "//host" and "/\host" both begin with a slash and both name another site.
    if (url.origin !== origin) return null;
    const path = url.pathname + url.search + url.hash;
    // The parser folds "/./" and "/x/../" away, so "/.//host" passes the check
    // above (it is a path on this site) and comes out as "//host", which names
    // another site the moment it is navigated to. What is returned is what is
    // followed, so the result itself must still be a path on this site.
    if (/^\/[/\\]/.test(path)) return null;
    if (new URL(path, origin).origin !== origin) return null;
    return path;
  } catch {
    return null;
  }
}

/** `href` with the return address carried on it, for the links between the account pages. */
export function withReturnPath(href: string, next: string | null): string {
  return next ? `${href}?next=${encodeURIComponent(next)}` : href;
}

/** A billing period of Pro, as the pricing page names it in its address. */
export type PlanInterval = keyof typeof PRO_PRICES;

const PLAN_INTERVALS: readonly PlanInterval[] = ["monthly", "quarterly", "annual"];

/**
 * The plan a visitor chose on the pricing page, when the return address
 * carries one (`/pricing?plan=quarterly`). A visitor who pressed the payment
 * button while signed out is sent to create an account with that address, so
 * the account page can say that payment comes next.
 */
export function chosenPlan(next: string | null): PlanInterval | null {
  if (!next) return null;
  const [path, query = ""] = next.split("#")[0].split("?");
  if (path !== "/pricing") return null;
  const plan = new URLSearchParams(query).get("plan");
  return PLAN_INTERVALS.find((interval) => interval === plan) ?? null;
}
