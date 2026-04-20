"use client";

import type { MCTFOption } from "../types";

interface Props {
  /** The two T/F options (True and False) in fixed display order. */
  options: MCTFOption[];
  /** Index of the user's selection, or null. */
  selectedOption: number | null;
  /** Index that holds the correct answer. */
  correctIndex: number;
  /** True once the user has submitted an answer. */
  isRevealed: boolean;
  onSelect: (index: number) => void;
}

/**
 * True / False question. Visually identical to MC but without shuffling,
 * and the circle shows the first character of the option text (T or F).
 */
export function TrueFalseQuestion({
  options,
  selectedOption,
  correctIndex,
  isRevealed,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((option, index) => {
        const isSelected = selectedOption === index;
        const isCorrectOption = isRevealed && index === correctIndex;

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
                {option.text[0]}
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
