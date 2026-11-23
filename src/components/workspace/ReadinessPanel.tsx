import type { SessionPlanResult } from "@/core/session-plan/compute-plan";
import { bandFor, BUILDING_BAND } from "@/lib/readiness/band";
import { ScoreBar, ScoreLevel } from "@/components/instrument/ScoreLevel";
import {
  ShareReadiness,
  type ShareReadinessProps,
} from "@/components/workspace/ShareReadiness";

/**
 * The readiness score on the study plan: the score against the readiness
 * target, then every domain on the same scale, drawn as the study path draws
 * a result. While the score is preliminary it carries the neutral "Baseline
 * in progress" label, so a strong start on a small sample is not called
 * "Below target".
 *
 * Every bar is drawn at its final length in the markup: none grows from
 * nothing, so the panel is right in a paused tab and in a session replay.
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
  const days = plan.daysUntilExam;
  const change = trend ? Math.round(Math.abs(trend.delta)) : 0;

  return (
    <div className="glass rounded-lg p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold">Readiness</h2>
        {share && <ShareReadiness {...share} />}
      </div>

      <div className="mt-4 grid gap-3">
        {/* Printed and left: the page opening is not a press, so nothing counts up. */}
        <ScoreLevel score={plan.readinessScore} band={band} caption="Readiness score" still />
        <p className="text-note text-muted-foreground">
          {preliminary ? (
            <>
              {rawAccuracy !== null && <>You have answered {rawAccuracy}% of your questions correctly so far. </>}
              The readiness score starts low and rises as you cover more of each domain.
            </>
          ) : (
            <>This score is based on {plan.totalQuestionsSeen} answered questions.</>
          )}
          {trend && change > 0 && (
            <>
              {" "}
              It has {trend.delta > 0 ? "risen" : "fallen"} by {change} {change === 1 ? "point" : "points"} in the
              last {trend.daysSpan} {trend.daysSpan === 1 ? "day" : "days"}.
            </>
          )}
          {days !== null && <> {days === 0 ? "Your exam is today." : `Your exam is in ${days} ${days === 1 ? "day" : "days"}.`}</>}
        </p>
      </div>

      {plan.domainScores.length > 0 && (
        <ul className="mt-5 grid gap-4 border-t border-border pt-5">
          {plan.domainScores.map((d) => {
            const scored = d.attempted > 0;
            const tone = bandFor(d.score);
            return (
              <li key={d.domainId} className="grid min-w-0 gap-1.5">
                <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
                  <span className="min-w-0">
                    <span className="sr-only">Domain </span>
                    <span className="mr-1 text-note tabular-nums text-muted-foreground">
                      {d.domainNumber.replace(/\.0$/, "")}
                    </span>{" "}
                    {d.title}
                  </span>
                  <span
                    className="shrink-0 text-small font-medium tabular-nums"
                    style={{ color: scored ? tone.ink : undefined }}
                  >
                    {scored ? `${Math.round(d.score)}%` : "Not scored"}
                  </span>
                </div>
                <ScoreBar value={scored ? d.score : null} color={tone.accent} />
                <span className="text-note text-muted-foreground">{d.examWeight}% of the exam</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
