"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import {
  estimateReadiness,
  type CheckAnswer,
  type CheckQuestion,
} from "@/lib/tools/readiness-estimate";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BAND = {
  ready: { label: "Looking exam ready", tone: "text-success", bar: "bg-success" },
  close: { label: "Getting close", tone: "text-warning", bar: "bg-warning" },
  start: { label: "Room to grow", tone: "text-danger", bar: "bg-danger" },
} as const;

/**
 * The no-signup readiness check: 10 weight-balanced questions, graded
 * client-side, ending in an estimated readiness band. The reveal is the
 * conversion moment — the account is positioned as the way to get the real
 * score and keep it, never as a wall in front of the questions.
 */
export function ReadinessCheck({
  questions,
  shortCertName,
  objectiveCount,
}: {
  questions: CheckQuestion[];
  shortCertName: string;
  objectiveCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<CheckAnswer[]>([]);

  const total = questions.length;
  const done = answers.length === total && picked === null;
  const question = questions[index];

  function choose(i: number) {
    if (picked !== null) return;
    setPicked(i);
    setAnswers((prev) => [
      ...prev,
      {
        domainTitle: question.domainTitle,
        examWeight: question.examWeight,
        correct: i === question.correctIndex,
      },
    ]);
  }

  function next() {
    setPicked(null);
    if (index < total - 1) setIndex(index + 1);
  }

  function restart() {
    setIndex(0);
    setPicked(null);
    setAnswers([]);
  }

  // ---------- result ----------
  if (done) {
    const result = estimateReadiness(answers);
    const band = BAND[result.band];
    const correct = answers.filter((a) => a.correct).length;
    return (
      <div className="grid gap-5 rounded-2xl border bg-card p-8">
        <div className="grid justify-items-center gap-1 text-center">
          <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Estimated readiness
          </span>
          <span className={cn("font-mono text-6xl font-semibold", band.tone)}>
            {result.score}
            <span className="text-3xl">%</span>
          </span>
          <span className={cn("text-sm font-medium", band.tone)}>
            {band.label}
          </span>
          <span className="mt-1 text-xs text-muted-foreground">
            {correct} of {total} correct, weighted by how the real exam weights
            each domain
          </span>
        </div>

        <div className="grid gap-2.5 border-t pt-4">
          {result.domains.map((d) => (
            <div key={d.domainTitle} className="grid min-w-0 gap-1">
              <div className="flex items-baseline justify-between gap-3 text-xs">
                <span className="truncate">{d.domainTitle}</span>
                <span className="shrink-0 font-mono text-muted-foreground">
                  {d.correct}/{d.total}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full", BAND[d.pct >= 75 ? "ready" : d.pct >= 40 ? "close" : "start"].bar)}
                  style={{ width: `${Math.max(3, d.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid justify-items-center gap-3 border-t pt-5 text-center">
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
            That&apos;s an estimate from {total} questions. Your real readiness
            score tracks all {objectiveCount} {shortCertName} objectives,
            updates as you practice, and tells you exactly what to study each
            day — free.
          </p>
          <Button asChild size="lg">
            <Link href="/register">
              Get my real readiness score
              <ArrowRight />
            </Link>
          </Button>
          <button
            type="button"
            onClick={restart}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3" />
            Retake the check
          </button>
        </div>
      </div>
    );
  }

  // ---------- question flow ----------
  const revealed = picked !== null;
  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:p-8">
      <div className="flex items-baseline justify-between font-mono text-xs text-muted-foreground">
        <span>
          {index + 1} / {total}
        </span>
        <span>{question.domainTitle}</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(answers.length / total) * 100}%` }}
        />
      </div>

      <p className="leading-relaxed">{question.questionText}</p>

      <div role="radiogroup" className="grid gap-2">
        {question.options.map((option, i) => {
          const isCorrect = revealed && i === question.correctIndex;
          const isWrongPick = revealed && i === picked && !isCorrect;
          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={picked === i}
              disabled={revealed}
              onClick={() => choose(i)}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                !revealed && "hover:border-muted-foreground/40 hover:bg-accent",
                isCorrect && "border-success bg-success/10",
                isWrongPick && "border-danger bg-danger/10",
                revealed && "cursor-default"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                  isCorrect && "border-success bg-success text-success-foreground",
                  isWrongPick && "border-danger bg-danger text-danger-foreground"
                )}
              >
                {isCorrect ? (
                  <Check className="size-3" />
                ) : isWrongPick ? (
                  <X className="size-3" />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="leading-relaxed">{option}</span>
            </button>
          );
        })}
      </div>

      {revealed && (
        <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm leading-relaxed">
          {question.explanation}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={next} disabled={!revealed} className="min-w-32">
          {index === total - 1 ? "See my estimate" : "Next"}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
