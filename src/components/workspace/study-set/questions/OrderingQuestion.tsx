"use client";

import type { OrderingOption } from "../types";

interface Props {
  /** Options carrying their correct_position. */
  options: OrderingOption[];
  /**
   * Scrambled display order (original indices in display sequence).
   * Empty means "use options as-is" — used as a defensive fallback.
   */
  displayOrder: number[];
  /**
   * Original indices in the order the user has placed them.
   * Clicking a placed item again removes it from the sequence.
   */
  sequence: number[];
  /** True once the user has submitted an answer. */
  isRevealed: boolean;
  onToggleItem: (origIdx: number) => void;
}

/**
 * Ordering question. Click items in the correct order — each click appends
 * the clicked option's index to `sequence`; clicking an already-placed item
 * removes it. On reveal, the placed items show green/red based on whether
 * their placed position matches `correct_position`, and a separate panel
 * shows the canonical correct order.
 */
export function OrderingQuestion({
  options,
  displayOrder,
  sequence,
  isRevealed,
  onToggleItem,
}: Props) {
  const order =
    displayOrder.length > 0 ? displayOrder : options.map((_, i) => i);

  return (
    <div className="flex flex-col gap-2">
      {!isRevealed && (
        <p className="text-[12px] text-text-muted">
          Click items in the correct order. Click a numbered item to remove it from the sequence.
        </p>
      )}
      {order.map((origIdx) => {
        const option = options[origIdx];
        const posInSeq = sequence.indexOf(origIdx);
        const seqNum = posInSeq >= 0 ? posInSeq + 1 : null;
        const isPlacedCorrectly =
          isRevealed &&
          seqNum !== null &&
          option.correct_position === posInSeq;
        const isPlacedWrongly =
          isRevealed &&
          seqNum !== null &&
          option.correct_position !== posInSeq;
        const wasNotPlaced = isRevealed && seqNum === null;

        let borderStyle: string;
        let numStyle: string;

        if (isRevealed) {
          if (isPlacedCorrectly) {
            borderStyle = "border-success bg-success-bg";
            numStyle = "bg-success text-white";
          } else if (isPlacedWrongly) {
            borderStyle = "border-danger bg-danger-bg";
            numStyle = "bg-danger text-white";
          } else if (wasNotPlaced) {
            borderStyle = "border-border bg-bg-surface opacity-50";
            numStyle =
              "bg-bg-page text-text-secondary border border-border";
          } else {
            borderStyle = "border-border bg-bg-surface";
            numStyle =
              "bg-bg-page text-text-secondary border border-border";
          }
        } else if (seqNum !== null) {
          borderStyle = "border-primary bg-info-bg";
          numStyle = "bg-primary text-white";
        } else {
          borderStyle =
            "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page";
          numStyle =
            "bg-bg-page text-text-secondary border border-border";
        }

        return (
          <button
            key={origIdx}
            onClick={() => {
              if (isRevealed) return;
              onToggleItem(origIdx);
            }}
            disabled={isRevealed}
            className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderStyle}`}
          >
            <div className="flex gap-3">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-mono font-medium ${numStyle}`}
              >
                {seqNum ?? "\u2013"}
              </span>
              <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                {option.text}
              </span>
            </div>
          </button>
        );
      })}
      {isRevealed && (
        <div className="mt-1 p-3 bg-bg-page rounded-lg border border-border">
          <p className="text-[12px] font-medium text-text-muted mb-1.5">
            Correct order:
          </p>
          {[...options]
            .sort((a, b) => a.correct_position - b.correct_position)
            .map((opt, i) => (
              <p
                key={i}
                className="text-[13px] text-text-secondary leading-relaxed"
              >
                {i + 1}. {opt.text}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
