"use client";

import { useEffect, useRef } from "react";
import { CalendarClock, ListChecks, Target } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The hero's living miniature of the dashboard: readiness ring draws in,
 * the score counts up, domain bars stagger to their levels, and today's
 * plan materialises. Pure spectacle — it asks nothing of the visitor and
 * demonstrates in ~2 seconds what the product does.
 *
 * SSR renders the finished state (SEO/no-JS safe); on mount the Web
 * Animations API replays the assembly. All animation happens through
 * refs — no React state, so the react-compiler purity rules stay happy.
 * Respects prefers-reduced-motion by simply not animating.
 */

const DOMAINS = [
  { code: "1.0", name: "General Security Concepts", weight: 12, score: 74 },
  { code: "2.0", name: "Threats & Mitigations", weight: 22, score: 68 },
  { code: "3.0", name: "Security Architecture", weight: 18, score: 61 },
  { code: "4.0", name: "Security Operations", weight: 28, score: 52 },
  { code: "5.0", name: "Program Management", weight: 20, score: 66 },
] as const;

const WEAKEST = "4.0";
/** Weighted by exam blueprint — matches how the real score works. */
const SCORE = Math.round(
  DOMAINS.reduce((sum, d) => sum + (d.score * d.weight) / 100, 0)
);

const PLAN = [
  { icon: ListChecks, label: "Review", detail: "14 cards due today" },
  { icon: Target, label: "Drill", detail: "Security Operations — weakest domain" },
  { icon: CalendarClock, label: "Full exam", detail: "scheduled Saturday" },
] as const;

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export function HeroShowcase() {
  const rootRef = useRef<HTMLDivElement>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Hidden documents (background tabs, headless renderers) freeze the
    // animation timeline — starting there would leave the card stuck at
    // opacity 0. Show the finished state instead, and play the assembly
    // when the visitor actually arrives.
    const animations: Animation[] = [];
    const scoreNode = scoreRef.current;
    let raf = 0;
    let started = false;

    const start = () => {
      if (started) return;
      started = true;

      animations.push(
        root.animate(
          [
            { opacity: 0, transform: "translateY(16px)" },
            { opacity: 1, transform: "none" },
          ],
          { duration: 550, easing: EASE, fill: "backwards" }
        )
      );

      root.querySelectorAll<HTMLElement>("[data-anim='domain']").forEach((el, i) => {
        animations.push(
          el.animate(
            [
              { opacity: 0, transform: "translateX(-8px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 400, delay: 250 + i * 90, easing: EASE, fill: "backwards" }
          )
        );
      });

      root.querySelectorAll<HTMLElement>("[data-anim='bar']").forEach((el, i) => {
        animations.push(
          el.animate([{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }], {
            duration: 700,
            delay: 350 + i * 90,
            easing: EASE,
            fill: "backwards",
          })
        );
      });

      root.querySelectorAll<HTMLElement>("[data-anim='plan']").forEach((el, i) => {
        animations.push(
          el.animate(
            [
              { opacity: 0, transform: "translateY(8px)" },
              { opacity: 1, transform: "none" },
            ],
            { duration: 400, delay: 950 + i * 110, easing: EASE, fill: "backwards" }
          )
        );
      });

      const ring = ringRef.current;
      if (ring) {
        animations.push(
          ring.animate(
            [
              { strokeDashoffset: RING_C },
              { strokeDashoffset: RING_C * (1 - SCORE / 100) },
            ],
            { duration: 1000, delay: 300, easing: EASE, fill: "backwards" }
          )
        );
      }

      // Score count-up via direct textContent writes — no re-renders.
      const scoreEl = scoreNode;
      if (scoreEl) {
        const t0 = performance.now();
        const DURATION = 1000;
        const DELAY = 300;
        const tick = (now: number) => {
          const t = Math.min(1, Math.max(0, (now - t0 - DELAY) / DURATION));
          const eased = 1 - Math.pow(1 - t, 3);
          scoreEl.textContent = String(Math.round(eased * SCORE));
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    };

    const onVisible = () => {
      if (document.visibilityState === "visible") start();
    };
    if (document.visibilityState === "visible") start();
    else document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      cancelAnimationFrame(raf);
      animations.forEach((a) => a.cancel());
      if (scoreNode) scoreNode.textContent = String(SCORE);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-label={`Example dashboard: readiness ${SCORE} percent with per-domain breakdown`}
      className="relative w-full max-w-md rounded-2xl border bg-card/80 p-6 shadow-xl backdrop-blur"
    >
      {/* sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-foreground/[0.04] to-transparent"
      />

      {/* Header: cert + readiness ring */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] text-muted-foreground">
            CompTIA Security+ · SY0-701
          </p>
          <p className="mt-1 text-sm font-medium">Readiness</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Exam in 24 days
          </p>
        </div>
        <div className="relative grid size-20 shrink-0 place-items-center">
          <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90">
            <circle
              cx="32"
              cy="32"
              r={RING_R}
              fill="none"
              strokeWidth="5"
              className="stroke-muted"
            />
            <circle
              ref={ringRef}
              cx="32"
              cy="32"
              r={RING_R}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - SCORE / 100)}
              className="stroke-primary"
            />
          </svg>
          <span className="font-mono text-xl font-semibold">
            <span ref={scoreRef}>{SCORE}</span>
            <span className="text-xs text-muted-foreground">%</span>
          </span>
        </div>
      </div>

      {/* Domain bars */}
      <div className="mt-5 grid gap-2.5">
        {DOMAINS.map((d) => {
          const weakest = d.code === WEAKEST;
          return (
            <div key={d.code} data-anim="domain">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-xs">
                  <span className="mr-1.5 font-mono text-[10px] text-muted-foreground">
                    {d.code}
                  </span>
                  {d.name}
                  {weakest && (
                    <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 py-px text-[10px] font-medium text-warning">
                      weakest
                    </span>
                  )}
                </p>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                  {d.score}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  data-anim="bar"
                  style={{ width: `${d.score}%` }}
                  className={cn(
                    "h-full origin-left rounded-full",
                    weakest ? "bg-warning" : "bg-primary"
                  )}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Today's plan */}
      <div className="mt-5 border-t pt-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Today&apos;s plan
        </p>
        <div className="mt-2.5 grid gap-2">
          {PLAN.map(({ icon: Icon, label, detail }) => (
            <div
              key={label}
              data-anim="plan"
              className="flex items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2"
            >
              <Icon className="size-3.5 shrink-0 text-primary" />
              <p className="truncate text-xs">
                <span className="font-medium">{label}</span>
                <span className="text-muted-foreground"> · {detail}</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Rebuilt every day from your actual performance.
        </p>
      </div>
    </div>
  );
}
