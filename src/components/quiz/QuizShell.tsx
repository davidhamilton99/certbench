"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { ChevronLeft, ChevronRight, Flag, Loader2 } from "lucide-react";
import {
  initQuizState,
  isComplete,
  quizReducer,
  restoreQuizState,
  toSnapshot,
  unansweredIndexes,
} from "@/core/quiz-engine/machine";
import type {
  QuizConfig,
  QuizEvent,
  QuizSnapshot,
  QuizState,
} from "@/core/quiz-engine/types";
import type { AnswerInput, ExamQuestion } from "@/contracts/quiz";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MultipleChoice } from "./renderers/MultipleChoice";
import { cn } from "@/lib/utils";

const PERSIST_DEBOUNCE_MS = 2000;

export interface QuizShellProps {
  questions: ExamQuestion[];
  config: QuizConfig;
  seed: string;
  /** Rehydrate from a persisted snapshot (resume). */
  resume?: QuizSnapshot | null;
  /** Called (debounced) whenever resumable state changes. */
  onPersist?: (snapshot: QuizSnapshot) => void;
  /** Grades the attempt. Throwing keeps the state retryable. */
  onSubmit: (answers: AnswerInput[], flaggedQuestionIds: string[]) => Promise<void>;
  submitLabel?: string;
}

export function QuizShell({
  questions,
  config,
  seed,
  resume,
  onPersist,
  onSubmit,
  submitLabel = "Submit",
}: QuizShellProps) {
  const total = questions.length;
  const boundReducer = useCallback(
    (state: QuizState, event: QuizEvent) =>
      quizReducer(config, total, state, event),
    [config, total]
  );
  const [state, dispatch] = useReducer(
    boundReducer,
    resume ?? null,
    (snap) => (snap ? restoreQuizState(snap) : initQuizState(new Date().toISOString()))
  );

  // ---------- persistence (debounced + flush on hide) ----------
  const persistRef = useRef(onPersist);
  persistRef.current = onPersist;
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!persistRef.current) return;
    const snapshot = toSnapshot(state, seed);
    if (!snapshot) return;
    const timer = setTimeout(() => persistRef.current?.(snapshot), PERSIST_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, seed]);

  useEffect(() => {
    function flush() {
      if (document.visibilityState !== "hidden") return;
      const snapshot = toSnapshot(stateRef.current, seed);
      if (snapshot) persistRef.current?.(snapshot);
    }
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [seed]);

  // ---------- submit ----------
  const submitting = state.status === "submitting";
  async function handleSubmit() {
    const current = stateRef.current;
    if (current.status !== "active" && current.status !== "review") return;
    const answers: AnswerInput[] = Object.entries(current.responses).flatMap(
      ([questionId, response]) =>
        response.value.kind === "single"
          ? [{ questionId, selectedIndex: response.value.selectedIndex }]
          : []
    );
    dispatch({ type: "SUBMIT_START" });
    try {
      await onSubmit(answers, current.flagged);
      dispatch({ type: "SUBMIT_SUCCESS" });
    } catch (err) {
      dispatch({
        type: "SUBMIT_FAILURE",
        message: err instanceof Error ? err.message : "Submission failed",
      });
    }
  }

  // ---------- keyboard ----------
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const current = stateRef.current;
      if (current.status !== "active") return;
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      if (e.key === "ArrowRight") dispatch({ type: "NEXT" });
      else if (e.key === "ArrowLeft") dispatch({ type: "PREV" });
      else if (/^[1-9]$/.test(e.key)) {
        const question = questions[current.index];
        const optionPos = Number(e.key) - 1;
        if (question && optionPos < question.options.length) {
          // Number keys map to DISPLAY order; renderer handles the mapping,
          // so replicate it here via the same permutation.
          import("@/core/quiz-engine/shuffle").then(({ seededPermutation }) => {
            const perm = seededPermutation(seed, question.id, question.options.length);
            dispatch({
              type: "ANSWER",
              questionId: question.id,
              value: { kind: "single", selectedIndex: perm[optionPos] },
            });
          });
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [questions, seed]);

  // ---------- render ----------
  if (state.status === "results") return null; // parent renders results

  if (state.status === "error") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-destructive">{state.message}</p>
          <Button onClick={() => dispatch({ type: "RETRY" })}>Try again</Button>
        </CardContent>
      </Card>
    );
  }

  const index = state.status === "submitting" ? state.index : state.index;
  const question = questions[index];
  const answered = Object.keys(state.responses).length;
  const complete = isComplete(state, total);
  const response = question ? state.responses[question.id] : undefined;
  const flagged = question ? state.flagged.includes(question.id) : false;

  // Review screen: answer map + unanswered warnings before final submit.
  if (state.status === "review") {
    const unanswered = unansweredIndexes(state, questions.map((q) => q.id));
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        <h2 className="text-lg font-semibold">Review before submitting</h2>
        <p className="text-sm text-muted-foreground">
          {answered} of {total} answered
          {unanswered.length > 0 && (
            <> · {unanswered.length} unanswered (marked grey)</>
          )}
          {state.flagged.length > 0 && <> · {state.flagged.length} flagged</>}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const has = !!state.responses[q.id];
            const isFlagged = state.flagged.includes(q.id);
            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  dispatch({ type: "EXIT_REVIEW" });
                  dispatch({ type: "NAVIGATE", to: i });
                }}
                className={cn(
                  "flex size-9 items-center justify-center rounded-md border font-mono text-xs transition-colors hover:bg-accent",
                  has ? "bg-primary/10 border-primary/40" : "text-muted-foreground",
                  isFlagged && "ring-1 ring-warning"
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => dispatch({ type: "EXIT_REVIEW" })}>
            Keep answering
          </Button>
          <Button onClick={handleSubmit} disabled={answered === 0}>
            {submitLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      {/* Header: progress + flag */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-mono">
              {index + 1} / {total}
            </span>
            <span className="text-muted-foreground">{answered} answered</span>
          </div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
        </div>
        {config.allowFlagging && (
          <Button
            variant={flagged ? "secondary" : "ghost"}
            size="icon"
            aria-label={flagged ? "Unflag question" : "Flag question for review"}
            aria-pressed={flagged}
            onClick={() =>
              question && dispatch({ type: "TOGGLE_FLAG", questionId: question.id })
            }
          >
            <Flag className={cn(flagged && "fill-warning text-warning")} />
          </Button>
        )}
      </div>

      {/* Question */}
      {question && (
        <Card>
          <CardContent className="grid gap-5">
            <p className="leading-relaxed">{question.question_text}</p>
            <MultipleChoice
              questionId={question.id}
              options={question.options}
              seed={seed}
              value={response?.value}
              onChange={(value) =>
                dispatch({ type: "ANSWER", questionId: question.id, value })
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Footer nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => dispatch({ type: "PREV" })}
          disabled={index === 0 || submitting}
        >
          <ChevronLeft />
          Previous
        </Button>
        <div className="flex gap-2">
          {config.allowReview && (
            <Button
              variant="secondary"
              onClick={() => dispatch({ type: "ENTER_REVIEW" })}
              disabled={submitting}
            >
              Review
            </Button>
          )}
          {index === total - 1 || complete ? (
            <Button onClick={handleSubmit} disabled={answered === 0 || submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitLabel}
            </Button>
          ) : (
            <Button onClick={() => dispatch({ type: "NEXT" })} disabled={submitting}>
              Next
              <ChevronRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
