"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { cn } from "@/lib/utils";

/**
 * The answers to a question with more than one correct answer: each can be
 * pressed on and off. The frame, the edge and the press are the shared answer
 * control's (components/quiz/AnswerOption), with a check box in place of its
 * key box, because here several answers are chosen at once.
 *
 * Once revealed, a mark is carried three ways, never by colour alone: the
 * frame, the box (a check or a cross) and words for a screen reader.
 */
export function MultipleSelect({
  questionId,
  options,
  correctIndexes,
  seed,
  value,
  onChange,
  revealed = false,
  labelledBy,
}: {
  questionId: string;
  options: string[];
  /** Original indexes of the correct answers. Used only when revealed. */
  correctIndexes: number[];
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  revealed?: boolean;
  /** The id of the question's text, which names the group of answers. */
  labelledBy?: string;
}) {
  const permutation = useMemo(
    () => seededPermutation(seed, questionId, options.length),
    [seed, questionId, options.length]
  );
  const selected = new Set(value?.kind === "multi" ? value.selectedIndexes : []);
  const correct = new Set(correctIndexes);

  function toggle(originalIndex: number) {
    const next = new Set(selected);
    if (next.has(originalIndex)) next.delete(originalIndex);
    else next.add(originalIndex);
    onChange({ kind: "multi", selectedIndexes: [...next].sort((a, b) => a - b) });
  }

  return (
    <div className="grid gap-2.5">
      <p id={`${questionId}-how`} className="text-note text-muted-foreground">
        Choose every answer that applies.
      </p>
      <div
        role="group"
        {...(labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Answers" })}
        aria-describedby={`${questionId}-how`}
        className="grid gap-2.5"
      >
        {permutation.map((originalIndex) => {
          const isSelected = selected.has(originalIndex);
          const isCorrect = revealed && correct.has(originalIndex);
          const isWrongPick = revealed && isSelected && !correct.has(originalIndex);
          const srPrefix = !revealed
            ? null
            : isCorrect
              ? isSelected
                ? "Your answer, which is correct: "
                : "Correct answer, which you did not choose: "
              : isWrongPick
                ? "Your answer, which is incorrect: "
                : null;
          return (
            <button
              key={originalIndex}
              type="button"
              aria-pressed={isSelected}
              disabled={revealed}
              onClick={() => toggle(originalIndex)}
              className={cn(
                "group/option flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border bg-card px-3.5 py-3 text-left",
                // A hover answers at once; a mark is not animated at all.
                revealed ? "transition-none" : "transition-[border-color,background-color] duration-100",
                !revealed && !isSelected && "border-input hover:border-primary hover:bg-tint-hover active:bg-tint-press",
                !revealed && isSelected && "border-primary bg-tint-selected",
                isCorrect && "border-success bg-success/10",
                isWrongPick && "border-destructive bg-destructive/10",
                revealed && !isCorrect && !isWrongPick && "border-border text-muted-foreground"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-xs border",
                  !revealed && !isSelected && "border-input group-hover/option:border-primary",
                  !revealed && isSelected && "border-primary bg-primary text-primary-foreground",
                  isCorrect && "border-success bg-success text-success-foreground",
                  isWrongPick && "border-destructive bg-destructive text-destructive-foreground",
                  revealed && !isCorrect && !isWrongPick && "border-border"
                )}
              >
                {isWrongPick ? (
                  <X className="size-3.5" strokeWidth={3} />
                ) : isCorrect || isSelected ? (
                  <Check className="size-3.5" strokeWidth={3} />
                ) : null}
              </span>
              <span className="min-w-0 text-small leading-snug [overflow-wrap:anywhere]">
                {srPrefix && <span className="sr-only">{srPrefix}</span>}
                {options[originalIndex]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
