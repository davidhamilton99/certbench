"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { cn } from "@/lib/utils";

/**
 * Controlled matching renderer: each term on the left is given a definition
 * from a list (the definitions are listed in a seeded shuffle). `pairs` maps
 * the left original index to the right original index, both as strings.
 */
export function Matching({
  questionId,
  pairs,
  seed,
  value,
  onChange,
  revealed = false,
}: {
  questionId: string;
  pairs: { left: string; right: string }[];
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  revealed?: boolean;
}) {
  const rightOrder = useMemo(
    () => seededPermutation(seed, `${questionId}:right`, pairs.length),
    [seed, questionId, pairs.length]
  );
  const chosen = value?.kind === "matching" ? value.pairs : {};

  function pick(leftIndex: number, rightIndex: string) {
    onChange({
      kind: "matching",
      pairs: { ...chosen, [String(leftIndex)]: rightIndex },
    });
  }

  return (
    <div className="grid gap-2">
      {pairs.map((pair, leftIndex) => {
        const picked = chosen[String(leftIndex)];
        const isRight = revealed && picked === String(leftIndex);
        return (
          <div
            key={leftIndex}
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-small",
              isRight && "border-success bg-success/10",
              revealed && !isRight && "border-destructive bg-destructive/10"
            )}
          >
            <span className="min-w-32 flex-1 font-medium">{pair.left}</span>
            {revealed ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                {isRight ? (
                  <Check aria-hidden className="size-4 shrink-0 text-success" />
                ) : (
                  <X aria-hidden className="size-4 shrink-0 text-destructive" />
                )}
                {/* The mark in words, for a reader who does not see the colour or the icon. */}
                <span className="sr-only">{isRight ? "Correct: " : "Incorrect. The correct match is "}</span>
                {pair.right}
              </span>
            ) : (
              <select
                aria-label={`Match for ${pair.left}`}
                value={picked ?? ""}
                onChange={(e) => pick(leftIndex, e.target.value)}
                // 16px on a phone, so the browser does not zoom the page when the list opens.
                className="h-10 min-w-40 flex-1 rounded-md border border-input bg-card px-2 text-base focus-visible:border-ring md:text-small pointer-coarse:h-11 dark:[color-scheme:dark]"
              >
                <option value="" disabled>
                  Choose a match
                </option>
                {rightOrder.map((rightIndex) => (
                  <option key={rightIndex} value={String(rightIndex)}>
                    {pairs[rightIndex].right}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </div>
  );
}
