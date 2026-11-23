import { ProgressBar } from "@/components/ui/progress-bar";

/**
 * How many of the exam's recall facts were answered correctly the last time
 * they were asked (a later incorrect answer takes a fact off the count). It
 * counts facts and says nothing about readiness for the exam: the note under
 * the drill is where the two are connected.
 */
export function RecallMastery({
  mastered,
  total,
}: {
  mastered: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-note">
        <span className="cb-label text-muted-foreground">Facts last answered correctly</span>
        <span className="tabular-nums text-muted-foreground">
          {mastered} of {total} ({pct}%)
        </span>
      </div>
      {/* The figure is printed beside it, so the bar itself is not read out. */}
      <ProgressBar value={pct} size="lg" />
    </div>
  );
}
