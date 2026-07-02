"use client";

import { useMemo } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Controlled ordering renderer: move items up/down into the right sequence.
 * value.order[displayPos] = original option index at that position.
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
              "flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm",
              isRight && "border-success bg-success/10",
              revealed && !isRight && "border-danger bg-danger/10"
            )}
          >
            <span className="font-mono text-xs text-muted-foreground">
              {position + 1}
            </span>
            <span className="flex-1 leading-relaxed">{items[originalIndex]}</span>
            {revealed ? (
              isRight ? (
                <Check className="size-4 shrink-0 text-success" />
              ) : (
                <X className="size-4 shrink-0 text-danger" />
              )
            ) : (
              <span className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Move up"
                  disabled={position === 0}
                  onClick={() => move(position, -1)}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label="Move down"
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
