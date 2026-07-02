import Link from "next/link";
import { Check, X } from "lucide-react";
import type { ExamResult } from "@/contracts/quiz";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getScoreColor } from "@/core/readiness/compute-score";
import { cn } from "@/lib/utils";

const SCORE_TEXT: Record<ReturnType<typeof getScoreColor>, string> = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

export function ExamResultsView({
  title,
  result,
  backHref,
  backLabel,
}: {
  title: string;
  result: ExamResult;
  backHref: string;
  backLabel: string;
}) {
  const color = getScoreColor(result.scorePercent);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {result.correctCount} of {result.totalQuestions} correct
            {result.readiness && (
              <>
                {" "}
                · readiness now {Math.round(result.readiness.overallScore)}%
                {result.readiness.isPreliminary && " (preliminary)"}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6">
          <span className={cn("font-mono text-5xl font-semibold", SCORE_TEXT[color])}>
            {result.scorePercent}
            <span className="text-2xl">%</span>
          </span>

          <div className="grid gap-2">
            {result.domainBreakdown.map((d) => (
              <div
                key={d.domainId}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="truncate">
                  <span className="font-mono text-xs text-muted-foreground">
                    {d.domainNumber}
                  </span>{" "}
                  {d.title}
                </span>
                <span className="shrink-0 font-mono text-xs text-muted-foreground">
                  {d.correct}/{d.total}
                </span>
              </div>
            ))}
          </div>

          <Button asChild className="justify-self-start">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Question review
        </h2>
        {result.responses.map((r, i) => (
          <details
            key={r.questionId}
            className="group rounded-lg border bg-card px-4 py-3"
          >
            <summary className="flex cursor-pointer items-start gap-3 text-sm [&::-webkit-details-marker]:hidden">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                  r.isCorrect
                    ? "bg-success/15 text-success"
                    : "bg-danger/15 text-danger"
                )}
              >
                {r.isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />}
              </span>
              <span className="leading-relaxed">
                <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                  {i + 1}.
                </span>
                {r.questionText}
              </span>
            </summary>
            <div className="mt-3 grid gap-1.5 border-t pt-3 text-sm">
              {r.options.map((option, oi) => (
                <p
                  key={oi}
                  className={cn(
                    "rounded px-2 py-1",
                    oi === r.correctIndex && "bg-success/10 text-success",
                    oi === r.selectedIndex &&
                      oi !== r.correctIndex &&
                      "bg-danger/10 text-danger line-through"
                  )}
                >
                  {option}
                </p>
              ))}
              {r.explanation && (
                <p className="mt-1 text-muted-foreground">{r.explanation}</p>
              )}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
