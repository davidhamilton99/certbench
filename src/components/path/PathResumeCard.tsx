import Link from "next/link";
import { Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { ProgressBar } from "@/components/ui/progress-bar";

/**
 * The study path's place on the Pro dashboard: where the learner is on it and
 * one button back in. The study path is the main way to study; this card says
 * so first.
 */
export function PathResumeCard({
  href,
  examName,
  done,
  total,
  nextTitle,
}: {
  href: string;
  examName: string;
  /** Steps finished, when known (saved progress may live only on a device). */
  done: number | null;
  total: number | null;
  nextTitle: string | null;
}) {
  const started = done !== null && done > 0;
  const pct = done !== null && total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="glass rounded-lg p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span
            aria-hidden
            className="flex size-11 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary"
          >
            <Route className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-small text-muted-foreground">
              Your {examName} study path.
              {started && total ? ` You have completed ${done} of ${total} steps.` : ""}
            </p>
            {/* It wraps and is never cut short: the title says which step is next. */}
            <p className="cb-statement mt-0.5">
              {nextTitle
                ? `Next step: ${nextTitle}`
                : started
                  ? "Continue from where you stopped"
                  : "Begin with the introductory questions"}
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={href}>
            {started ? "Continue" : "Start the study path"}
            <LinkArrow />
          </Link>
        </Button>
      </div>
      {/* The sentence above gives the figure; the bar draws it, at its final length. */}
      {started && <ProgressBar value={pct} still className="mt-4" />}
    </div>
  );
}
