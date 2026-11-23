"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type {
  AnswerInput,
  ExamQuestion,
  ExamResult,
  ProgressSnapshot,
} from "@/contracts/quiz";
import { ApiError } from "@/contracts/errors";
import { userMessage } from "@/lib/errors/user-message";
import type { QuizConfig, QuizSnapshot } from "@/core/quiz-engine/types";
import { QuizShell } from "./QuizShell";
import { ExamResultsView } from "./ExamResultsView";
import { Button } from "@/components/ui/button";

export interface ExamStartResult {
  attemptId: string;
  questions: ExamQuestion[];
  resume: ProgressSnapshot | null;
}

export interface ExamClientProps {
  config: QuizConfig;
  start: () => Promise<ExamStartResult>;
  saveProgress: (attemptId: string, snapshot: ProgressSnapshot) => Promise<unknown>;
  submit: (
    attemptId: string,
    answers: AnswerInput[],
    flaggedQuestionIds: string[]
  ) => Promise<ExamResult>;
  submitLabel: string;
  /** The result's heading, as a sentence. */
  resultsTitle: string;
  backHref: string;
  backLabel: string;
  /** Set for the diagnostic only: its result adds the domain to study first and the exam date. */
  diagnosticCertId?: string;
  certName?: string;
  examCode?: string;
  domainWeights?: Record<string, number>;
  /** The set is a full-length practice exam: its result is drawn against the readiness target. */
  fullExam?: boolean;
}

type ClientState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "quota"; message: string }
  | {
      phase: "active";
      attemptId: string;
      questions: ExamQuestion[];
      resume: ProgressSnapshot;
    }
  | { phase: "done"; result: ExamResult };

/**
 * Shared client for server-graded attempts (diagnostic + practice exams):
 * starts/resumes on mount, autosaves through saveProgress, renders results
 * after submit. Per-mode behaviour comes entirely from props.
 */
export function ExamClient({
  config,
  start,
  saveProgress,
  submit,
  submitLabel,
  resultsTitle,
  backHref,
  backLabel,
  diagnosticCertId,
  certName,
  examCode,
  domainWeights,
  fullExam = false,
}: ExamClientProps) {
  const [state, setState] = useState<ClientState>({ phase: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start()
      .then((r) =>
        setState({
          phase: "active",
          attemptId: r.attemptId,
          questions: r.questions,
          resume: r.resume ?? {
            index: 0,
            responses: {},
            flagged: [],
            revealed: [],
            startedAt: new Date().toISOString(),
            seed: r.attemptId,
            questionIds: r.questions.map((q) => q.id),
          },
        })
      )
      .catch((err) =>
        setState(
          err instanceof ApiError && err.code === "quota_exceeded"
            ? { phase: "quota", message: userMessage(err) }
            : {
                phase: "error",
                message: userMessage(err, "The questions could not be loaded. Please try again."),
              }
        )
      );
    // start is stable per mount by construction (defined inline by wrappers).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.phase === "loading") {
    return (
      <div role="status" className="mx-auto flex w-full max-w-2xl items-center gap-3 py-24 text-small text-muted-foreground">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        Your questions are being prepared.
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4 py-16">
        <p role="alert" className="cb-measure text-small">
          {state.message}
        </p>
        <Button variant="outline" onClick={() => window.location.reload()} className="justify-self-start">
          Try again
        </Button>
      </div>
    );
  }

  // The free plan's allowance for today does not cover this set of questions.
  if (state.phase === "quota") {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4 py-16">
        <h2 className="text-lg font-semibold">You have reached the limit for today.</h2>
        <p className="cb-measure text-small text-muted-foreground">{state.message}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Button asChild>
            <Link href="/upgrade?reason=daily-limit">See what Pro includes</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Return to your study plan</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <ExamResultsView
        title={resultsTitle}
        result={state.result}
        backHref={backHref}
        backLabel={backLabel}
        diagnosticCertId={diagnosticCertId}
        certName={certName}
        examCode={examCode}
        domainWeights={domainWeights}
        fullExam={fullExam}
      />
    );
  }

  const { attemptId, questions, resume } = state;

  return (
    <QuizShell
      questions={questions}
      config={config}
      seed={resume.seed}
      // The wire schema keeps responses opaque; the engine owns the shape.
      resume={resume as unknown as QuizSnapshot}
      onPersist={(snapshot) => {
        void saveProgress(attemptId, {
          ...snapshot,
          questionIds: questions.map((q) => q.id),
        }).catch(() => {
          // Autosave is best-effort; the submit payload is the source of truth.
        });
      }}
      onSubmit={async (answers, flagged) => {
        const result = await submit(attemptId, answers, flagged);
        setState({ phase: "done", result });
      }}
      submitLabel={submitLabel}
    />
  );
}
