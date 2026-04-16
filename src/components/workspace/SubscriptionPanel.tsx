"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface SubscriptionPanelProps {
  plan: "free" | "pro";
  status: string | null;
  currentPeriodEnd: string | null;
  generationsUsed: number;
  generationsLimit: number | null;
  hasStripeCustomer: boolean;
}

export function SubscriptionPanel({
  plan,
  status,
  currentPeriodEnd,
  generationsUsed,
  generationsLimit,
  hasStripeCustomer,
}: SubscriptionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Could not open billing portal");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  const renewLabel =
    status === "canceled"
      ? "Ends"
      : status === "past_due"
        ? "Payment past due — renews"
        : "Renews";

  const renewDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <Card padding="md">
      <div className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[15px] font-semibold text-text-primary">
              Subscription
            </h2>
            <span
              className={`text-[11px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
                plan === "pro"
                  ? "bg-success-bg text-success"
                  : "bg-bg-page text-text-muted border border-border"
              }`}
            >
              {plan === "pro" ? "Pro" : "Free"}
            </span>
          </div>
          {plan === "pro" && renewDate && (
            <span className="text-[12px] font-mono text-text-muted tabular-nums">
              {renewLabel} {renewDate}
            </span>
          )}
        </div>

        <div className="text-[13px] text-text-secondary">
          {plan === "pro" ? (
            <>Unlimited AI study-material generations.</>
          ) : (
            <>
              {generationsUsed} / {generationsLimit} AI generations used this
              month.
            </>
          )}
        </div>

        {error && (
          <p className="text-[13px] text-danger">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          {hasStripeCustomer ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={openPortal}
              loading={loading}
            >
              Manage billing
            </Button>
          ) : (
            <a
              href="/pricing"
              className="inline-flex items-center justify-center gap-2 font-medium rounded-md transition-colors duration-150 bg-primary text-white hover:bg-primary-dark px-3 py-1.5 text-[13px]"
            >
              Upgrade to Pro
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
