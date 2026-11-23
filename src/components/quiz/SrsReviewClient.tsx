"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  startSrsReview,
  submitSrsAnswer,
  suspendSrsCard,
  type SrsCard,
} from "@/contracts/srs";
import { userMessage } from "@/lib/errors/user-message";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { OPTION_LETTERS } from "@/components/quiz/AnswerOption";
import { answerOrder } from "@/components/quiz/answer-order";
import { MultipleChoice } from "./renderers/MultipleChoice";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Grade {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  intervalDays: number;
}

type ClientState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "empty" }
  | {
      phase: "active";
      cards: SrsCard[];
      index: number;
      selection: ResponseValue | undefined;
      grade: Grade | null;
      correctCount: number;
      submitting: boolean;
    }
  | { phase: "done"; total: number; correct: number };

/**
 * The spaced review: the questions that are due, one at a time. Each answer is
 * marked at once and sets when the question is next shown.
 *
 * After an answer the card waits for "Continue", which takes the focus, so
 * Enter or one tap moves on; nothing moves by itself. A question that follows
 * another takes the focus as it arrives, so it is read and the keys A to D go
 * on working. The keys act only while the focus is inside the card.
 */
export function SrsReviewClient({ certId }: { certId: string }) {
  const [state, setState] = useState<ClientState>({ phase: "loading" });
  const started = useRef(false);
  // Session-stable shuffle seed (lazy init runs once per mount).
  const [seed] = useState(() => crypto.randomUUID());
  const promptId = useId();
  const verdictId = useId();
  const promptRef = useRef<HTMLHeadingElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api(startSrsReview, { certId, limit: null })
      .then((r) =>
        setState(
          r.cards.length === 0
            ? { phase: "empty" }
            : {
                phase: "active",
                cards: r.cards,
                index: 0,
                selection: undefined,
                grade: null,
                correctCount: 0,
                submitting: false,
              }
        )
      )
      .catch((err) =>
        setState({
          phase: "error",
          message: userMessage(err, "Your review could not be loaded. Please try again."),
        })
      );
  }, [certId]);

  const activeIndex = state.phase === "active" ? state.index : -1;
  const graded = state.phase === "active" && state.grade !== null;

  // Once an answer is marked, "Continue" takes the focus; the verdict is read with it.
  useEffect(() => {
    if (graded) nextRef.current?.focus();
  }, [graded]);
  // A question that follows another takes the focus as it arrives.
  useEffect(() => {
    if (activeIndex > 0) promptRef.current?.focus();
  }, [activeIndex]);
  // The closing sentence takes it at the end.
  useEffect(() => {
    if (state.phase === "done") doneRef.current?.focus();
  }, [state.phase]);

  if (state.phase === "loading") {
    return (
      <div role="status" className="mx-auto flex w-full max-w-2xl items-center gap-3 py-24 text-small text-muted-foreground">
        <Loader2 aria-hidden className="size-5 animate-spin" />
        Your review is being prepared.
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

  if (state.phase === "empty") {
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-4 py-16">
        <p className="cb-measure text-small text-muted-foreground">
          No questions are due for review. Each question returns when its next review is due.
        </p>
        <Button asChild variant="outline" className="justify-self-start">
          <Link href="/dashboard">Return to your study plan</Link>
        </Button>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="glass mx-auto grid w-full max-w-2xl gap-4 rounded-lg p-5 sm:p-8">
        <h2 ref={doneRef} tabIndex={-1} className="cb-statement">
          You answered {state.correct} of {state.total} {state.total === 1 ? "question" : "questions"} correctly.
        </h2>
        <p className="cb-measure text-small text-muted-foreground">
          Each question has been scheduled for its next review.
        </p>
        <Button asChild className="justify-self-start">
          <Link href="/dashboard">Return to your study plan</Link>
        </Button>
      </div>
    );
  }

  // Pin the narrowed union member so callbacks keep the "active" type.
  const active = state;
  const { cards, index, selection, grade, correctCount, submitting } = active;
  const card = cards[index];
  const isLast = index === cards.length - 1;

  async function answer(value: ResponseValue) {
    if (grade || submitting || value.kind !== "single") return;
    setState({ ...active, selection: value, submitting: true });
    try {
      const g = await api(submitSrsAnswer, {
        certId,
        questionId: card.questionId,
        selectedIndex: value.selectedIndex,
      });
      setState({
        ...active,
        selection: value,
        grade: g,
        correctCount: correctCount + (g.isCorrect ? 1 : 0),
        submitting: false,
      });
    } catch (err) {
      toast.error(userMessage(err, "Your answer could not be saved. Please try again."));
      setState({ ...active, selection: undefined, submitting: false });
    }
  }

  function next() {
    if (isLast) {
      setState({
        phase: "done",
        total: cards.length,
        correct: correctCount,
      });
    } else {
      setState({
        ...active,
        index: index + 1,
        selection: undefined,
        grade: null,
      });
    }
  }

  async function suspend() {
    try {
      await api(suspendSrsCard, { questionId: card.questionId, suspend: true });
      toast.success("This question has been removed from your review.");
      next();
    } catch (err) {
      toast.error(userMessage(err, "The question could not be removed. Please try again."));
    }
  }

  /** The keys A to D (or 1 to 4) answer, while the focus is inside the card. */
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (grade || submitting || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const digit = Number(e.key);
    const place =
      e.key.length === 1 && Number.isInteger(digit) && digit >= 1
        ? digit - 1
        : (OPTION_LETTERS as readonly string[]).indexOf(e.key.toUpperCase());
    if (place < 0 || place >= card.options.length) return;
    e.preventDefault();
    // The order the answers are drawn in, whether the card is shuffled or keeps its stored order.
    const order = answerOrder(seed, card.questionId, card.options.length, card.keepOrder);
    void answer({ kind: "single", selectedIndex: order[place] });
  }

  const lastKey = OPTION_LETTERS[Math.min(card.options.length, OPTION_LETTERS.length) - 1];

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-small">
        <span className="font-medium">
          Question {index + 1} of {cards.length}
        </span>
        <span className="text-note text-muted-foreground">
          {card.overdueDays > 0
            ? `Due ${card.overdueDays} ${card.overdueDays === 1 ? "day" : "days"} ago`
            : "Due today"}
        </span>
      </div>

      <div
        // Focusable by a press anywhere on the card, so the keys then act on it.
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="group/srs glass grid gap-5 rounded-lg p-5 sm:p-8"
      >
        <h2
          id={promptId}
          // Takes the focus so that it is read; it is not a control.
          ref={promptRef}
          tabIndex={-1}
          className="text-pretty text-body font-medium"
        >
          {card.questionText}
        </h2>
        <MultipleChoice
          // Choosing is answering here: each answer goes to the server as it is given.
          commit
          questionId={card.questionId}
          options={card.options}
          seed={seed}
          // The explanation printed under the answers names one of them by its letter.
          keepOrder={card.keepOrder}
          value={selection}
          onChange={answer}
          revealed={!!grade}
          correctIndex={grade?.correctIndex}
          labelledBy={promptId}
          disabled={submitting}
        />
        {grade ? (
          <div className="grid gap-3 border-t border-border pt-4">
            <p id={verdictId} className="cb-measure text-small">
              <span className={cn("font-semibold", grade.isCorrect ? "text-success" : "text-destructive")}>
                {grade.isCorrect
                  ? "Correct."
                  : `Incorrect. The correct answer is ${card.options[grade.correctIndex]}.`}
              </span>{" "}
              {grade.explanation}
            </p>
            <p className="text-note text-muted-foreground">
              This question will be shown again in {grade.intervalDays} {grade.intervalDays === 1 ? "day" : "days"}.
            </p>
            <Button
              ref={nextRef}
              onClick={next}
              aria-describedby={verdictId}
              className="h-11 w-full justify-self-start sm:h-10 sm:w-auto"
            >
              Continue
            </Button>
          </div>
        ) : (
          // Said only while the keys would act: the focus is inside the card, on a
          // device with a keyboard. Its line is always kept, so nothing moves.
          <p className="invisible text-note text-muted-foreground group-focus-within/srs:visible pointer-coarse:hidden">
            You can answer with the keys A to {lastKey}.
          </p>
        )}
      </div>

      <div>
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={suspend} disabled={submitting}>
          Remove this question from your review
        </Button>
      </div>
    </div>
  );
}
