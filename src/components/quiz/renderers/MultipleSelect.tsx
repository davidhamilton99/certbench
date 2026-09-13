"use client";

import { useMemo } from "react";
import { Check, Square, SquareCheck, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { cn } from "@/lib/utils";

/** Controlled multi-select renderer (select all that apply). */
export function MultipleSelect({
  questionId,
  options,
  correctIndexes,
  seed,
  value,
  onChange,
  revealed = false,
}: {
  questionId: string;
  options: string[];
  /** Original indexes of correct options — used only when revealed. */
  correctIndexes: number[];
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  revealed?: boolean;
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
    <div role="group" aria-label="Select all that apply" className="grid gap-2">
      {permutation.map((originalIndex) => {
        const isSelected = selected.has(originalIndex);
        const isCorrect = revealed && correct.has(originalIndex);
        const isWrongPick = revealed && isSelected && !correct.has(originalIndex);
        return (
          <button
            key={originalIndex}
            type="button"
            aria-pressed={isSelected}
            disabled={revealed}
            onClick={() => toggle(originalIndex)}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3.5 text-left text-sm transition-all duration-150",
              !revealed &&
                isSelected &&
                "border-primary/70 bg-primary/10 ring-1 ring-primary/40 shadow-[0_10px_28px_-16px_var(--color-primary)]",
              !revealed && !isSelected && "hover:-translate-y-px hover:border-primary/40 hover:bg-white/[0.05]",
              isCorrect && "border-success/60 bg-success/10",
              isWrongPick && "border-danger/60 bg-danger/10",
              revealed && "cursor-default"
            )}
          >
            <span className="mt-0.5 shrink-0">
              {revealed ? (
                isCorrect ? (
                  <Check className="size-4 text-success" />
                ) : isWrongPick ? (
                  <X className="size-4 text-danger" />
                ) : (
                  <Square className="size-4 text-muted-foreground" />
                )
              ) : isSelected ? (
                <SquareCheck className="size-4 text-primary" />
              ) : (
                <Square className="size-4 text-muted-foreground" />
              )}
            </span>
            <span className="leading-relaxed">{options[originalIndex]}</span>
          </button>
        );
      })}
    </div>
  );
}
