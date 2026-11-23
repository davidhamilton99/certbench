"use client";

import { useEffect, useRef } from "react";
import type { Band } from "@/lib/readiness/band";
import { READINESS_THRESHOLDS } from "@/core/constants";
import { cn } from "@/lib/utils";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** The score CertBench treats as ready for the exam, as a percentage. */
export const READY_AT = READINESS_THRESHOLDS.GREEN;

/**
 * A score as a plain bar from 0 to 100, with a thin mark at the readiness
 * target. Every score on CertBench is drawn this way, so an overall result and
 * each domain under it are read against the same target.
 *
 * The bar is drawn at its final length in the markup: it never starts empty,
 * so a score is right in a page with no script, in a paused tab and in a
 * session replay. The fill is the full width scaled from the left, which the
 * browser moves without laying the page out again. Square ends: a bar here is
 * a rule drawn thick.
 */
export function ScoreBar({
  value,
  color,
  size = "sm",
  readyLine = true,
  className,
  barRef,
}: {
  /** 0–100, or null where nothing was asked. */
  value: number | null;
  /** The fill, a CSS colour. */
  color?: string;
  size?: "sm" | "lg";
  readyLine?: boolean;
  className?: string;
  barRef?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div className={cn("relative", size === "lg" ? "h-3" : "h-2", className)} aria-hidden>
      <div className="absolute inset-0 overflow-hidden rounded-xs bg-foreground/[0.09]">
        <div
          ref={barRef}
          className="h-full w-full origin-left"
          style={{
            transform: `scaleX(${(value === null ? 0 : clamp(value)) / 100})`,
            background: color ?? "var(--foreground)",
          }}
        />
      </div>
      {readyLine && (
        <span
          className={cn("absolute w-0.5 bg-foreground/55", size === "lg" ? "-inset-y-1" : "-inset-y-0.5")}
          style={{ left: `${READY_AT}%` }}
        />
      )}
    </div>
  );
}

/**
 * A result: one score, large, with its verdict, over a bar that marks the
 * readiness target, and a sentence saying what the target is. For a learner's
 * own result the figure and its bar count up together once, in answer to
 * finishing; given `from` (an earlier score) they start there, and a second
 * sentence states the change. With `still` nothing counts: the figure is
 * printed and stays, which is how an example on a public page is shown. Fills
 * the width it is given.
 */
export function ScoreLevel({
  score,
  band,
  caption = "Readiness",
  from,
  readyMark = true,
  still = false,
  className,
}: {
  score: number;
  band: Band;
  caption?: string;
  /** An earlier score to count from. */
  from?: number;
  /** The readiness target. Off where a result is too small to call anyone ready. */
  readyMark?: boolean;
  /** Print the result and leave it: no count-up. For an example, not a learner's own result. */
  still?: boolean;
  className?: string;
}) {
  const numRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const target = clamp(score);
  const start = from === undefined ? 0 : clamp(from);

  useEffect(() => {
    if (still) return;
    const num = numRef.current;
    const bar = barRef.current;
    if (!num || !bar) return;
    // Someone who asked for less motion reads the result as it was printed.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const ease = (p: number) => 1 - Math.pow(1 - p, 3);

    let raf = 0;
    let startTs = 0;
    const dur = 600;
    const paint = (p: number) => {
      const value = start + ease(p) * (target - start);
      num.textContent = String(Math.round(value));
      bar.style.transform = `scaleX(${value / 100})`;
    };
    const frame = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = Math.min(1, (ts - startTs) / dur);
      paint(p);
      if (p < 1) raf = requestAnimationFrame(frame);
    };
    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(frame);
    }, 150);
    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      // Leave the result as the markup printed it, whatever frame this stopped on.
      num.textContent = String(target);
      bar.style.transform = `scaleX(${target / 100})`;
    };
  }, [start, target, still]);

  const change = from !== undefined && start !== target ? Math.abs(target - start) : null;

  return (
    <div className={cn("grid gap-3 text-left", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="grid gap-1">
          <span className="cb-label text-muted-foreground">{caption}</span>
          {/* A space that is never drawn: read as plain text (a crawler, a
              copy), the caption, the figure and the verdict stay three words
              apart instead of running together. */}{" "}
          <span className="rv-score text-[3.5rem] leading-[0.95] sm:text-[4rem]">
            {/* The server prints the final score: readable with no script, and in a frozen replay. */}
            <span ref={numRef}>{target}</span>
            <span className="text-[0.5em] text-muted-foreground">%</span>
          </span>
        </div>{" "}
        <span className="pb-1 text-lg font-semibold" style={{ color: band.ink }}>
          {band.label}
        </span>
      </div>

      <ScoreBar value={target} color={band.accent} size="lg" readyLine={readyMark} barRef={barRef} />

      {(readyMark || change !== null) && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {readyMark && <>The readiness target is {READY_AT}%. </>}
          {change !== null && (
            <>
              This result is {change} {change === 1 ? "point" : "points"} {target > start ? "higher" : "lower"} than
              your previous result of {start}%.
            </>
          )}
        </p>
      )}
    </div>
  );
}
