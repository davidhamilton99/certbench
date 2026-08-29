/**
 * The Recall mastery meter — honest coverage of the memorization layer. It is
 * deliberately *not* framed as exam readiness; the reframe bridge below the
 * drill is where we connect it to the diagnostic.
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
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono uppercase tracking-wide text-muted-foreground">
          Recall mastery
        </span>
        <span className="font-mono tabular-nums text-muted-foreground">
          {mastered} / {total} facts · {pct}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Recall mastery"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
