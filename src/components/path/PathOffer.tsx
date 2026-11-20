"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { addCertCheckout, createCheckout, getRegionPricing } from "@/contracts/billing";
import { enrollInPath } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { PASS_GUARANTEE_HREF, PASS_GUARANTEE_TERMS } from "@/lib/pricing/guarantee";
import { Button } from "@/components/ui/button";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { PathCert } from "@/core/path/types";
import { cn } from "@/lib/utils";

/** The plans the offer sells. Monthly comes first: it's the smaller first payment. */
const PLANS = ["monthly", "quarterly"] as const;
type Plan = (typeof PLANS)[number];

const PLAN_COPY: Record<Plan, { name: string; per: string; renews: string }> = {
  monthly: { name: "Monthly", per: "a month", renews: "Renews monthly. Cancel anytime." },
  quarterly: { name: "3 months", per: "every 3 months", renews: "Renews every 3 months. Cancel anytime." },
};

interface Price {
  now: string;
  /** The price before the regional discount, when there is one. */
  was: string | null;
}

/** "$39" → 39, or null when the string isn't a plain amount. */
function amount(price: string): number | null {
  const n = Number.parseFloat(price.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * The one ask on the path, made after the readiness checkpoint: the rest of
 * the path, monthly or for a three-month exam cycle. A Pro member who hasn't
 * added this exam yet is offered the exam instead of a second plan.
 */
export function PathOffer({
  cert,
  certId,
  examName,
  remainingStops,
  questionCount,
  proPlan,
  examDate,
  context,
  labCount,
}: {
  cert: PathCert;
  certId: string | null;
  examName: string;
  remainingStops: number;
  questionCount: number;
  proPlan: boolean;
  examDate: string | null;
  context: "reveal" | "home";
  /** Labs in the exam's library, when it has one. */
  labCount?: number;
}) {
  const [prices, setPrices] = useState<Record<Plan, Price>>({
    monthly: { now: "$19", was: null },
    quarterly: { now: "$39", was: null },
  });
  const [plan, setPlan] = useState<Plan>("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("path_offer_viewed", { cert, context });
  }, [cert, context]);

  // Region pricing for display; checkout applies the same discount itself.
  useEffect(() => {
    let live = true;
    api(getRegionPricing, {})
      .then((r) => {
        if (!live) return;
        const read = (p: { original: string; discounted: string } | undefined, fallback: Price): Price =>
          p ? { now: p.discounted, was: r.discountPercent ? p.original : null } : fallback;
        setPrices((prev) => ({
          monthly: read(r.prices.monthly, prev.monthly),
          quarterly: read(r.prices.quarterly, prev.quarterly),
        }));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  // Back from Stripe via the browser: re-arm the button.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  async function unlock() {
    if (!certId) return;
    setBusy(true);
    setError("");
    track("path_offer_clicked", proPlan ? { cert, context, offer: "add_exam" } : { cert, context, offer: "pro", interval: plan });
    track("checkout_started", { interval: proPlan ? "cert_addon" : plan });
    try {
      if (proPlan) {
        const { url } = await api(addCertCheckout, { certId });
        window.location.href = url;
        return;
      }
      // Pro access is per exam: make this the exam the purchase unlocks.
      await api(enrollInPath, { cert, examDate });
      const { url } = await api(createCheckout, { interval: plan, returnTo: `path/${cert}` });
      window.location.href = url;
    } catch (err) {
      if (err instanceof ApiError && err.code === "unauthorized") {
        window.location.href = `/login?next=/path/${cert}`;
        return;
      }
      setError(err instanceof ApiError ? err.message : "Couldn't open checkout. Try again.");
      setBusy(false);
    }
  }

  const labs = labCount
    ? `All ${labCount} hands-on PBQ labs, one closing every domain`
    : "A hands-on PBQ lab closing every domain";
  const rehearsals = `Timed exam rehearsals: ${REHEARSAL_FORMATS.full.questions} questions in ${REHEARSAL_FORMATS.full.minutes} minutes, any time`;
  const includes = proPlan
    ? [
        `All ${remainingStops} remaining stops of your ${examName} path`,
        labs,
        rehearsals,
        "Uses your current Pro plan",
      ]
    : [
        `All ${remainingStops} remaining stops of your ${examName} path`,
        labs,
        rehearsals,
        `All ${questionCount.toLocaleString()} ${examName} questions, with spaced review`,
      ];

  // What three months cost against three monthly payments, from the prices shown.
  const monthly = amount(prices.monthly.now);
  const quarterly = amount(prices.quarterly.now);
  const saving = monthly && quarterly && quarterly < 3 * monthly ? Math.round((1 - quarterly / (3 * monthly)) * 100) : null;

  return (
    <div className="glass relative isolate overflow-hidden rounded-[2rem] border-primary/35 p-6 sm:p-9">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[22rem] w-[38rem] max-w-[200%] -translate-x-1/2 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_26%,transparent),transparent)]"
      />
      <div className="relative grid gap-5">
        <div className="grid gap-1.5">
          <h3 className="cb-display text-balance text-[1.9rem] sm:text-[2.6rem]">
            {proPlan ? `Add ${examName} to your plan` : "Unlock the rest of your path"}
          </h3>
          <p className="text-muted-foreground">
            {proPlan
              ? `One payment adds ${examName} to the Pro plan you already have.`
              : "Everything from here to exam day, in the same short stops."}
          </p>
        </div>

        <ul className="grid gap-2.5 text-[15px]">
          {includes.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
              {line}
            </li>
          ))}
        </ul>

        {proPlan ? (
          <div className="flex items-end gap-2">
            {prices.quarterly.was && (
              <span className="pb-1 text-lg text-muted-foreground line-through">{prices.quarterly.was}</span>
            )}
            <span className="cb-display text-5xl">{prices.quarterly.now}</span>
            <span className="pb-1.5 text-sm text-muted-foreground">one time</span>
          </div>
        ) : (
          <fieldset className="grid gap-2.5 sm:grid-cols-2">
            <legend className="sr-only">Plan</legend>
            {PLANS.map((p) => {
              const selected = plan === p;
              return (
                <label
                  key={p}
                  className={cn(
                    "relative grid cursor-pointer gap-1.5 rounded-2xl border bg-foreground/[0.02] px-4 py-4 transition-[border-color,background-color,box-shadow] duration-150",
                    "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    selected ? "border-primary bg-primary/[0.08] ring-1 ring-primary/40" : "hover:border-primary/50"
                  )}
                >
                  <input
                    type="radio"
                    name={`plan-${cert}-${context}`}
                    value={p}
                    checked={selected}
                    onChange={() => setPlan(p)}
                    className="sr-only"
                  />
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span
                        aria-hidden
                        className={cn(
                          "size-4 shrink-0 rounded-full border transition-[border-width,border-color] duration-150",
                          selected ? "border-[5px] border-primary" : "border-muted-foreground/50"
                        )}
                      />
                      {PLAN_COPY[p].name}
                    </span>
                    {p === "quarterly" && saving !== null && (
                      <span className="rounded-full bg-success/15 px-2 py-0.5 font-mono text-[11px] font-medium text-success">
                        Save {saving}%
                      </span>
                    )}
                  </span>
                  <span className="flex flex-wrap items-baseline gap-x-1.5">
                    {prices[p].was && (
                      <span className="text-sm text-muted-foreground line-through">{prices[p].was}</span>
                    )}
                    <span className="cb-display text-3xl">{prices[p].now}</span>
                    <span className="text-sm text-muted-foreground">{PLAN_COPY[p].per}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        <div className="grid gap-2">
          <Button size="lg" className="h-12 w-full text-base" disabled={busy || !certId} onClick={unlock}>
            {busy ? (
              <>
                <Loader2 className="animate-spin" />
                Opening secure checkout…
              </>
            ) : (
              <>
                {proPlan ? `Add ${examName}` : "Unlock my path"}
                <ArrowRight />
              </>
            )}
          </Button>
          {error && (
            <p role="alert" className="text-center text-sm text-destructive">
              {error}
            </p>
          )}
          {!proPlan && <p className="text-center text-xs text-muted-foreground">{PLAN_COPY[plan].renews}</p>}
        </div>

        {!proPlan && (
          <p className="text-balance text-center text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mr-1 inline size-4 -translate-y-px align-middle text-success" />
            <span className="font-medium text-success">Pass guarantee:</span> {PASS_GUARANTEE_TERMS}{" "}
            <a
              href={PASS_GUARANTEE_HREF}
              target="_blank"
              rel="noopener"
              className="underline underline-offset-4 hover:text-foreground"
            >
              Terms
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
