"use client";

import { useCallback, useEffect, useId, useReducer, useRef, type KeyboardEvent } from "react";
import { Flag } from "lucide-react";
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
import { userMessage } from "@/lib/errors/user-message";
import { OPTION_LETTERS } from "@/components/quiz/AnswerOption";
import { answerOrder } from "@/components/quiz/answer-order";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
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

/**
 * The player for a set of questions that is graded at the end (the diagnostic,
 * a practice exam, a domain drill).
 *
 * Keyboard. The keys A to D (or 1 to 4) choose an answer and the left and
 * right arrow keys change the question. They act only while the keyboard's
 * focus is inside the player, never from elsewhere on the page. On an answer,
 * the arrow keys move between the answers, as they do in any group of radio
 * buttons; from anywhere else in the player they change the question.
 *
 * Focus. When the question changes, its text takes the focus, so a screen
 * reader reads the new question and the keys go on working.
 */
export function QuizShell({
  questions,
  config,
  seed,
  resume,
  onPersist,
  onSubmit,
  submitLabel = "Submit your answers",
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
  const promptId = useId();

  // ---------- persistence (debounced + flush on hide) ----------
  // The latest callback and state, for the listeners and timers below. They are
  // written after each render and not during it; this effect is declared first,
  // so the effects that follow read the values of the render they belong to.
  const persistRef = useRef(onPersist);
  const stateRef = useRef(state);
  useEffect(() => {
    persistRef.current = onPersist;
    stateRef.current = state;
  });

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

  // ---------- focus ----------
  // Nothing takes the focus as the page loads. Once the person has moved
  // (another question, the review, back from it), the new view's heading does.
  const moved = useRef(false);
  const promptRef = useRef<HTMLHeadingElement>(null);
  const reviewRef = useRef<HTMLHeadingElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  const status = state.status;
  const index = "index" in state ? state.index : 0;
  useEffect(() => {
    if (!moved.current) return;
    if (status === "review") reviewRef.current?.focus();
    else if (status === "active") promptRef.current?.focus();
    // A failed submit replaces the button that was pressed: "Try again" takes its place.
    else if (status === "error") retryRef.current?.focus();
  }, [index, status]);

  function go(event: QuizEvent) {
    moved.current = true;
    dispatch(event);
  }

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
    moved.current = true;
    dispatch({ type: "SUBMIT_START" });
    try {
      await onSubmit(answers, current.flagged);
      dispatch({ type: "SUBMIT_SUCCESS" });
    } catch (err) {
      dispatch({
        type: "SUBMIT_FAILURE",
        message: userMessage(err, "Your answers could not be submitted. They are kept on this page. Please try again."),
      });
    }
  }

  // ---------- keyboard ----------
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const current = stateRef.current;
    if (current.status !== "active" || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      // On an answer, the arrow keys belong to the group of answers.
      if (target.getAttribute("role") === "radio") return;
      e.preventDefault();
      go({ type: e.key === "ArrowRight" ? "NEXT" : "PREV" });
      return;
    }

    const question = questions[current.index];
    if (!question) return;
    // The keys name an answer by its place on screen; the answer recorded is
    // the stored one at that place. The order is the one the answers are drawn
    // in, whether the question is shuffled or keeps its stored order.
    const digit = Number(e.key);
    const place =
      e.key.length === 1 && Number.isInteger(digit) && digit >= 1
        ? digit - 1
        : (OPTION_LETTERS as readonly string[]).indexOf(e.key.toUpperCase());
    if (place < 0 || place >= question.options.length) return;
    e.preventDefault();
    const order = answerOrder(seed, question.id, question.options.length, question.keepOrder);
    dispatch({
      type: "ANSWER",
      questionId: question.id,
      value: { kind: "single", selectedIndex: order[place] },
    });
  }

  // ---------- render ----------
  if (state.status === "results") return null; // parent renders results

  if (state.status === "error") {
    return (
      <div className="glass mx-auto grid w-full max-w-2xl gap-4 rounded-lg p-5 sm:p-8">
        <p role="alert" className="cb-measure text-small">
          {state.message}
        </p>
        <Button ref={retryRef} onClick={() => go({ type: "RETRY" })} className="justify-self-start">
          Try again
        </Button>
      </div>
    );
  }

  const question = questions[index];
  const answered = Object.keys(state.responses).length;
  const complete = isComplete(state, total);
  const response = question ? state.responses[question.id] : undefined;
  const flagged = question ? state.flagged.includes(question.id) : false;

  // The review: every question as a numbered cell, before the final submit.
  if (state.status === "review") {
    const unanswered = unansweredIndexes(state, questions.map((q) => q.id)).length;
    const flaggedCount = state.flagged.length;
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4">
        <h2 ref={reviewRef} tabIndex={-1} className="text-lg font-semibold">
          Review your answers before you submit
        </h2>
        <p className="cb-measure text-small text-muted-foreground">
          You have answered {answered} of {total} {total === 1 ? "question" : "questions"}.
          {unanswered > 0 && ` ${unanswered} ${unanswered === 1 ? "question is" : "questions are"} not answered.`}
          {flaggedCount > 0 &&
            ` ${flaggedCount} ${flaggedCount === 1 ? "question is" : "questions are"} flagged for review.`}{" "}
          Choose a question number to return to it.
        </p>
        <ul aria-label="Questions" className="flex flex-wrap gap-1.5">
          {questions.map((q, i) => {
            const has = !!state.responses[q.id];
            const isFlagged = state.flagged.includes(q.id);
            return (
              <li key={q.id}>
                <button
                  type="button"
                  // The name begins with the number that is shown.
                  aria-label={`${i + 1}: ${has ? "answered" : "not answered"}${isFlagged ? ", flagged" : ""}`}
                  onClick={() => {
                    moved.current = true;
                    dispatch({ type: "EXIT_REVIEW" });
                    dispatch({ type: "NAVIGATE", to: i });
                  }}
                  className={cn(
                    // Answered and not answered differ in lightness, not in hue alone.
                    "relative flex size-9 items-center justify-center rounded-md border font-medium tabular-nums transition-colors pointer-coarse:size-11",
                    has
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                      : "border-input bg-card text-foreground hover:border-primary hover:bg-tint-hover"
                  )}
                >
                  {/* The size is set on the figure itself: the class merger takes the
                      type scale's sizes for colours and would drop it beside one. */}
                  <span className="text-note">{i + 1}</span>
                  {isFlagged && (
                    <span
                      aria-hidden
                      className="absolute -right-1 -top-1 size-2.5 rounded-xs bg-warning-ink ring-2 ring-background"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="flex flex-wrap gap-x-5 gap-y-1 text-note text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-xs border border-primary bg-primary" />
            Answered
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-xs border border-input bg-card" />
            Not answered
          </span>
          {config.allowFlagging && (
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-2.5 rounded-xs bg-warning-ink" />
              Flagged for review
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => go({ type: "EXIT_REVIEW" })}>
            Return to the questions
          </Button>
          <Button onClick={handleSubmit} disabled={answered === 0}>
            {submitLabel}
          </Button>
        </div>
      </div>
    );
  }

  const lastKey = question ? OPTION_LETTERS[Math.min(question.options.length, OPTION_LETTERS.length) - 1] : null;

  return (
    <div
      // Focusable by a press anywhere on the player, so the keys then act on it.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="group/quiz mx-auto grid w-full max-w-2xl gap-4"
    >
      {/* Where the learner is, and how much is answered. */}
      <div className="flex items-end justify-between gap-4">
        <div className="grid flex-1 gap-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-small">
            <span className="font-medium">
              Question {index + 1} of {total}
            </span>
            <span className="text-note text-muted-foreground">
              {answered} of {total} answered
            </span>
          </div>
          {/* The figure is printed beside it, so the bar itself is not read out. */}
          <ProgressBar value={total > 0 ? (answered / total) * 100 : 0} />
        </div>
        {config.allowFlagging && (
          <Button
            variant="outline"
            size="sm"
            // One name, whatever the state: the state is "pressed".
            aria-pressed={flagged}
            onClick={() => question && dispatch({ type: "TOGGLE_FLAG", questionId: question.id })}
            className="aria-pressed:border-primary aria-pressed:bg-tint-selected"
          >
            <Flag aria-hidden className={cn(flagged && "fill-warning-ink text-warning-ink")} />
            Flag for review
          </Button>
        )}
      </div>

      {question && (
        <div className="glass grid gap-5 rounded-lg p-5 sm:p-8">
          <h2
            id={promptId}
            // Takes the focus so that it is read; it is not a control.
            ref={promptRef}
            tabIndex={-1}
            className="text-pretty text-body font-medium"
          >
            {question.question_text}
          </h2>
          <MultipleChoice
            questionId={question.id}
            options={question.options}
            seed={seed}
            keepOrder={question.keepOrder}
            value={response?.value}
            labelledBy={promptId}
            onChange={(value) => dispatch({ type: "ANSWER", questionId: question.id, value })}
          />
          {/* Said only while the keys would act: the focus is inside the player, on a
              device with a keyboard. Its line is always kept, so nothing moves. */}
          <p className="invisible text-note text-muted-foreground group-focus-within/quiz:visible pointer-coarse:hidden">
            You can answer with the keys A to {lastKey}. The left and right arrow keys change the question.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="outline" onClick={() => go({ type: "PREV" })} disabled={index === 0 || submitting}>
          Back
        </Button>
        <div className="flex flex-wrap gap-2">
          {config.allowReview && (
            <Button variant="secondary" onClick={() => go({ type: "ENTER_REVIEW" })} disabled={submitting}>
              Review your answers
            </Button>
          )}
          {index === total - 1 || complete ? (
            <Button onClick={handleSubmit} loading={submitting} disabled={answered === 0}>
              {submitLabel}
            </Button>
          ) : (
            <Button onClick={() => go({ type: "NEXT" })} disabled={submitting}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
