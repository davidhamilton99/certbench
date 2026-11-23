import Link from "next/link";
import { BILLING_HELP_HREF } from "@/components/billing/plans";
import { PAGE } from "@/components/marketing/lander/layout";
import { PRO_PRICE_TERMS } from "@/lib/pricing/terms";
import { cn } from "@/lib/utils";

/**
 * The pricing page's column: the public frame's container, so the title
 * begins on the same left edge as the logo above it.
 */
export const PRICING_COLUMN = cn(PAGE, "pb-20 pt-10 sm:pt-16");

/** The two plans side by side. They keep to a width that a line of a list can be read at. */
export const PRICING_PLANS = "grid max-w-5xl gap-5 md:grid-cols-2 md:items-start";

/**
 * The page's title and opening paragraphs. Every word here is the same for
 * every visitor and every country, so it is also what is shown while the
 * plans are being worked out for the visitor (see loading.tsx), and it is the
 * sentence a search engine or an assistant can quote for what CertBench costs.
 * The list prices come from the price table, so they cannot drift from what
 * is charged.
 */
export function PricingIntro() {
  return (
    <div className="mb-10 grid gap-4 sm:mb-12">
      <h1 className="cb-title">Plans and pricing</h1>
      <p className="cb-measure text-lede text-muted-foreground sm:text-xl">
        CertBench is a study program for the CompTIA Security+, Network+ and A+ exams. It is free to start, and no
        payment card is required.
      </p>
      <p className="cb-measure text-body text-muted-foreground">
        {PRO_PRICE_TERMS} The price shown for your country on this page may be lower.
      </p>
      <p className="cb-measure text-body text-muted-foreground">
        A Pro plan covers one exam. You can cancel at any time from your{" "}
        <Link href={BILLING_HELP_HREF} className="cb-link">
          billing page
        </Link>
        , and you keep Pro until the end of the period that you have paid for.
      </p>
    </div>
  );
}
