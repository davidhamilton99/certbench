"use client";

import type { MCTFOption } from "../types";

interface Props {
  /** Options in their original order. */
  options: MCTFOption[];
  /**
   * Scrambled display order (original indices in display sequence).
   * Empty means "use options as-is" — used as a defensive fallback during
   * the first render before initQuestionState has run.
   */
  displayOrder: number[];
  /** Original indices the user has selected. */
  selected: Set<number>;
  /** True once the user has submitted an answer. */
  isRevealed: boolean;
  onToggle: (origIdx: number) => void;
}

/**
 * Multi-select question. Checkbox-style boxes; multiple correct answers
 * possible. On reveal, four states are possible per option: correct+selected
 * (green check), correct+missed (green outline), wrong+selected (red),
 * wrong+not-selected (dim).
 */
export function MultipleSelectQuestion({
  options,
  displayOrder,
  selected,
  isRevealed,
  onToggle,
}: Props) {
  const order =
    displayOrder.length > 0 ? displayOrder : options.map((_, i) => i);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[12px] text-text-muted">
        {isRevealed ? "" : "Select all that apply."}
      </p>
      {order.map((origIdx) => {
        const option = options[origIdx];
        const isSelected = selected.has(origIdx);
        const isCorrectOpt = option.is_correct;

        let borderStyle: string;
        let boxStyle: string;

        if (isRevealed) {
          if (isCorrectOpt && isSelected) {
            borderStyle = "border-success bg-success-bg ring-1 ring-success";
            boxStyle = "bg-success text-white";
          } else if (isCorrectOpt && !isSelected) {
            // Missed correct
            borderStyle = "border-success bg-success-bg";
            boxStyle = "border border-success text-success";
          } else if (!isCorrectOpt && isSelected) {
            // Wrong selection
            borderStyle = "border-danger bg-danger-bg ring-1 ring-danger";
            boxStyle = "bg-danger text-white";
          } else {
            borderStyle = "border-border bg-bg-surface opacity-50";
            boxStyle =
              "bg-bg-page text-text-secondary border border-border";
          }
        } else if (isSelected) {
          borderStyle = "border-primary bg-info-bg ring-1 ring-primary";
          boxStyle = "bg-primary text-white";
        } else {
          borderStyle =
            "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page";
          boxStyle =
            "bg-bg-page text-text-secondary border border-border";
        }

        return (
          <button
            key={origIdx}
            onClick={() => {
              if (isRevealed) return;
              onToggle(origIdx);
            }}
            disabled={isRevealed}
            className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderStyle}`}
          >
            <div className="flex gap-3">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-[13px] font-medium ${boxStyle}`}
              >
                {isRevealed && isCorrectOpt ? "\u2713" : isSelected ? "\u2713" : ""}
              </span>
              <span className="text-[15px] leading-relaxed text-text-primary pt-0.5">
                {option.text}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
