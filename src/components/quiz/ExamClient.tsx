"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import type {
  AnswerInput,
  ExamQuestion,
  ExamResult,
  ProgressSnapshot,
} from "@/contracts/quiz";
import { ApiError } from "@/contracts/common";
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
  resultsTitle: string;
  backHref: string;
  backLabel: string;
  /** Set for the diagnostic only — renders the post-diagnostic path-forward. */
  diagnosticCertId?: string;
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
            ? { phase: "quota", message: err.message }
            : {
                phase: "error",
                message:
                  err instanceof ApiError ? err.message : "Couldn't start the exam",
              }
        )
      );
    // start is stable per mount by construction (defined inline by wrappers).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.phase === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mx-auto grid max-w-md gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <Button
          variant="outline"
          onClick={() => window.location.reload()}
          className="justify-self-center"
        >
          Retry
        </Button>
      </div>
    );
  }

  // The paywall moment: the daily free allowance can't cover this session.
  if (state.phase === "quota") {
    return (
      <div className="mx-auto grid max-w-md gap-4 py-16 text-center">
        <Lock className="mx-auto size-6 text-muted-foreground" />
        <h2 className="text-lg font-semibold tracking-tight">
          Daily limit reached
        </h2>
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <div className="flex justify-center gap-2 pt-2">
          <Button asChild>
            <Link href="/upgrade?reason=daily-limit">Upgrade to Pro</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to your plan</Link>
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
