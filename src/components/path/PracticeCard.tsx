"use client";

import type { ReactNode } from "react";
import { RotateCcw, type LucideIcon } from "lucide-react";
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
 * On a Pro member's home screen, under the way on: what they can practice
 * whenever they like, a row each (the practice exam, the list of labs, the
 * questions to review), so that none of it competes with the next step.
 *
 * Each row's button is named by its own word and then the row's title ("Start:
 * Practice exam"), so three buttons that read "Start", "Open" and "Review" are
 * told apart when they are listed out of their rows.
 */
export function PracticeCard({ rows }: { rows: PracticeRow[] }) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="practice-any-time" className="glass rounded-lg px-2 pb-2 pt-4 sm:px-3">
      <h2 id="practice-any-time" className="cb-label px-3 text-muted-foreground sm:px-4">
        Practice at any time
      </h2>
      <ul className="mt-1 divide-y divide-border">
        {rows.map(({ key, Icon, title, detail, action, onAction }) => (
          <li key={key} className="flex items-center gap-3.5 px-3 py-3.5 sm:px-4">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary"
            >
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-small font-semibold">{title}</p>
              <p className="mt-0.5 text-small text-muted-foreground">{detail}</p>
            </div>
            <Button variant="outline" className="shrink-0" onClick={onAction} aria-label={`${action}: ${title}`}>
              {action}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** After a practice exam: go over the questions it missed, a round at a time. */
export function ReviewMissesCard({ count, onReview }: { count: number; onReview: () => void }) {
  const round = Math.min(count, PRACTICE_SIZE);
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary"
        >
          <RotateCcw className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-small text-muted-foreground">
            You answered {count} {count === 1 ? "question" : "questions"} incorrectly.
          </p>
          <p className="cb-statement mt-1">Review the questions that you missed</p>
        </div>
      </div>
      <Button size="lg" variant="outline" className="w-full sm:w-auto" onClick={onReview}>
        Review {round} {round === 1 ? "question" : "questions"}
      </Button>
    </div>
  );
}
