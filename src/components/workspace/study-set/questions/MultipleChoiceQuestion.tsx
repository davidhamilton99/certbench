"use client";

import type { MCTFOption } from "../types";

interface Props {
  /** Options in display order (already shuffled by the parent). */
  shuffledOptions: MCTFOption[];
  /** Display-order index of the user's selection, or null. */
  selectedOption: number | null;
  /** Display-order index that holds the correct answer. */
  shuffledCorrectIndex: number;
  /** True once the user has submitted an answer. Disables interaction and shows feedback. */
  isRevealed: boolean;
  onSelect: (index: number) => void;
}

/**
 * Single-answer MC question. Buttons show lettered circles A–D; selection
 * is single-choice. When revealed, the correct option turns green, a wrong
 * selection turns red, and the rest dim to 50%.
 */
export function MultipleChoiceQuestion({
  shuffledOptions,
  selectedOption,
  shuffledCorrectIndex,
  isRevealed,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {shuffledOptions.map((option, index) => {
        const letter = String.fromCharCode(65 + index);
        const isSelected = selectedOption === index;
        const isCorrectOption = index === shuffledCorrectIndex;

        let borderStyle: string;
        let circleStyle: string;

        if (isRevealed) {
          if (isCorrectOption) {
            borderStyle = "border-success bg-success-bg ring-1 ring-success";
            circleStyle = "bg-success text-white";
          } else if (isSelected && !isCorrectOption) {
            borderStyle = "border-danger bg-danger-bg ring-1 ring-danger";
            circleStyle = "bg-danger text-white";
          } else {
            borderStyle = "border-border bg-bg-surface opacity-50";
            circleStyle =
              "bg-bg-page text-text-secondary border border-border";
          }
        } else if (isSelected) {
          borderStyle = "border-primary bg-info-bg ring-1 ring-primary";
          circleStyle = "bg-primary text-white";
        } else {
          borderStyle =
            "border-border bg-bg-surface hover:border-border-dark hover:bg-bg-page";
          circleStyle =
            "bg-bg-page text-text-secondary border border-border";
        }

        return (
          <button
            key={index}
            onClick={() => !isRevealed && onSelect(index)}
            disabled={isRevealed}
            className={`w-full text-left p-4 rounded-lg border transition-colors duration-150 ${borderStyle}`}
          >
            <div className="flex gap-3">
              <span
                className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-mono font-medium ${circleStyle}`}
              >
                {letter}
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
