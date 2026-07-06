"use client";

import { useEffect, useState } from "react";
import { Globe, Loader2, Sparkles } from "lucide-react";
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

/** Fallback full prices shown before the region lookup resolves. */
const FALLBACK: RegionPricing = {
  discountPercent: null,
  prices: {
    monthly: { original: "$19", discounted: "$19" },
    quarterly: { original: "$39", discounted: "$39" },
    annual: { original: "$99", discounted: "$99" },
  },
};

/**
 * Interval picker + checkout. Prices adjust for the visitor's region
 * (purchasing-power parity); the real discount is applied server-side at
 * checkout from the request IP, so the displayed price is informational.
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
        /* full price fallback already set */
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

  const discounted = region.discountPercent !== null;

  return (
    <div className="grid gap-4">
      {discounted && (
        <div className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs">
          <Globe className="mt-0.5 size-3.5 shrink-0 text-success" />
          <span>
            <span className="font-medium text-success">
              {region.discountPercent}% regional discount applied
            </span>{" "}
            — pricing adjusted for your country, at checkout too.
          </span>
        </div>
      )}

      <div className="grid gap-2">
        {OPTIONS.map((o) => {
          const price = region.prices[o.key];
          const cut = price.original !== price.discounted;
          return (
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
              <span className="flex items-baseline gap-1.5">
                {cut && (
                  <span className="font-mono text-xs text-muted-foreground line-through">
                    {price.original}
                  </span>
                )}
                <span className="font-mono text-base font-semibold">
                  {price.discounted}
                </span>{" "}
                <span className="text-xs text-muted-foreground">{o.per}</span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button size="lg" onClick={checkout} disabled={busy} className="w-full">
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {ctaLabel}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Cancel anytime from your billing portal.
      </p>
    </div>
  );
}
