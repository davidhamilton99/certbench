"use client";

import { useEffect, useRef } from "react";
import type { Band } from "@/lib/readiness/band";
import { cn } from "@/lib/utils";

/* Dial geometry: a 300° arc with a 60° gap centred at the bottom, r=92 in a
 * 240 viewBox. Shared by any instrument surface that shows a single score. */
const CX = 120;
const CY = 120;
const R = 92;
const A0 = 120; // start angle (degrees), sweeps clockwise 300°
const SWEEP = 300;

// Round to 2 decimals so server- and client-rendered coordinates stringify to
// identical strings — floating-point reprs otherwise differ and trip a
// hydration mismatch on the SSR-ed tick/arc geometry.
const round = (n: number) => Math.round(n * 100) / 100;

function arcPoint(t: number, r: number): [number, number] {
  const a = ((A0 + t * SWEEP) * Math.PI) / 180;
  return [round(CX + r * Math.cos(a)), round(CY + r * Math.sin(a))];
}
function arcPath(t0: number, t1: number, r: number): string {
  const [x0, y0] = arcPoint(t0, r);
  const [x1, y1] = arcPoint(t1, r);
  const large = (t1 - t0) * SWEEP > 180 ? 1 : 0;
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

const TICKS = Array.from({ length: 41 }, (_, i) => {
  const t = i / 40;
  const major = i % 10 === 0;
  const ready = i === 30; // the 75% "exam-ready" mark
  const [ix, iy] = arcPoint(t, R - 12);
  const [ox, oy] = arcPoint(t, R - (major || ready ? 20 : 16));
  return { ix, iy, ox, oy, major, ready };
});

/**
 * The readiness instrument dial — a 300° arc whose glowing sweep and centre
 * number count up together on mount, with a comet head at the leading edge and
 * an "exam-ready" tick at 75. Reusable across CertBench 2.0 surfaces; the band
 * drives every accent through the injected --rv-accent* custom properties.
 */
export function ReadinessDial({
  score,
  band,
  caption = "Readiness",
  className,
}: {
  score: number;
  band: Band;
  caption?: string;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const sweepRef = useRef<SVGPathElement>(null);
  const cometRef = useRef<SVGCircleElement>(null);
  const target = Math.max(0, Math.min(100, Math.round(score)));

  useEffect(() => {
    const num = numRef.current;
    const sweep = sweepRef.current;
    const comet = cometRef.current;
    const root = rootRef.current;
    if (!num || !sweep || !comet || !root) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ease = (p: number) => 1 - Math.pow(1 - p, 3);

    let raf = 0;
    let startTs = 0;
    const dur = reduce ? 0 : 1650;
    const delay = reduce ? 0 : 520;

    const paint = (p: number) => {
      const e = ease(p);
      num.textContent = String(Math.round(e * target));
      const frac = (e * target) / 100;
      sweep.setAttribute("stroke-dasharray", `${frac * 1000} 1000`);
      const [cx, cy] = arcPoint(frac, R);
      comet.setAttribute("cx", String(cx));
      comet.setAttribute("cy", String(cy));
      comet.style.opacity = frac > 0.01 ? "1" : "0";
    };

    const frame = (ts: number) => {
      if (!startTs) startTs = ts;
      const p = dur === 0 ? 1 : Math.min(1, (ts - startTs) / dur);
      paint(p);
      if (p < 1) raf = requestAnimationFrame(frame);
      else root.classList.add("rv-scored");
    };

    const timer = window.setTimeout(() => {
      raf = requestAnimationFrame(frame);
    }, delay);

    return () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target]);

  const [cx0, cy0] = arcPoint(0, R);
  const [lx, ly] = arcPoint(0.75, R + 12);

  return (
    <div
      ref={rootRef}
      className={cn("rv-dial relative mx-auto aspect-square w-[min(360px,78vw)]", className)}
    >
      <div className="rv-scan" aria-hidden />
      <svg viewBox="0 0 240 240" className="absolute inset-0 size-full [overflow:visible]" aria-hidden>
        <path
          className="rv-track"
          d={arcPath(0, 1, R)}
          fill="none"
          strokeWidth={13}
          strokeLinecap="round"
        />
        {TICKS.map((t, i) => (
          <line
            key={i}
            className={cn("rv-tick", t.major && "major", t.ready && "ready")}
            x1={t.ix}
            y1={t.iy}
            x2={t.ox}
            y2={t.oy}
            strokeWidth={t.ready ? 2.4 : t.major ? 1.8 : 1}
            strokeLinecap="round"
          />
        ))}
        <text
          className="rv-ready-label"
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          75 · READY
        </text>
        <path
          ref={sweepRef}
          className="rv-sweep"
          d={arcPath(0, 1, R)}
          fill="none"
          strokeWidth={13}
          strokeLinecap="round"
          pathLength={1000}
          strokeDasharray="0 1000"
        />
        <circle ref={cometRef} className="rv-comet" r={6.5} cx={cx0} cy={cy0} style={{ opacity: 0 }} />
      </svg>
      <div className="absolute inset-0 grid content-center justify-items-center gap-0.5 text-center">
        <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--rv-muted-2)]">
          {caption}
        </div>
        <div className="rv-score leading-[0.9]" style={{ fontSize: "clamp(48px, 14vw, 72px)" }}>
          <span ref={numRef}>0</span>
          <span className="text-[0.42em] text-[var(--rv-muted)]">%</span>
        </div>
        <div className="rv-band text-[17px] font-semibold">{band.label}</div>
      </div>
    </div>
  );
}
