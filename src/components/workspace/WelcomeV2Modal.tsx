"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ArrowRight, Gauge, SunMoon, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEEN_KEY = "certbench-v2-welcome-seen";

const HIGHLIGHTS = [
  { icon: SunMoon, title: "Light & dark mode", body: "Pick your vibe — toggle it anytime from the sidebar." },
  { icon: Gauge, title: "A cinematic readiness reveal", body: "Your diagnostic now lands as a moment, not a number." },
  { icon: Sparkles, title: "A fresh, premium look", body: "Rebuilt end to end — cleaner, faster, and a lot more beautiful." },
];

/**
 * One-time "Welcome to CertBench 2.0" popup for returning users (gated to
 * accounts created before launch via `enabled`, plus a localStorage flag so it
 * shows exactly once per browser). Renders nothing on the server and the first
 * client paint to avoid a hydration mismatch, then decides after mount.
 */
export function WelcomeV2Modal({ enabled }: { enabled: boolean }) {
  // Read "already dismissed" from localStorage without setting state in an
  // effect: getServerSnapshot returns "seen" so SSR + first paint render
  // nothing (no flash, no hydration mismatch), then the client reads for real.
  const seen = useSyncExternalStore(
    () => () => {},
    () => {
      try {
        return localStorage.getItem(SEEN_KEY) ? "seen" : "new";
      } catch {
        return "seen";
      }
    },
    () => "seen"
  );
  const [dismissed, setDismissed] = useState(false);
  const open = enabled && seen === "new" && !dismissed;

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* best-effort */
    }
    setDismissed(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to CertBench 2.0"
      onClick={dismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass w-full max-w-md overflow-hidden rounded-2xl"
        style={{ animation: "rv-pop 0.35s cubic-bezier(0.2,1,0.3,1) both" }}
      >
        {/* Aurora header band */}
        <div className="relative aurora-bg px-6 pb-5 pt-6">
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-medium tracking-wide text-primary">
            <Sparkles className="size-3" />
            CERTBENCH 2.0
          </span>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
            Welcome to the new CertBench
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            We&apos;ve rebuilt CertBench from the ground up. Your account, your
            progress, and everything you&apos;ve studied are exactly where you
            left them.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid gap-3 px-6 py-5">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                <Icon className="size-4 text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6">
          <Button onClick={dismiss} className="w-full" size="lg">
            Take a look
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
