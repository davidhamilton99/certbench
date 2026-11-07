"use client";

import type { ReactNode } from "react";
import { ArrowRight, RotateCcw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRACTICE_SIZE } from "@/core/path/plan";

export interface PracticeRow {
  key: string;
  Icon: LucideIcon;
  title: string;
  /** One line under the title: where they stand with it. */
  detail: ReactNode;
  action: string;
  onAction: () => void;
}

/**
 * On a Pro home, under the way on: what they can practise whenever they like,
 * a row each (the exam rehearsal, the lab library, their misses), so none of
 * it competes with the next stop.
 */
export function PracticeCard({ rows }: { rows: PracticeRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="practice-any-time" className="glass rounded-3xl px-2 pb-2 pt-4 sm:px-3">
      <h2
        id="practice-any-time"
        className="px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground sm:px-4"
      >
        Practice any time
      </h2>
      <ul className="mt-1 divide-y divide-border/70">
        {rows.map(({ key, Icon, title, detail, action, onAction }) => (
          <li key={key} className="flex items-center gap-3.5 px-3 py-3.5 sm:px-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-semibold tracking-tight">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
            </div>
            <Button variant="outline" className="shrink-0" onClick={onAction} aria-label={`${action}: ${title}`}>
              {action}
              <ArrowRight />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** After a rehearsal: go over what it missed, a round at a time. */
export function ReviewMissesCard({ count, onReview }: { count: number; onReview: () => void }) {
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <RotateCcw className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Review · {count} missed
          </p>
          <p className="mt-1 text-balance font-display text-lg font-semibold leading-snug tracking-tight">
            Go over this rehearsal&apos;s misses
          </p>
        </div>
      </div>
      <Button size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto" onClick={onReview}>
        Review {Math.min(count, PRACTICE_SIZE)}
        <ArrowRight />
      </Button>
    </div>
  );
}
