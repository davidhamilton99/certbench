import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getScoreColor } from "@/core/readiness/compute-score";
import type { SessionPlanResult } from "@/core/session-plan/compute-plan";
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

export function ReadinessPanel({ plan }: { plan: SessionPlanResult }) {
  const color = getScoreColor(plan.readinessScore);
  const trend = plan.readinessTrend;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Readiness</CardTitle>
        <CardDescription>
          {plan.readinessIsPreliminary
            ? "Preliminary — answer more questions per domain to firm this up"
            : `Based on ${plan.totalQuestionsSeen} answered questions`}
          {plan.daysUntilExam !== null && (
            <> · {plan.daysUntilExam} days until exam</>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-baseline gap-3">
          <span className={cn("font-mono text-5xl font-semibold", SCORE_TEXT[color])}>
            {Math.round(plan.readinessScore)}
            <span className="text-2xl">%</span>
          </span>
          <div className="grid gap-0.5">
            <span className={cn("text-sm font-medium", SCORE_TEXT[color])}>
              {BAND_LABEL[color]}
            </span>
            {trend && trend.delta !== 0 && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend.delta > 0 ? "text-success" : "text-danger"
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
        </div>

        {plan.domainScores.length > 0 && (
          <div className="grid gap-4">
            {plan.domainScores.map((d) => {
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
                        className={cn("h-full rounded-full", SCORE_BAR[domainColor])}
                        style={{ width: `${Math.max(2, Math.min(100, d.score))}%` }}
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
