"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import type { ExamResult } from "@/contracts/quiz";
import { Button } from "@/components/ui/button";
import { answerOrder } from "./answer-order";
import { QuestionFlagButton } from "./QuestionFlagButton";
import { ReviewedAnswers } from "./ReviewedAnswers";
import { ReadinessReveal } from "@/components/instrument/ReadinessReveal";
import { ScoreReport } from "@/components/instrument/ScoreReport";
import { FULL_EXAM_QUESTION_COUNT } from "@/core/constants";
import { bandFor } from "@/lib/readiness/band";
import { cn } from "@/lib/utils";

export function ExamResultsView({
  title,
  result,
  backHref,
  backLabel,
  diagnosticCertId,
  certName,
  examCode,
  domainWeights,
  fullExam = false,
  seed,
  keepOrder,
}: {
  /** The result as a sentence: "You have completed the practice exam." */
  title: string;
  result: ExamResult;
  backHref: string;
  backLabel: string;
  /**
   * The set was a full-length practice exam. Only such a result is drawn
   * against the readiness target: a drill of ten questions in one domain says
   * how the drill went, not whether the learner is ready for the exam.
   */
  fullExam?: boolean;
  /** Present for the diagnostic, which adds the domain to study first and the exam date. */
  diagnosticCertId?: string;
  certName?: string;
  examCode?: string;
  domainWeights?: Record<string, number>;
  /**
   * How the attempt showed its answers: the seed of its shuffle, and the ids
   * of the questions that kept their stored order because their explanation
   * names an answer by its letter. The review lists each question's answers in
   * the order, and under the letters, that the attempt showed them. Without a
   * seed the answers are listed in their stored order.
   */
  seed?: string;
  keepOrder?: readonly string[];
}) {
  const isDiagnostic = Boolean(diagnosticCertId && certName && examCode);
  // A full practice exam that was served short (a small bank) is not drawn
  // against the readiness target either.
  const measuresReadiness = fullExam && result.totalQuestions >= FULL_EXAM_QUESTION_COUNT;
  /** The questions that the attempt showed in their stored order. */
  const stored = new Set(keepOrder);

  // The result follows a press on the submit button: the focus goes to its
  // heading, so the page that replaced the questions is read from its top.
  // (The diagnostic's report does the same for its own heading.)
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-6">
      {isDiagnostic ? (
        <ReadinessReveal
          result={result}
          certId={diagnosticCertId!}
          certName={certName!}
          examCode={examCode!}
          dashboardHref={backHref}
          domainWeights={domainWeights}
        />
      ) : (
        <>
          <ScoreReport
            heading={title}
            headingRef={headingRef}
            caption="Result"
            score={result.scorePercent}
            readyMark={measuresReadiness}
            verdict={
              !measuresReadiness && bandFor(result.scorePercent).key === "ready" ? "Strong result" : undefined
            }
            summary={
              <>
                You answered {result.correctCount} of {result.totalQuestions}{" "}
                {result.totalQuestions === 1 ? "question" : "questions"} correctly.
                {result.readiness && (
                  <>
                    {" "}
                    {result.readiness.isPreliminary
                      ? `Your readiness score starts at ${Math.round(result.readiness.overallScore)}% and rises as you cover each domain.`
                      : `Your readiness score is now ${Math.round(result.readiness.overallScore)}%.`}
                  </>
                )}
              </>
            }
            domains={result.domainBreakdown.map((d) => ({
              id: d.domainId,
              number: d.domainNumber,
              title: d.title,
              correct: d.correct,
              total: d.total,
            }))}
          />
          <Button asChild className="justify-self-start">
            <Link href={backHref}>{backLabel}</Link>
          </Button>
        </>
      )}

      <div className="grid gap-3">
        <h2 className="text-base font-semibold">Question review</h2>
        {result.responses.map((r, i) => (
          <details key={r.questionId} className="glass rounded-lg px-4 py-3">
            <summary className="flex cursor-pointer items-start gap-3 text-small [&::-webkit-details-marker]:hidden">
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-xs",
                  r.isCorrect ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                )}
              >
                {r.isCorrect ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                {/* The mark in words, for a reader who does not see the colour or the icon. */}
                <span className="sr-only">{r.isCorrect ? "Correct: " : "Incorrect: "}</span>
              </span>
              <span>
                <span className="mr-1.5 text-note tabular-nums text-muted-foreground">{i + 1}.</span>
                {r.questionText}
              </span>
            </summary>
            <div className="mt-3 grid gap-1.5 border-t pt-3 text-small">
              <ReviewedAnswers
                options={r.options}
                correctIndex={r.correctIndex}
                selectedIndex={r.selectedIndex}
                order={
                  seed === undefined
                    ? undefined
                    : answerOrder(seed, r.questionId, r.options.length, stored.has(r.questionId))
                }
              />
              {r.explanation && <p className="mt-1 text-muted-foreground">{r.explanation}</p>}
              <div className="mt-1">
                <QuestionFlagButton questionId={r.questionId} />
              </div>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
