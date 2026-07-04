import type { ResponseValue } from "@/core/quiz-engine/types";
import type {
  MCTFOption,
  MatchingOption,
  OrderingOption,
} from "@/core/study-materials/types";

export interface StudyGradable {
  question_type:
    | "multiple_choice"
    | "true_false"
    | "multiple_select"
    | "ordering"
    | "matching";
  options: unknown[];
}

/**
 * Client-side grading for user study questions (immediate-feedback mode).
 * All-or-nothing per question, matching the previous player's behaviour.
 */
export function gradeStudyAnswer(
  question: StudyGradable,
  value: ResponseValue
): boolean {
  switch (question.question_type) {
    case "multiple_choice":
    case "true_false": {
      if (value.kind !== "single") return false;
      const options = question.options as MCTFOption[];
      return options[value.selectedIndex]?.is_correct === true;
    }
    case "multiple_select": {
      if (value.kind !== "multi") return false;
      const options = question.options as MCTFOption[];
      const correct = new Set(
        options.flatMap((o, i) => (o.is_correct ? [i] : []))
      );
      const picked = new Set(value.selectedIndexes);
      return (
        correct.size === picked.size &&
        [...picked].every((i) => correct.has(i))
      );
    }
    case "ordering": {
      if (value.kind !== "ordering") return false;
      const options = question.options as OrderingOption[];
      // value.order[displayPos] = original option index placed at that position
      return value.order.every(
        (originalIndex, position) =>
          options[originalIndex]?.correct_position === position
      );
    }
    case "matching": {
      if (value.kind !== "matching") return false;
      const options = question.options as MatchingOption[];
      // pairs: leftIndex (string) -> rightIndex (string); correct when each
      // left is paired with the right at the SAME original index.
      return options.every(
        (_, i) => value.pairs[String(i)] === String(i)
      );
    }
  }
}
