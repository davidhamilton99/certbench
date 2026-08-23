import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getScoreColor } from "@/core/readiness/compute-score";
import type { SessionPlanResult } from "@/core/session-plan/compute-plan";
import {
  ShareReadiness,
  type ShareReadinessProps,
} from "@/components/workspace/ShareReadiness";
import { cn } from "@/lib/utils";

const SCORE_TEXT: Record<ReturnType<typeof getScoreColor>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const SCORE_BAR: Record<ReturnType<typeof getScoreColor>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

const BAND_LABEL: Record<ReturnType<typeof getScoreColor>, string> = {
  success: "Exam ready",
  warning: "Getting close",
  danger: "Needs work",
};

/** Gauge geometry: a 270° arc, gap at the bottom, r=78 in a 180 viewBox. */
const GAUGE_SIZE = 180;
const GAUGE_R = 78;
const GAUGE_STROKE = 12;
const ARC_FRACTION = 0.75; // 270°
const ARC_START_DEG = 135; // pointing down-left; sweep runs clockwise
const CIRCUMFERENCE = 2 * Math.PI * GAUGE_R;
const ARC_LENGTH = CIRCUMFERENCE * ARC_FRACTION;

/** Point on the gauge circle at `t` ∈ [0,1] along the arc, at radius `r`. */
function arcPoint(t: number, r: number): { x: number; y: number } {
  const angle = ((ARC_START_DEG + t * 270) * Math.PI) / 180;
  return {
    x: GAUGE_SIZE / 2 + r * Math.cos(angle),
    y: GAUGE_SIZE / 2 + r * Math.sin(angle),
  };
}

/**
 * The readiness instrument: score swept around a 270° dial with a tick at
 * the 75% "exam ready" threshold. Pure server-rendered SVG; the sweep and
 * bar-growth entrance animations are CSS-only (see globals.css).
 *
 * While `preliminary`, the score is confidence-penalised for a small
 * sample, so a strong performer can show a low number — we render it in a
 * neutral "building" treatment (primary, not danger) rather than shouting
 * "Needs work" at someone who just aced the diagnostic.
 */
function ReadinessGauge({
  score,
  preliminary,
}: {
  score: number;
  preliminary?: boolean;
}) {
  const band = getScoreColor(score);
  const colorClass = preliminary ? "text-primary" : SCORE_TEXT[band];
  const bandLabel = preliminary ? "Building baseline" : BAND_LABEL[band];
  const clamped = Math.max(0, Math.min(100, score));
  const sweep = ARC_LENGTH * (clamped / 100);
  const tickOuter = arcPoint(0.75, GAUGE_R + GAUGE_STROKE / 2 + 4);
  const tickInner = arcPoint(0.75, GAUGE_R - GAUGE_STROKE / 2 - 4);

  return (
    <div className="relative mx-auto" style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}>
      <svg
        viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
        className="size-full"
        aria-hidden
      >
        {/* Track */}
        <circle
          cx={GAUGE_SIZE / 2}
          cy={GAUGE_SIZE / 2}
          r={GAUGE_R}
          fill="none"
          className="stroke-muted"
          strokeWidth={GAUGE_STROKE}
          strokeLinecap="round"
          strokeDasharray={`${ARC_LENGTH} ${CIRCUMFERENCE}`}
          transform={`rotate(${ARC_START_DEG} ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
        />
        {/* Score sweep */}
        {sweep > 0 && (
          <circle
            cx={GAUGE_SIZE / 2}
            cy={GAUGE_SIZE / 2}
            r={GAUGE_R}
            fill="none"
            stroke="currentColor"
            className={cn("animate-gauge", colorClass)}
            strokeWidth={GAUGE_STROKE}
            strokeLinecap="round"
            strokeDasharray={`${sweep} ${CIRCUMFERENCE}`}
            strokeDashoffset={0}
            style={{ "--gauge-track": `${sweep}px` } as React.CSSProperties}
            transform={`rotate(${ARC_START_DEG} ${GAUGE_SIZE / 2} ${GAUGE_SIZE / 2})`}
          />
        )}
        {/* Exam-ready threshold tick at 75 */}
        <line
          x1={tickInner.x}
          y1={tickInner.y}
          x2={tickOuter.x}
          y2={tickOuter.y}
          className="stroke-muted-foreground/50"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
        <span className={cn("font-mono text-[42px] font-semibold leading-none", colorClass)}>
          {Math.round(clamped)}
          <span className="text-xl">%</span>
        </span>
        <span className={cn("text-sm font-medium", colorClass)}>
          {bandLabel}
        </span>
      </div>
    </div>
  );
}

export function ReadinessPanel({
  plan,
  share,
}: {
  plan: SessionPlanResult;
  /** Owner-only share control; omitted for read-only views. */
  share?: ShareReadinessProps;
}) {
  const trend = plan.readinessTrend;
  const preliminary = plan.readinessIsPreliminary;

  // Raw accuracy across everything answered so far — the "how you're
  // actually doing" number, separate from the confidence-penalised score.
  const totalAttempted = plan.domainScores.reduce((s, d) => s + d.attempted, 0);
  const totalCorrect = plan.domainScores.reduce((s, d) => s + d.correct, 0);
  const rawAccuracy =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Readiness</CardTitle>
        <CardDescription>
          {preliminary
            ? "Preliminary — it climbs as you answer more in each domain"
            : `Based on ${plan.totalQuestionsSeen} answered questions`}
          {plan.daysUntilExam !== null && (
            <> · {plan.daysUntilExam} days until exam</>
          )}
        </CardDescription>
        {share && (
          <CardAction>
            <ShareReadiness {...share} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="grid justify-items-center gap-2">
          <ReadinessGauge score={plan.readinessScore} preliminary={preliminary} />
          {preliminary && rawAccuracy !== null && (
            <p className="max-w-xs text-balance text-center text-sm text-muted-foreground">
              You&apos;re answering{" "}
              <span className="font-medium text-foreground">{rawAccuracy}%</span>{" "}
              correctly so far. Your readiness starts low on purpose and climbs
              as you cover more of each domain — keep going.
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
          <div className="grid gap-4 border-t pt-5">
            {plan.domainScores.map((d, i) => {
              const domainColor = getScoreColor(d.score);
              return (
                // Title gets the full row and wraps — score and exam weight
                // live on their own line so nothing ever truncates.
                <div key={d.domainId} className="grid min-w-0 gap-1.5">
                  <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                    <span className="leading-snug">
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                        {d.domainNumber}
                      </span>
                      {d.title}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 font-mono text-sm",
                        d.attempted > 0
                          ? SCORE_TEXT[domainColor]
                          : "text-muted-foreground"
                      )}
                    >
                      {d.attempted > 0 ? `${Math.round(d.score)}%` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "animate-bar h-full rounded-full",
                          SCORE_BAR[domainColor]
                        )}
                        style={{
                          width: `${Math.max(2, Math.min(100, d.score))}%`,
                          animationDelay: `${150 + i * 90}ms`,
                        }}
                      />
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
      </CardContent>
    </Card>
  );
}
