"use client";

import { useMemo } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { AnswerOption, OPTION_LETTERS, type AnswerState } from "@/components/quiz/AnswerOption";
import { seededPermutation } from "@/core/quiz-engine/shuffle";
import type { ResponseValue } from "@/core/quiz-engine/types";

/**
 * The answers to a question with one correct answer, fully controlled. The
 * answers are shown in a seeded shuffle (stable across a resume); the index
 * reported through onChange is always the ORIGINAL index, so grading never
 * depends on the order on screen.
 *
 * Each answer is the shared AnswerOption, so it looks and marks as it does on
 * the study path. How the set behaves depends on what a choice means:
 *
 *  - A choice that can still be changed (an exam, a study set before "Check
 *    answer") is a real radio group: one stop for the Tab key, the arrow keys
 *    move between the answers, and the group is named by the question.
 *  - Where choosing is answering (`commit`, the spaced review), the answers
 *    are plain buttons in a group named by the question. A radio button does
 *    not submit, so it would promise the wrong thing.
 */
export function MultipleChoice({
  questionId,
  options,
  seed,
  value,
  onChange,
  revealed = false,
  correctIndex,
  labelledBy,
  commit = false,
  disabled = false,
}: {
  questionId: string;
  options: string[];
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  /** When true, the answers are marked correct and incorrect and can no longer be changed. */
  revealed?: boolean;
  /** Required when revealed. */
  correctIndex?: number;
  /** The id of the question's text, which names the group of answers. */
  labelledBy?: string;
  /** Choosing an answer submits it: draw buttons, not radio buttons. */
  commit?: boolean;
  /** An answer is on its way to the server: no second press. */
  disabled?: boolean;
}) {
  const permutation = useMemo(
    () => seededPermutation(seed, questionId, options.length),
    [seed, questionId, options.length]
  );

  const selectedOriginal = value?.kind === "single" ? value.selectedIndex : undefined;

  function stateOf(originalIndex: number): AnswerState {
    const isSelected = selectedOriginal === originalIndex;
    if (!revealed) return isSelected ? "chosen" : "idle";
    if (originalIndex === correctIndex) return "correct";
    if (isSelected) return "incorrect";
    return "dimmed";
  }

  /** The mark in words, for a screen reader. */
  function srPrefixOf(originalIndex: number): string | undefined {
    if (!revealed) return undefined;
    const isSelected = selectedOriginal === originalIndex;
    if (originalIndex === correctIndex) return isSelected ? "Your answer, which is correct: " : "Correct answer: ";
    if (isSelected) return "Your answer, which is incorrect: ";
    return undefined;
  }

  const name = labelledBy ? { "aria-labelledby": labelledBy } : { "aria-label": "Answers" };
  const markerAt = (displayPos: number) => OPTION_LETTERS[displayPos] ?? String(displayPos + 1);

  if (commit) {
    return (
      <div role="group" {...name} className="grid gap-2.5">
        {permutation.map((originalIndex, displayPos) => (
          <AnswerOption
            key={originalIndex}
            marker={markerAt(displayPos)}
            state={stateOf(originalIndex)}
            srPrefix={srPrefixOf(originalIndex)}
            dense
            disabled={revealed || disabled}
            onClick={() => onChange({ kind: "single", selectedIndex: originalIndex })}
          >
            {options[originalIndex]}
          </AnswerOption>
        ))}
      </div>
    );
  }

  return (
    <RadioGroup.Root
      {...name}
      // An empty value is "nothing chosen yet"; it keeps the group controlled.
      value={selectedOriginal === undefined ? "" : String(selectedOriginal)}
      onValueChange={(next) => onChange({ kind: "single", selectedIndex: Number(next) })}
      disabled={revealed || disabled}
      className="grid gap-2.5"
    >
      {permutation.map((originalIndex, displayPos) => (
        <RadioGroup.Item key={originalIndex} value={String(originalIndex)} asChild>
          <AnswerOption
            marker={markerAt(displayPos)}
            state={stateOf(originalIndex)}
            srPrefix={srPrefixOf(originalIndex)}
            dense
          >
            {options[originalIndex]}
          </AnswerOption>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
