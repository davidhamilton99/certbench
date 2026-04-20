"use client";

import type { MatchingOption } from "../types";

interface Props {
  /**
   * Matching pairs in their natural (canonical) order. The left column
   * always shows these in order. The right column shows them scrambled
   * per `rightOrder`.
   */
  options: MatchingOption[];
  /**
   * Scrambled display order for the right column: display-position →
   * original option index. For a correct pairing, option `i` on the left
   * must be matched with original index `i` on the right.
   */
  rightOrder: number[];
  /** Currently selected left item (original index), or null. */
  activeLeft: number | null;
  /** Confirmed pairs: left original idx → right original idx. */
  pairs: Map<number, number>;
  /** True once the user has submitted an answer. */
  isRevealed: boolean;
  onLeftClick: (leftIdx: number) => void;
  /** Called with the display position (0-based) in the right column. */
  onRightClick: (displayPos: number) => void;
}

/**
 * Matching question. Left column lists terms; right column lists the
 * scrambled definitions. User clicks a term, then the matching definition
 * — the pair is stored and the next click sequence begins. Clicking the
 * same left item again deselects it. On reveal, pairs are styled green or
 * red based on whether the right original index matches the left index.
 */
export function MatchingQuestion({
  options,
  rightOrder,
  activeLeft,
  pairs,
  isRevealed,
  onLeftClick,
  onRightClick,
}: Props) {
  return (
    <div className="flex flex-col gap-3">
      {!isRevealed && (
        <p className="text-[12px] text-text-muted">
          Click a term, then click its matching definition.
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        {/* Left column: terms */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Term
          </p>
          {options.map((pair, leftIdx) => {
            const isActive = activeLeft === leftIdx;
            const pairedRightOrigIdx = pairs.get(leftIdx);
            const isPaired = pairedRightOrigIdx !== undefined;
            const isCorrectPair =
              isRevealed && pairedRightOrigIdx === leftIdx;
            const isWrongPair =
              isRevealed && isPaired && pairedRightOrigIdx !== leftIdx;

            let borderStyle: string;
            if (isRevealed) {
              borderStyle = isCorrectPair
                ? "border-success bg-success-bg"
                : isWrongPair
                  ? "border-danger bg-danger-bg"
                  : "border-border bg-bg-surface opacity-50";
            } else if (isActive) {
              borderStyle =
                "border-primary bg-info-bg ring-2 ring-primary/30";
            } else if (isPaired) {
              borderStyle = "border-primary bg-info-bg";
            } else {
              borderStyle =
                "border-border bg-bg-surface hover:border-border-dark";
            }

            return (
              <button
                key={leftIdx}
                onClick={() => !isRevealed && onLeftClick(leftIdx)}
                disabled={isRevealed}
                className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 ${borderStyle}`}
              >
                <span className="text-[14px] text-text-primary leading-snug">
                  {pair.left}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right column: definitions (scrambled) */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider">
            Definition
          </p>
          {rightOrder.map((origRightIdx, displayPos) => {
            const pair = options[origRightIdx];
            const pairedLeftEntry = [...pairs.entries()].find(
              ([, v]) => v === origRightIdx
            );
            const isPaired = pairedLeftEntry !== undefined;
            const isCorrectPair =
              isRevealed &&
              pairedLeftEntry !== undefined &&
              pairedLeftEntry[0] === origRightIdx;
            const isWrongPair = isRevealed && isPaired && !isCorrectPair;
            const isClickable = !isRevealed && activeLeft !== null;

            let borderStyle: string;
            if (isRevealed) {
              borderStyle = isCorrectPair
                ? "border-success bg-success-bg"
                : isWrongPair
                  ? "border-danger bg-danger-bg"
                  : "border-border bg-bg-surface opacity-50";
            } else if (isPaired) {
              borderStyle = "border-primary bg-info-bg";
            } else if (isClickable) {
              borderStyle =
                "border-border bg-bg-surface hover:border-primary hover:bg-info-bg";
            } else {
              borderStyle = "border-border bg-bg-surface";
            }

            return (
              <button
                key={origRightIdx}
                onClick={() => isClickable && onRightClick(displayPos)}
                disabled={isRevealed || activeLeft === null}
                className={`w-full text-left p-3 rounded-lg border transition-colors duration-150 ${borderStyle}`}
              >
                <span className="text-[14px] text-text-primary leading-snug">
                  {pair.right}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Show correct pairs when revealed */}
      {isRevealed && (
        <div className="p-3 bg-bg-page rounded-lg border border-border">
          <p className="text-[12px] font-medium text-text-muted mb-1.5">
            Correct matches:
          </p>
          {options.map((pair, i) => (
            <p
              key={i}
              className="text-[13px] text-text-secondary leading-relaxed"
            >
              {pair.left}{" "}
              <span className="text-text-muted">→</span>{" "}
              {pair.right}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
