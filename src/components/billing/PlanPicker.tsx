"use client";

import { useEffect } from "react";
import type { BillingInterval } from "@/contracts/billing";
import type { RegionPricing } from "@/lib/pricing/ppp";
import { track } from "@/lib/analytics";
import { PlanChooser } from "./PlanChooser";
import { BILLING_PERIODS, registerThenPay } from "./plans";

/**
 * The plan chooser as the pricing page and the billing page show it: all
 * three billing periods, with three months chosen first.
 *
 * `initialPricing` is the regional price worked out on the server from the
 * request's country, so the first paint already shows the visitor's own
 * price. `initialPlan` is the period a visitor chose before they were sent to
 * create an account: it is chosen again when they come back.
 */
export function PlanPicker({
  initialPricing,
  initialPlan,
  surface = "upgrade",
}: {
  initialPricing?: RegionPricing;
  initialPlan?: BillingInterval;
  /** Which page the chooser is on: it labels the pricing_viewed step. */
  surface?: "upgrade" | "pricing";
}) {
  useEffect(() => {
    track("pricing_viewed", { surface });
  }, [surface]);

  return (
    <PlanChooser
      plans={BILLING_PERIODS}
      defaultPlan={initialPlan ?? "quarterly"}
      initialPricing={initialPricing}
      // Backing out of the payment page returns to the page the plan was chosen on.
      returnTo={surface}
      // The billing page is only shown to someone who is signed in, so a press
      // there that finds nobody signed in is a session that has ended.
      signInHref={surface === "upgrade" ? () => "/login?next=/upgrade" : registerThenPay}
    />
  );
}
