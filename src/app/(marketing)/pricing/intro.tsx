import { PAGE } from "@/components/marketing/lander/layout";
import { cn } from "@/lib/utils";

/**
 * The pricing page's column: the public frame's container, so the title
 * begins on the same left edge as the logo above it.
 */
export const PRICING_COLUMN = cn(PAGE, "pb-20 pt-10 sm:pt-16");

/** The two plans side by side. They keep to a width that a line of a list can be read at. */
export const PRICING_PLANS = "grid max-w-5xl gap-5 md:grid-cols-2 md:items-start";

/**
 * The page's title, and nothing under it: the plans follow at once. It is the
 * same for every visitor and every country, so the layout draws it once
 * (layout.tsx) and it stands while the plans are being worked out for the
 * visitor. Each fact that an opening paragraph used to repeat is stated in a
 * plan: no payment card for the free plan, and in the Pro plan its prices, the
 * currency and the regional adjustment, what one plan covers, and how to cancel.
 */
export function PricingIntro() {
  return <h1 className="cb-title mb-10 sm:mb-12">Plans and pricing</h1>;
}
