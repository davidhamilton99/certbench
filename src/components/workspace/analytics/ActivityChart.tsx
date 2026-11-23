import type { DailyActivity } from "@/core/analytics/shape";

/** A day key ("2026-11-22") as a short date, read in UTC so the server and the browser agree. */
function shortDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Questions answered on each day, as one bar a day.
 *
 * The drawing is an illustration of the sentence under it, which gives the
 * total, the number of days with any work and the most in one day, so the
 * chart is hidden from a screen reader and nothing is lost. The bars are plain
 * rules with square ends, drawn once at their height, and every label is
 * ordinary text at the page's own size.
 */
export function ActivityChart({ days }: { days: DailyActivity[] }) {
  const max = Math.max(1, ...days.map((d) => d.questions));
  const total = days.reduce((sum, d) => sum + d.questions, 0);
  const activeDays = days.filter((d) => d.questions > 0).length;
  const most = Math.max(0, ...days.map((d) => d.questions));
  const period = days.length === 1 ? "the last day" : `the last ${days.length} days`;

  return (
    <figure className="grid gap-2">
      <div aria-hidden className="flex gap-2">
        <div className="relative my-2.5 h-32 w-8 shrink-0 text-note tabular-nums text-muted-foreground">
          <span className="absolute right-0 top-0 -translate-y-1/2">{max}</span>
          <span className="absolute bottom-0 right-0 translate-y-1/2">0</span>
        </div>
        <div className="my-2.5 flex h-32 min-w-0 flex-1 items-end gap-px border-b border-t border-border sm:gap-0.5">
          {days.map((d) => (
            <div
              key={d.day}
              className="min-w-0 flex-1 bg-primary"
              // A day with any work is always drawn, however small beside the busiest day.
              style={{ height: `${(d.questions / max) * 100}%`, minHeight: d.questions > 0 ? 2 : 0 }}
            />
          ))}
        </div>
      </div>
      {days.length > 0 && (
        <div aria-hidden className="flex justify-between pl-10 text-note text-muted-foreground">
          <span>{shortDay(days[0].day)}</span>
          <span>{shortDay(days[days.length - 1].day)}</span>
        </div>
      )}
      <figcaption className="cb-measure text-small text-muted-foreground">
        {total === 0 ? (
          <>You have not answered any questions in {period}.</>
        ) : (
          <>
            You answered {total} {total === 1 ? "question" : "questions"} on {activeDays} of {period}. The most in
            one day was {most}.
          </>
        )}
      </figcaption>
    </figure>
  );
}
