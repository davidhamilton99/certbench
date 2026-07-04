"use client";

import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { cn } from "@/lib/utils";

/**
 * Controlled matching renderer: each left term picks a right definition from
 * a dropdown (rights listed in a seeded shuffle). pairs maps left original
 * index -> right original index, both as strings.
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
              "flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-sm",
              isRight && "border-success bg-success/10",
              revealed && !isRight && "border-danger bg-danger/10"
            )}
          >
            <span className="min-w-32 flex-1 font-medium leading-relaxed">
              {pair.left}
            </span>
            {revealed ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                {isRight ? (
                  <Check className="size-4 text-success" />
                ) : (
                  <X className="size-4 text-danger" />
                )}
                {pair.right}
              </span>
            ) : (
              <select
                aria-label={`Match for ${pair.left}`}
                value={picked ?? ""}
                onChange={(e) => pick(leftIndex, e.target.value)}
                className="h-9 min-w-40 flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <option value="" disabled>
                  Choose…
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
