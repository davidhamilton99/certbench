"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { cn } from "@/lib/utils";

/**
 * Fully controlled single-select renderer. Options display in a seeded
 * shuffle (stable across resume); indexes reported through onChange are
 * always ORIGINAL indexes so grading never depends on display order.
 */
export function MultipleChoice({
  questionId,
  options,
  seed,
  value,
  onChange,
  revealed = false,
  correctIndex,
}: {
  questionId: string;
  options: string[];
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  /** When true, shows correct/incorrect styling (immediate-feedback modes). */
  revealed?: boolean;
  /** Required when revealed. */
  correctIndex?: number;
}) {
  const permutation = useMemo(
    () => seededPermutation(seed, questionId, options.length),
    [seed, questionId, options.length]
  );

  const selectedOriginal =
    value?.kind === "single" ? value.selectedIndex : undefined;

  return (
    <div role="radiogroup" className="grid gap-2">
      {permutation.map((originalIndex, displayPos) => {
        const isSelected = selectedOriginal === originalIndex;
        const isCorrect = revealed && originalIndex === correctIndex;
        const isWrongPick = revealed && isSelected && originalIndex !== correctIndex;
        return (
          <button
            key={originalIndex}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={revealed}
            onClick={() =>
              onChange({ kind: "single", selectedIndex: originalIndex })
            }
            className={cn(
              "flex items-start gap-3 rounded-lg border px-4 py-3.5 text-left text-sm transition-colors",
              !revealed && isSelected && "border-primary bg-primary/5 ring-1 ring-primary",
              !revealed &&
                !isSelected &&
                "hover:border-muted-foreground/40 hover:bg-accent",
              isCorrect && "border-success bg-success/10",
              isWrongPick && "border-danger bg-danger/10",
              revealed && "cursor-default"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                isSelected && !revealed && "border-primary bg-primary text-primary-foreground",
                isCorrect && "border-success bg-success text-success-foreground",
                isWrongPick && "border-danger bg-danger text-danger-foreground"
              )}
            >
              {isCorrect ? (
                <Check className="size-3" />
              ) : isWrongPick ? (
                <X className="size-3" />
              ) : (
                String.fromCharCode(65 + displayPos)
              )}
            </span>
            <span className="leading-relaxed">{options[originalIndex]}</span>
          </button>
        );
      })}
    </div>
  );
}
