"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Controlled ordering renderer: items are moved up and down into the right
 * sequence. value.order[displayPos] = original option index at that position.
 */
export function Ordering({
  questionId,
  items,
  correctPositions,
  seed,
  value,
  onChange,
  revealed = false,
}: {
  questionId: string;
  /** Item text by original index. */
  items: string[];
  /** correctPositions[originalIndex] = the position the item belongs at. */
  correctPositions: number[];
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  revealed?: boolean;
}) {
  const initial = useMemo(
    () => seededPermutation(seed, questionId, items.length),
    [seed, questionId, items.length]
  );
  const order = value?.kind === "ordering" ? value.order : initial;

  function move(position: number, delta: -1 | 1) {
    const target = position + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[position], next[target]] = [next[target], next[position]];
    onChange({ kind: "ordering", order: next });
  }

  return (
    <ol className="grid gap-2">
      {order.map((originalIndex, position) => {
        const isRight = revealed && correctPositions[originalIndex] === position;
        return (
          <li
            key={originalIndex}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border bg-card px-4 py-2.5 text-small",
              isRight && "border-success bg-success/10",
              revealed && !isRight && "border-destructive bg-destructive/10"
            )}
          >
            <span className="text-note tabular-nums text-muted-foreground">{position + 1}</span>
            <span className="flex-1">{items[originalIndex]}</span>
            {revealed ? (
              <>
                {isRight ? (
                  <Check aria-hidden className="size-4 shrink-0 text-success" />
                ) : (
                  <X aria-hidden className="size-4 shrink-0 text-destructive" />
                )}
                {/* The mark in words, for a reader who does not see the colour or the icon. */}
                <span className="sr-only">{isRight ? "In the correct position." : "Not in the correct position."}</span>
              </>
            ) : (
              <span className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Move up: ${items[originalIndex]}`}
                  disabled={position === 0}
                  onClick={() => move(position, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  aria-label={`Move down: ${items[originalIndex]}`}
                  disabled={position === order.length - 1}
                  onClick={() => move(position, 1)}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
