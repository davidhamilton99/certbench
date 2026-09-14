import { TrendingDown, TrendingUp } from "lucide-react";
import type { SessionPlanResult } from "@/core/session-plan/compute-plan";
import { bandFor, bandVars, BUILDING_BAND } from "@/lib/readiness/band";
import { ReadinessDial } from "@/components/instrument/ReadinessDial";
import {
  ShareReadiness,
  type ShareReadinessProps,
} from "@/components/workspace/ShareReadiness";
import { cn } from "@/lib/utils";

/**
 * The daily readiness instrument — the same dial as the post-diagnostic reveal,
 * sized for the dashboard, on the dark instrument surface. While preliminary,
 * the score wears the neutral "building baseline" treatment so a strong start on
 * a small sample never reads as a red "Needs work".
 */
export function ReadinessPanel({
  plan,
  share,
}: {
  plan: SessionPlanResult;
  /** Owner-only share control; omitted for read-only views. */
  share?: ShareReadinessProps;
}) {
  const preliminary = plan.readinessIsPreliminary;
  const band = preliminary ? BUILDING_BAND : bandFor(plan.readinessScore);
  const trend = plan.readinessTrend;

  const totalAttempted = plan.domainScores.reduce((s, d) => s + d.attempted, 0);
  const totalCorrect = plan.domainScores.reduce((s, d) => s + d.correct, 0);
  const rawAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  return (
    <div
      className="dark relative overflow-hidden rounded-2xl border border-white/10 bg-card p-6"
      style={bandVars(band)}
    >
      {/* Ambient accent glow behind the instrument. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-1/2 h-56 w-72 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "var(--rv-accent-dim)" }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight">
            Readiness
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {preliminary
              ? "Climbs as you cover each domain"
              : `Based on ${plan.totalQuestionsSeen} answered`}
            {plan.daysUntilExam !== null && <> · {plan.daysUntilExam}d to exam</>}
          </p>
        </div>
        {share && <ShareReadiness {...share} />}
      </div>

      <div className="relative mt-2 grid justify-items-center gap-3">
        <ReadinessDial
          score={plan.readinessScore}
          band={band}
          caption="Readiness"
          size={232}
        />
        {preliminary && rawAccuracy !== null && (
          <p className="max-w-xs text-balance text-center text-xs leading-relaxed text-muted-foreground">
            You&apos;re answering{" "}
            <span className="font-medium text-foreground">{rawAccuracy}%</span>{" "}
            correctly so far — readiness starts low on purpose and climbs as you
            cover more of each domain.
          </p>
        )}
        {trend && trend.delta !== 0 && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium",
              trend.delta > 0
                ? "border-success/30 bg-success/10 text-success"
                : "border-danger/30 bg-danger/10 text-danger"
            )}
          >
            {trend.delta > 0 ? (
              <TrendingUp className="size-3.5" />
            ) : (
              <TrendingDown className="size-3.5" />
            )}
            {trend.delta > 0 ? "+" : ""}
            {trend.delta}% in {trend.daysSpan}d
          </span>
        )}
      </div>

      {plan.domainScores.length > 0 && (
        <div className="relative mt-6 grid gap-4 border-t border-white/10 pt-5">
          {plan.domainScores.map((d, i) => {
            const dc = bandFor(d.score).accent;
            const scored = d.attempted > 0;
            return (
              <div key={d.domainId} className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                  <span className="leading-snug">
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {d.domainNumber}
                    </span>
                    {d.title}
                  </span>
                  <span
                    className="shrink-0 font-mono text-sm tabular-nums"
                    style={{ color: scored ? dc : undefined }}
                  >
                    {scored ? `${Math.round(d.score)}%` : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                    {scored && (
                      <div
                        className="animate-bar h-full rounded-full"
                        style={{
                          width: `${Math.max(2, Math.min(100, d.score))}%`,
                          background: dc,
                          animationDelay: `${150 + i * 90}ms`,
                        }}
                      />
                    )}
                  </div>
                  <span className="w-20 shrink-0 text-right font-mono text-[11px] text-muted-foreground">
                    {d.examWeight}% of exam
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
