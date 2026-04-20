"use client";

import { useEffect, useState } from "react";

interface Props {
  /** 1-based index of the current question. */
  currentNumber: number;
  /** Total question count. */
  total: number;
  /** Called with a 1-based target. Parent is responsible for clamping. */
  onJump: (questionNumber: number) => void;
}

/**
 * Inline "Question X of Y" widget with an editable number input. The user
 * can type any number and press Enter (or blur the field) to jump. The
 * local `buffer` state decouples typing from the committed value so multi-
 * digit input doesn't trigger an intermediate jump.
 */
export function QuestionJumper({ currentNumber, total, onJump }: Props) {
  const [buffer, setBuffer] = useState(String(currentNumber));

  // Keep the input in sync when the parent advances normally.
  useEffect(() => {
    setBuffer(String(currentNumber));
  }, [currentNumber]);

  const commit = () => {
    const parsed = Number.parseInt(buffer, 10);
    if (Number.isFinite(parsed) && parsed !== currentNumber) {
      onJump(parsed);
    } else {
      // Invalid or unchanged — restore the buffer to the current value.
      setBuffer(String(currentNumber));
    }
  };

  // Size the input to fit the widest possible value (e.g. "324" needs 3 chars).
  // Add a small cushion for padding so digits don't collide with the border.
  const digitCount = Math.max(String(total).length, 2);
  const inputStyle = { width: `calc(${digitCount}ch + 0.75rem)` };

  return (
    <span className="text-[13px] font-mono text-text-muted flex items-center gap-1">
      <span>Question</span>
      <input
        type="number"
        min={1}
        max={total}
        value={buffer}
        onChange={(e) => setBuffer(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            (e.target as HTMLInputElement).blur();
          }
        }}
        aria-label="Jump to question number"
        style={inputStyle}
        className="text-center bg-bg-surface border border-border rounded px-1 py-0.5 font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <span>of {total}</span>
    </span>
  );
}
