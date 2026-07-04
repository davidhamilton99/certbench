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
          {trend && trend.delta !== 0 && (
            <span
              className={cn(
                "flex items-center gap-1 text-sm font-medium",
                trend.delta > 0 ? "text-success" : "text-danger"
              )}
            >
              {trend.delta > 0 ? (
                <TrendingUp className="size-4" />
              ) : (
                <TrendingDown className="size-4" />
              )}
              {trend.delta > 0 ? "+" : ""}
              {trend.delta}% in {trend.daysSpan}d
            </span>
          )}
        </div>

        {plan.domainScores.length > 0 && (
          <div className="grid gap-3">
            {plan.domainScores.map((d) => {
              const domainColor = getScoreColor(d.score);
              return (
                <div key={d.domainId} className="grid gap-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="truncate">
                      <span className="font-mono text-xs text-muted-foreground">
                        {d.domainNumber}
                      </span>{" "}
                      {d.title}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {d.attempted > 0 ? `${Math.round(d.score)}%` : "—"} ·{" "}
                      {d.examWeight}% of exam
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", SCORE_BAR[domainColor])}
                      style={{ width: `${Math.max(2, Math.min(100, d.score))}%` }}
                    />
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
