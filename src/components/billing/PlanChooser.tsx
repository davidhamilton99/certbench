"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import { createCheckout } from "@/contracts/client";
import type { BillingInterval } from "@/contracts/billing";
import { ApiError } from "@/contracts/errors";
import { userMessage } from "@/lib/errors/user-message";
import { PAYMENT_PAGE_FAILED } from "@/lib/billing/messages";
import { BASE_PRICES_CENTS, type RegionPricing } from "@/lib/pricing/ppp";
import { PRO_PRICE_REGION_NOTE } from "@/lib/pricing/terms";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { leaveFor } from "./leave";
import { BILLING_HELP_HREF } from "./plans";
import { useRegionPricing } from "./useRegionPricing";

/** What each billing period is called, what its price is for, and what it does at the end of the period. */
const PLAN: Record<
  BillingInterval,
  { name: string; per: string; renews: string; months: number; payments: string | null }
> = {
  monthly: {
    name: "Monthly",
    per: "per month",
    renews: "The plan renews every month until you cancel.",
    months: 1,
    payments: null,
  },
  quarterly: {
    name: "Three months",
    per: "every three months",
    renews: "The plan renews every three months until you cancel.",
    months: 3,
    payments: "three monthly payments",
  },
  annual: {
    name: "Annual",
    per: "per year",
    renews: "The plan renews every year until you cancel.",
    months: 12,
    payments: "twelve monthly payments",
  },
};

/** Said under the prices to a visitor whose prices have been adjusted. */
export const REGIONAL_PRICE_NOTE = "Prices are shown in US dollars and are adjusted for your region.";

/**
 * How much less a longer plan costs than the same months paid for monthly, as
 * a whole percentage, or null where it costs no less. It is worked out from
 * the list prices. The regional adjustment takes one percentage off all three
 * prices, so the figure is the same in every country (a test holds that).
 */
export function savingPercent(plan: BillingInterval): number | null {
  const { months } = PLAN[plan];
  if (months === 1) return null;
  const saving = Math.round((1 - BASE_PRICES_CENTS[plan] / (months * BASE_PRICES_CENTS.monthly)) * 100);
  return saving > 0 ? saving : null;
}

/**
 * The one place a billing period is chosen and the payment page is opened. The
 * pricing page, the billing page and the offer on the study path all use it,
 * so the same purchase looks and behaves the same wherever it is made.
 *
 * The periods are native radio buttons in a fieldset: one stop for the Tab key,
 * the arrow keys move between them, and a screen reader says how many there
 * are. The price is the visitor's own regional price, printed plainly: no
 * struck-through figure and no badge. What a longer period saves is said in a
 * sentence. The price that is charged is worked out again on the server when
 * the payment page is opened.
 */
export function PlanChooser<P extends BillingInterval>({
  plans,
  defaultPlan,
  initialPricing,
  returnTo,
  signInHref,
  beforeCheckout,
  onPress,
}: {
  /** The billing periods this page sells, in the order they are listed. */
  plans: readonly P[];
  /** The period that is chosen when the chooser is first shown. */
  defaultPlan: P;
  /**
   * The visitor's regional prices, where the server has already worked them
   * out. Without them the chooser asks for them and prints no figure until it
   * has the answer.
   */
  initialPricing?: RegionPricing;
  /** Where the payment page's back link returns to: "pricing", "upgrade", or "path/" and an exam. */
  returnTo: string;
  /** Where a press leads when nobody is signed in. */
  signInHref: (plan: P) => string;
  /** Work to finish before the payment page is asked for. */
  beforeCheckout?: () => Promise<unknown>;
  /** Told of every press of the button, with the period chosen. */
  onPress?: (plan: P) => void;
}) {
  const name = useId();
  const [plan, setPlan] = useState<P>(plans.includes(defaultPlan) ? defaultPlan : plans[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pricing = useRegionPricing(initialPricing);

  // Back from the payment page through the browser's own button: the page is
  // shown as it was left, so the button is made ready again.
  useEffect(() => {
    const onShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function checkout() {
    if (busy) return;
    setBusy(true);
    setError("");
    onPress?.(plan);
    try {
      await beforeCheckout?.();
      const { url } = await api(createCheckout, { interval: plan, returnTo });
      // Counted only now that there is a payment page to go to. A press by
      // someone who is signed out, or one that fails, is not a checkout.
      track("checkout_started", { interval: plan });
      leaveFor(url);
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        leaveFor(signInHref(plan));
        return;
      }
      setError(userMessage(err, PAYMENT_PAGE_FAILED));
      setBusy(false);
    }
  }

  const sellsMonthly = (plans as readonly BillingInterval[]).includes("monthly");

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        void checkout();
      }}
    >
      {/* While the payment page is opening, the choice cannot be changed under it. */}
      <fieldset disabled={busy} className="min-w-0 disabled:opacity-60">
        <legend className="mb-2 text-small font-medium">Billing period</legend>
        <div className="grid gap-2">
          {plans.map((p) => {
            const chosen = plan === p;
            const saving = sellsMonthly ? savingPercent(p) : null;
            return (
              // The button, the period and its price share a line. What a longer
              // period saves is a sentence on a line of its own under them, so
              // that on a phone it is not pressed into a narrow column.
              <label
                key={p}
                className={cn(
                  "grid cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-md border px-4 py-3 transition-[border-color,background-color]",
                  chosen ? "border-primary bg-tint-selected" : "border-input hover:border-foreground/50"
                )}
              >
                {/* Drawn with the page's own tokens: in the dark theme the browser's
                    radio filled the unchosen one with a grey disc that read as half
                    chosen. A ring, and a dot in the pressable ink once chosen. A
                    contrast theme gets the system's own radio back. */}
                <input
                  type="radio"
                  name={name}
                  value={p}
                  checked={chosen}
                  onChange={() => setPlan(p)}
                  className="size-[1.125rem] shrink-0 appearance-none rounded-full border border-input bg-card checked:border-primary checked:bg-primary checked:inset-ring-3 checked:inset-ring-card forced-colors:appearance-auto"
                />
                <span className="text-small font-medium">{PLAN[p].name}</span>{" "}
                <span className="text-right">
                  {/* The figure's line keeps its height while the price is not yet known, so nothing moves when it arrives. */}
                  <span className="cb-display block h-8 text-2xl leading-8">{pricing?.prices[p].discounted}</span>{" "}
                  <span className="block text-note text-muted-foreground">{PLAN[p].per}</span>
                </span>{" "}
                {saving !== null && (
                  <span className="col-span-2 col-start-2 text-note text-muted-foreground">
                    This is {saving}% less than {PLAN[p].payments}.
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-2">
        {/* It says what the press does, on every page that sells a plan. */}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Continue to payment
        </Button>
        <span role="status" className="sr-only">
          {busy ? "The payment page is opening." : ""}
        </span>
        {error && (
          <p role="alert" className="text-small text-destructive">
            {error}
          </p>
        )}
        <p className="text-note text-muted-foreground">
          {PLAN[plan].renews} You can cancel at any time from your{" "}
          <Link href={BILLING_HELP_HREF} className="cb-link">
            billing page
          </Link>
          , and you keep Pro until the end of the period that you have paid for.
        </p>
        <p className="text-note text-muted-foreground">
          {pricing && pricing.discountPercent !== null ? REGIONAL_PRICE_NOTE : PRO_PRICE_REGION_NOTE}
        </p>
      </div>
    </form>
  );
}
