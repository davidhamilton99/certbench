import type { ReadinessPoint } from "@/core/analytics/shape";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { cn } from "@/lib/utils";

const TICKS = [100, 75, 50, 25, 0];
/** Past this many days the dots would run together, so only the line is drawn. */
const MAX_DOTS = 31;

/** A day key ("2026-11-22") as a date, read in UTC so the server and the browser agree. */
function formatDay(day: string, month: "short" | "long"): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: month === "long" ? "numeric" : undefined,
    timeZone: "UTC",
  });
}

/**
 * The readiness score over time, as a line against the readiness target.
 *
 * The drawing is an illustration of the sentence under it: the sentence gives
 * the first and the latest score in words, so the chart is hidden from a
 * screen reader and nothing is lost. Every label is ordinary text at the
 * page's own size; only the line is a scaled drawing, so the figures stay
 * readable on a phone. The chart is drawn once, with no motion.
 */
export function ReadinessChart({ points }: { points: ReadinessPoint[] }) {
  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-input p-8 text-small text-muted-foreground">
        There is no readiness history yet. The chart appears once a score has been recorded.
      </p>
    );
  }

  const first = points[0];
  const last = points[points.length - 1];
  const x = (i: number) => (points.length === 1 ? 50 : (i / (points.length - 1)) * 100);
  const y = (score: number) => 100 - Math.max(0, Math.min(100, score));

  return (
    <figure className="grid gap-2">
      <div aria-hidden className="flex gap-2">
        <div className="relative my-2.5 h-40 w-8 shrink-0 text-note tabular-nums text-muted-foreground">
          {TICKS.map((tick) => (
            <span key={tick} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - tick}%` }}>
              {tick}
            </span>
          ))}
        </div>
        <div className="relative my-2.5 h-40 min-w-0 flex-1">
          {TICKS.map((tick) => (
            <div
              key={tick}
              className={cn(
                "absolute inset-x-0 border-t",
                // The readiness target is ruled darker, as it is on every score bar.
                tick === READINESS_TARGET ? "border-foreground/55" : "border-border"
              )}
              style={{ top: `${100 - tick}%` }}
            />
          ))}
          {points.length > 1 && (
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <polyline
                points={points.map((p, i) => `${x(i).toFixed(2)},${y(p.score).toFixed(2)}`).join(" ")}
                fill="none"
                className="stroke-primary"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                // The line keeps its weight however the drawing is stretched.
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          )}
          {points.map((p, i) => {
            const latest = i === points.length - 1;
            if (!latest && points.length > MAX_DOTS) return null;
            return (
              <span
                key={p.day}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 rounded-xs bg-primary",
                  latest ? "size-2.5 ring-2 ring-card" : "size-1.5"
                )}
                style={{ left: `${x(i)}%`, top: `${y(p.score)}%` }}
              />
            );
          })}
        </div>
      </div>
      <div aria-hidden className="flex justify-between pl-10 text-note text-muted-foreground">
        <span>{formatDay(first.day, "short")}</span>
        {points.length > 1 && <span>{formatDay(last.day, "short")}</span>}
      </div>
      <figcaption className="cb-measure text-small text-muted-foreground">
        {points.length === 1 ? (
          <>
            Your readiness score was {Math.round(first.score)}% on {formatDay(first.day, "long")}.
          </>
        ) : (
          <>
            Your readiness score was {Math.round(first.score)}% on {formatDay(first.day, "long")} and{" "}
            {Math.round(last.score)}% on {formatDay(last.day, "long")}.
          </>
        )}{" "}
        The darker line marks the readiness target of {READINESS_TARGET}%.
      </figcaption>
    </figure>
  );
}
