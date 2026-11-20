"use client";

import type { CSSProperties } from "react";
import { ReadinessDial } from "@/components/instrument/ReadinessDial";
import { bandFor, bandVars } from "@/lib/readiness/band";
import { cn } from "@/lib/utils";
import { InView } from "./InView";

/**
 * "Know when you're ready": the path's own readiness instrument, sweeping up
 * from an earlier score once it's on screen, with the domain read-out beside
 * it. An illustration (a sample rehearsal), so it's hidden from screen readers.
 */
export function ReadinessShowcase({
  domains,
  score,
  from,
}: {
  domains: { number: string; title: string; score: number }[];
  score: number;
  from: number;
}) {
  const band = bandFor(score);
  return (
    <InView as="section" className="relative overflow-hidden py-20 sm:py-28">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[38rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--success)_16%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div className="grid gap-5 text-center lg:text-left">
          <p className="cb-rise text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Readiness</p>
          <h2
            className="cb-rise cb-display text-balance text-[2.6rem] sm:text-6xl"
            style={{ "--rise-delay": "60ms" } as CSSProperties}
          >
            Know when
            <br />
            you&apos;re ready.
          </h2>
          <p
            className="cb-rise mx-auto max-w-md text-balance text-lg text-muted-foreground lg:mx-0"
            style={{ "--rise-delay": "120ms" } as CSSProperties}
          >
            A score weighted like the real exam, domain by domain.
          </p>
        </div>

        <div
          aria-hidden
          className="cb-rise glass grid gap-8 rounded-[2rem] p-6 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center sm:p-10"
          style={{ ...bandVars(band), "--rise-delay": "160ms" } as CSSProperties}
        >
          <InView mount placeholder={<div className="mx-auto aspect-square w-[min(250px,70vw)]" />}>
            <ReadinessDial score={score} from={from} band={band} caption="Rehearsal" size={250} />
          </InView>
          <ul className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
            {domains.map((d, k) => {
              const b = bandFor(d.score);
              return (
                <li key={d.number} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{d.number.replace(/\.0$/, "")}</span>
                      {d.title}
                    </span>
                    <span className="font-mono text-xs tabular-nums" style={{ color: b.accent }}>
                      {d.score}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
                    <InView mount>
                      <div
                        className={cn("animate-bar h-1.5 rounded-full")}
                        style={{
                          width: `${d.score}%`,
                          background: `linear-gradient(90deg, ${b.dim}, ${b.accent})`,
                          animationDelay: `${300 + k * 90}ms`,
                        }}
                      />
                    </InView>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </InView>
  );
}
