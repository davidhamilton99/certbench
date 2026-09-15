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
 *
 * Styled for the CertBench 2.0 dark instrument surfaces (exam, SRS, study):
 * a clear accent-lit selected state, calm hover, and emerald/rose correctness
 * when revealed.
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
    <div role="radiogroup" className="grid gap-2.5">
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
              "flex items-start gap-3 rounded-xl border border-border bg-foreground/[0.02] px-4 py-3.5 text-left text-sm transition-all duration-150",
              !revealed &&
                isSelected &&
                "border-primary/70 bg-primary/10 ring-1 ring-primary/40 shadow-[0_10px_28px_-16px_var(--color-primary)]",
              !revealed &&
                !isSelected &&
                "hover:-translate-y-px hover:border-primary/40 hover:bg-foreground/[0.05]",
              isCorrect && "border-success/60 bg-success/10",
              isWrongPick && "border-danger/60 bg-danger/10",
              revealed && "cursor-default"
            )}
          >
            <span
              className={cn(
                "mt-px flex size-6 shrink-0 items-center justify-center rounded-full border border-border font-mono text-[11px] text-muted-foreground transition-colors",
                isSelected &&
                  !revealed &&
                  "border-primary bg-primary text-primary-foreground",
                isCorrect && "border-success bg-success text-success-foreground",
                isWrongPick && "border-danger bg-danger text-danger-foreground"
              )}
            >
              {isCorrect ? (
                <Check className="size-3.5" />
              ) : isWrongPick ? (
                <X className="size-3.5" />
              ) : (
                String.fromCharCode(65 + displayPos)
              )}
            </span>
            <span className="leading-relaxed text-foreground">
              {options[originalIndex]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
