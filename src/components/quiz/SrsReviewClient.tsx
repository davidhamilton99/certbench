"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, PauseCircle } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import {
  startSrsReview,
  submitSrsAnswer,
  suspendSrsCard,
  type SrsCard,
} from "@/contracts/srs";
import { ApiError } from "@/contracts/common";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { MultipleChoice } from "./renderers/MultipleChoice";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Grade {
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
  nextReviewAt: string;
  intervalDays: number;
  streak: number;
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

export function SrsReviewClient({ certId }: { certId: string }) {
  const [state, setState] = useState<ClientState>({ phase: "loading" });
  const started = useRef(false);
  // Session-stable shuffle seed (lazy init runs once per mount).
  const [seed] = useState(() => crypto.randomUUID());

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
          message:
            err instanceof ApiError ? err.message : "Couldn't load your cards",
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
      <p className="py-16 text-center text-sm text-muted-foreground">
        {state.message}
      </p>
    );
  }

  if (state.phase === "empty") {
    return (
      <div className="mx-auto grid max-w-md gap-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          Nothing due right now — cards come back when it&apos;s time to review them.
        </p>
        <Button asChild variant="outline" className="justify-self-center">
          <Link href="/dashboard">Back to your plan</Link>
        </Button>
      </div>
    );
  }

  if (state.phase === "done") {
    return (
      <div className="mx-auto grid max-w-md gap-4 py-16 text-center">
        <p className="text-2xl font-semibold">
          {state.correct}/{state.total}
        </p>
        <p className="text-sm text-muted-foreground">
          Session complete — intervals rescheduled based on your answers.
        </p>
        <Button asChild className="justify-self-center">
          <Link href="/dashboard">Back to your plan</Link>
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
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
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
      toast.success("Card suspended — it won't be scheduled again");
      next();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-mono">
          {index + 1} / {cards.length}
        </span>
        <span className="text-muted-foreground">
          {card.overdueDays > 0
            ? `${card.overdueDays}d overdue`
            : "due today"}
        </span>
      </div>

      <Card>
        <CardContent className="grid gap-5">
          <p className="leading-relaxed">{card.questionText}</p>
          <MultipleChoice
            questionId={card.questionId}
            options={card.options}
            seed={seed}
            value={selection}
            onChange={answer}
            revealed={!!grade}
            correctIndex={grade?.correctIndex}
          />
          {grade && (
            <div className="grid gap-3 border-t pt-4 text-sm">
              {grade.explanation && (
                <p className="text-muted-foreground">{grade.explanation}</p>
              )}
              <p
                className={cn(
                  "flex items-center gap-2 text-xs",
                  grade.isCorrect ? "text-success" : "text-danger"
                )}
              >
                <CalendarClock className="size-3.5" />
                Next review in {grade.intervalDays}{" "}
                {grade.intervalDays === 1 ? "day" : "days"}
                {grade.streak > 1 && ` · streak ${grade.streak}`}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={suspend}
        >
          <PauseCircle className="size-4" />
          Suspend card
        </Button>
        {grade && (
          <Button onClick={next}>
            {isLast ? "Finish session" : "Next card"}
          </Button>
        )}
      </div>
    </div>
  );
}
