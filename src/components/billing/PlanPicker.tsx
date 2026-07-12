"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  createCheckout,
  getRegionPricing,
  type BillingInterval,
} from "@/contracts/billing";
import type { ContractOutput } from "@/contracts/common";
import { ApiError } from "@/contracts/common";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type RegionPricing = ContractOutput<typeof getRegionPricing>;

const OPTIONS: {
  interval: BillingInterval;
  key: keyof RegionPricing["prices"];
  label: string;
  per: string;
  note?: string;
}[] = [
  { interval: "monthly", key: "monthly", label: "Monthly", per: "/month" },
  {
    interval: "quarterly",
    key: "quarterly",
    label: "3 months",
    per: "one exam cycle",
    note: "Most popular",
  },
  { interval: "annual", key: "annual", label: "Annual", per: "/year", note: "Best value" },
];

/** Fallback list prices shown before the region lookup resolves. */
const FALLBACK: RegionPricing = {
  discountPercent: null,
  prices: {
    monthly: { original: "$19", discounted: "$19" },
    quarterly: { original: "$39", discounted: "$39" },
    annual: { original: "$99", discounted: "$99" },
  },
};

/**
 * Interval picker + checkout. Prices are regionally adjusted (purchasing
 * power) and shown plainly as THE price — no strikethroughs or discount
 * banners; big companies treat regional pricing as invisible, and so do we.
 * A single muted footnote explains the adjustment. The authoritative price
 * is derived server-side at checkout from the request IP.
 */
export function PlanPicker({ ctaLabel = "Upgrade to Pro" }: { ctaLabel?: string }) {
  const [interval, setInterval] = useState<BillingInterval>("quarterly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [region, setRegion] = useState<RegionPricing>(FALLBACK);

  useEffect(() => {
    let active = true;
    api(getRegionPricing, {})
      .then((r) => active && setRegion(r))
      .catch(() => {
        /* list-price fallback already set */
      });
    return () => {
      active = false;
    };
  }, []);

  async function checkout() {
    setBusy(true);
    setError("");
    try {
      const { url } = await api(createCheckout, { interval });
      window.location.href = url;
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        window.location.href = "/register";
        return;
      }
      setError(err instanceof ApiError ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  const regional = region.discountPercent !== null;

  return (
    <div className="grid gap-4">
      <div className="grid gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.interval}
            type="button"
            role="radio"
            aria-checked={interval === o.interval}
            onClick={() => setInterval(o.interval)}
            className={cn(
              "flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors",
              interval === o.interval
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "hover:border-muted-foreground/40"
            )}
          >
            <span className="flex items-center gap-2 font-medium">
              {o.label}
              {o.note && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {o.note}
                </span>
              )}
            </span>
            <span>
              <span className="font-mono text-base font-semibold">
                {region.prices[o.key].discounted}
              </span>{" "}
              <span className="text-xs text-muted-foreground">{o.per}</span>
            </span>
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="lg" onClick={checkout} disabled={busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {ctaLabel}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        {regional
          ? "Prices shown in USD, adjusted for your region. Cancel anytime."
          : "Prices in USD. Cancel anytime from your billing portal."}
      </p>
    </div>
  );
}
