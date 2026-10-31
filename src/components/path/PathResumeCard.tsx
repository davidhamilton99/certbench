import Link from "next/link";
import { ArrowRight, Route } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The guided path's place on the Pro dashboard: where they are on it and one
 * button back in. The path is the main way to study; this card says so first.
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
  /** Stops finished, when known (saved progress may live only on a device). */
  done: number | null;
  total: number | null;
  nextTitle: string | null;
}) {
  const started = done !== null && done > 0;
  const pct = done !== null && total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Route className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Your {examName} path
              {started && total ? ` · ${done} of ${total} stops` : ""}
            </p>
            <p className="mt-0.5 truncate font-display text-lg font-semibold tracking-tight">
              {nextTitle ? `Next: ${nextTitle}` : started ? "Pick up where you left off" : "Start with the warm-up"}
            </p>
          </div>
        </div>
        <Button asChild size="lg" className="w-full sm:w-auto">
          <Link href={href}>
            {started ? "Continue" : "Start my path"}
            <ArrowRight />
          </Link>
        </Button>
      </div>
      {started && (
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
