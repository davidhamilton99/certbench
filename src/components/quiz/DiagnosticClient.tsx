"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  saveDiagnosticProgress,
  startDiagnostic,
  submitDiagnostic,
} from "@/contracts/diagnostic";
import type { ExamQuestion, ExamResult, ProgressSnapshot } from "@/contracts/quiz";
import { ApiError } from "@/contracts/common";
import type { QuizConfig, QuizSnapshot } from "@/core/quiz-engine/types";
import { QuizShell } from "./QuizShell";
import { ExamResultsView } from "./ExamResultsView";
import { Button } from "@/components/ui/button";

const DIAGNOSTIC_CONFIG: QuizConfig = {
  mode: "diagnostic",
  grading: "server_at_end",
  allowFlagging: false,
  allowReview: true,
};

type ClientState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | {
      phase: "active";
      attemptId: string;
      questions: ExamQuestion[];
      resume: ProgressSnapshot;
    }
  | { phase: "done"; result: ExamResult };

export function DiagnosticClient({ certId }: { certId: string }) {
  const [state, setState] = useState<ClientState>({ phase: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api(startDiagnostic, { certId })
      .then((r) =>
        setState({
          phase: "active",
          attemptId: r.attemptId,
          questions: r.questions,
          // start always returns the initial snapshot for fresh attempts
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
        setState({
          phase: "error",
          message:
            err instanceof ApiError ? err.message : "Couldn't start the diagnostic",
        })
      );
  }, [certId]);

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
        <p className="text-sm text-destructive">{state.message}</p>
        <Button onClick={() => window.location.reload()} className="justify-self-center">
          Retry
        </Button>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <ExamResultsView
        title="Diagnostic complete"
        result={state.result}
        backHref="/dashboard"
        backLabel="See your study plan"
      />
    );
  }

  const { attemptId, questions, resume } = state;

  function persist(snapshot: QuizSnapshot) {
    void api(saveDiagnosticProgress, {
      attemptId,
      snapshot: { ...snapshot, questionIds: questions.map((q) => q.id) },
    }).catch(() => {
      // Autosave is best-effort; the submit payload is the source of truth.
    });
  }

  return (
    <QuizShell
      questions={questions}
      config={DIAGNOSTIC_CONFIG}
      seed={resume.seed}
      // The wire schema keeps responses opaque; the engine owns the shape.
      resume={resume as unknown as QuizSnapshot}
      onPersist={persist}
      onSubmit={async (answers) => {
        const result = await api(submitDiagnostic, { attemptId, answers });
        setState({ phase: "done", result });
      }}
      submitLabel="Finish diagnostic"
    />
  );
}
