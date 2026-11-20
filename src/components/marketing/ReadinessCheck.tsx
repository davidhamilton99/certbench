"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, RotateCcw, X } from "lucide-react";
import {
  estimateReadiness,
  type CheckAnswer,
  type CheckQuestion,
} from "@/lib/tools/readiness-estimate";
import { track } from "@/lib/analytics";
import { splitExplanation } from "@/core/path/text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The takeaway first; the rest of the explanation only for whoever wants it. */
function Explanation({ text }: { text: string }) {
  const { takeaway, rest } = splitExplanation(text);
  return (
    <div className="grid gap-2 rounded-xl border border-foreground/[0.08] bg-foreground/[0.03] px-4 py-3.5 text-[15px] leading-relaxed">
      <p>{takeaway}</p>
      {rest && (
        <details className="text-muted-foreground">
          <summary className="cursor-pointer select-none font-medium text-foreground">Why, in full</summary>
          <p className="mt-1.5">{rest}</p>
        </details>
      )}
    </div>
  );
}

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
  cert,
  questions,
  shortCertName,
  objectiveCount,
}: {
  /** Certification slug, carried into the goal flow for a signed-in visitor. */
  cert: string;
  questions: CheckQuestion[];
  shortCertName: string;
  objectiveCount: number;
}) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<CheckAnswer[]>([]);
  // The way on is the same for everyone: this exam's guided path.
  const nextHref = `/path/${cert}`;

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
      <div className="glass grid gap-6 rounded-[1.75rem] p-6 sm:p-9">
        <div className="grid justify-items-center gap-2 text-center">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Estimated readiness
          </span>
          <span className={cn("cb-display text-7xl tabular-nums sm:text-8xl", band.tone)}>
            {result.score}
            <span className="ml-0.5 text-4xl sm:text-5xl">%</span>
          </span>
          <span className={cn("text-[15px] font-medium", band.tone)}>
            {band.label}
          </span>
          <span className="mt-1 max-w-sm text-balance text-sm text-muted-foreground">
            {correct} of {total} correct, weighted by how the real exam weights
            each domain
          </span>
        </div>

        <div className="grid gap-3.5 border-t border-foreground/[0.08] pt-6">
          {result.domains.map((d) => (
            <div key={d.domainTitle} className="grid min-w-0 gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate">{d.domainTitle}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {d.correct}/{d.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.08]">
                <div
                  className={cn("h-full rounded-full", BAND[d.pct >= 75 ? "ready" : d.pct >= 40 ? "close" : "start"].bar)}
                  style={{ width: `${Math.max(3, d.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid justify-items-center gap-4 border-t border-foreground/[0.08] pt-6 text-center">
          <p className="max-w-md text-balance text-[15px] leading-relaxed text-muted-foreground">
            That&apos;s an estimate from {total} questions. Your {shortCertName}{" "}
            path covers all {objectiveCount} objectives, one short stop at a
            time, and shows you where you stand as you go.
          </p>
          <Button asChild size="lg">
            <Link
              href={nextHref}
              onClick={() => track("upsell_clicked", { context: "readiness_check", href: nextHref })}
            >
              Start my {shortCertName} path
              <ArrowRight />
            </Link>
          </Button>
          <button
            type="button"
            onClick={restart}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Retake the check
          </button>
        </div>
      </div>
    );
  }

  // ---------- question flow ----------
  const revealed = picked !== null;
  return (
    <div className="glass grid gap-5 rounded-[1.75rem] p-5 sm:p-8">
      <div className="flex items-baseline justify-between gap-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="min-w-0 truncate">{question.domainTitle}</span>
        <span className="shrink-0 tabular-nums">
          {index + 1} / {total}
        </span>
      </div>
      <div className="-mt-2 h-1 overflow-hidden rounded-full bg-foreground/[0.08]">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${(answers.length / total) * 100}%` }}
        />
      </div>

      <p className="text-balance text-[17px] font-medium leading-relaxed sm:text-lg">{question.questionText}</p>

      <div role="radiogroup" aria-label="Answers" className="grid gap-2.5">
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
                "flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left text-[15px] leading-snug transition-[border-color,background-color,opacity,transform] duration-150",
                !revealed && "hover:border-primary/60 hover:bg-primary/[0.03] active:scale-[0.99]",
                isCorrect && "border-success bg-success/10",
                isWrongPick && "border-danger bg-danger/10",
                revealed && !isCorrect && !isWrongPick && "opacity-45",
                revealed && "cursor-default"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] text-muted-foreground transition-colors",
                  isCorrect && "border-success bg-success text-success-foreground",
                  isWrongPick && "border-danger bg-danger text-danger-foreground"
                )}
              >
                {isCorrect ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : isWrongPick ? (
                  <X className="size-3.5" strokeWidth={3} />
                ) : (
                  String.fromCharCode(65 + i)
                )}
              </span>
              <span className="min-w-0 [overflow-wrap:anywhere]">{option}</span>
            </button>
          );
        })}
      </div>

      {revealed && <Explanation text={question.explanation} />}

      <div className="flex justify-end">
        <Button onClick={next} disabled={!revealed} size="lg" className="min-w-36">
          {index === total - 1 ? "See my estimate" : "Next"}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}
