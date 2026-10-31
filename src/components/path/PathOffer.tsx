"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { addCertCheckout, createCheckout, getRegionPricing } from "@/contracts/billing";
import { completeOnboarding } from "@/contracts/user";
import { ApiError } from "@/contracts/common";
import { PASS_GUARANTEE_HREF } from "@/lib/pricing/guarantee";
import { Button } from "@/components/ui/button";
import type { PathCert } from "@/core/path/types";

/**
 * The one ask on the path, made after the readiness checkpoint: the rest of
 * the path for one exam cycle. A Pro member who hasn't added this exam yet is
 * offered the exam instead of a second plan.
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
}: {
  cert: PathCert;
  certId: string | null;
  examName: string;
  remainingStops: number;
  questionCount: number;
  proPlan: boolean;
  examDate: string | null;
  context: "reveal" | "home";
}) {
  const [price, setPrice] = useState<{ now: string; was: string | null }>({ now: "$39", was: null });
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
        const q = r.prices.quarterly;
        setPrice({ now: q.discounted, was: r.discountPercent ? q.original : null });
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
    track("path_offer_clicked", { cert, context, offer: proPlan ? "add_exam" : "pro" });
    track("checkout_started", { interval: proPlan ? "cert_addon" : "quarterly" });
    try {
      if (proPlan) {
        const { url } = await api(addCertCheckout, { certId });
        window.location.href = url;
        return;
      }
      // Pro access is per exam: make sure this one is theirs before paying.
      await api(completeOnboarding, { certId, examDate });
      const { url } = await api(createCheckout, { interval: "quarterly", returnTo: `path/${cert}` });
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

  const includes = proPlan
    ? [`All ${remainingStops} remaining stops of your ${examName} path`, "Domain practice and checkpoints", "Uses your current Pro plan"]
    : [
        `All ${remainingStops} remaining stops of your ${examName} path`,
        `Practice across all ${questionCount.toLocaleString()} ${examName} questions`,
        "Timed practice exams, PBQ labs and spaced review",
      ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-b from-primary/[0.09] to-card p-6 shadow-sm sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 left-1/2 h-44 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative grid gap-5">
        <div className="grid gap-1.5">
          <h3 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">
            {proPlan ? `Add ${examName} to your plan` : "Unlock the rest of your path"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {proPlan
              ? `One payment adds ${examName} to the Pro plan you already have.`
              : "Everything from here to exam day, in the same short stops."}
          </p>
        </div>

        <ul className="grid gap-2 text-sm">
          {includes.map((line) => (
            <li key={line} className="flex items-start gap-2.5">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={2.5} />
              {line}
            </li>
          ))}
        </ul>

        <div className="flex items-end gap-2">
          {price.was && (
            <span className="pb-1 text-lg text-muted-foreground line-through">{price.was}</span>
          )}
          <span className="font-display text-4xl font-bold tracking-tight">{price.now}</span>
          <span className="pb-1.5 text-sm text-muted-foreground">
            {proPlan ? "one time" : "for 3 months"}
          </span>
        </div>

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
          {!proPlan && (
            <p className="text-center text-xs text-muted-foreground">
              Renews every 3 months. Cancel anytime.
            </p>
          )}
        </div>

        {!proPlan && (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-success">
            <ShieldCheck className="size-4" />
            Pass guarantee
            <span className="text-muted-foreground">·</span>
            <a
              href={PASS_GUARANTEE_HREF}
              target="_blank"
              rel="noopener"
              className="text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Terms
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
