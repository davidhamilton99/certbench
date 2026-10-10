"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Post-checkout landing, shown on /upgrade?upgraded=true (a paywall-exempt
 * route, so a just-paid user is never bounced by the Pro gate).
 *
 *  - Pro already active  -> celebrate, then forward into the app.
 *  - Not yet active      -> the activation webhook is still in flight; poll a
 *    few times with router.refresh() until the server re-renders as Pro, then
 *    the Pro branch takes over. Falls back to a manual button if it lags.
 */
export function UpgradeSuccess({ isPro }: { isPro: boolean }) {
  const router = useRouter();
  const tries = useRef(0);

  useEffect(() => {
    if (isPro) {
      const t = setTimeout(() => router.push("/dashboard"), 1600);
      return () => clearTimeout(t);
    }
    // Webhook lag: re-pull the server render until Pro flips on (~16s cap).
    if (tries.current >= 8) return;
    const t = setTimeout(() => {
      tries.current += 1;
      router.refresh();
    }, 2000);
    return () => clearTimeout(t);
  }, [isPro, router]);

  if (isPro) {
    return (
      <div className="mx-auto grid w-full max-w-md justify-items-center gap-5 py-16 text-center">
        <span className="relative flex size-16 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <span className="relative flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-success text-primary-foreground">
            <Sparkles className="size-8" />
          </span>
        </span>
        <h1 className="text-balance font-display text-3xl font-bold leading-[1.1] tracking-tight">
          You&apos;re in.
        </h1>
        <p className="text-sm text-muted-foreground">
          Your plan is unlocked. Taking you to it…
        </p>
        <Button size="lg" className="h-12 w-full text-base" onClick={() => router.push("/dashboard")}>
          Go to my plan
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-md justify-items-center gap-5 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Loader2 className="size-8 animate-spin" />
      </span>
      <h1 className="text-balance font-display text-2xl font-bold leading-tight tracking-tight">
        Payment received.
      </h1>
      <p className="text-sm text-muted-foreground">Unlocking your plan…</p>
      <Button
        size="lg"
        variant="outline"
        className="h-12 w-full text-base"
        onClick={() => router.push("/dashboard")}
      >
        Go to my plan
      </Button>
    </div>
  );
}
