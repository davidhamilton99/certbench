import type { StudyQuestion, MCTFOption, OrderingOption } from "./types";

// Fisher-Yates shuffle — returns a new shuffled array of indices
export function shuffleIndices(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
}

export function checkAnswer(
  question: StudyQuestion,
  state: {
    selectedOption: number | null;
    shuffledCorrectIndex: number;
    msSelected: Set<number>;
    orderingSequence: number[];
    matchingPairs: Map<number, number>;
  }
): boolean {
  const type = question.question_type || "multiple_choice";

  switch (type) {
    case "multiple_choice": {
      if (state.selectedOption === null) return false;
      return state.selectedOption === state.shuffledCorrectIndex;
    }
    case "true_false": {
      if (state.selectedOption === null) return false;
      return state.selectedOption === question.correct_index;
    }
    case "multiple_select": {
      if (state.msSelected.size === 0) return false;
      const opts = question.options as MCTFOption[];
      const correctSet = new Set(
        opts.map((o, i) => (o.is_correct ? i : -1)).filter((i) => i >= 0)
      );
      return (
        state.msSelected.size === correctSet.size &&
        [...state.msSelected].every((i) => correctSet.has(i))
      );
    }
    case "ordering": {
      const opts = question.options as OrderingOption[];
      if (state.orderingSequence.length !== opts.length) return false;
      return state.orderingSequence.every(
        (optIdx, pos) => opts[optIdx].correct_position === pos
      );
    }
    case "matching": {
      if (state.matchingPairs.size !== question.options.length) return false;
      return [...state.matchingPairs.entries()].every(
        ([leftIdx, rightIdx]) => rightIdx === leftIdx
      );
    }
    default:
      return false;
  }
}

export function isAnswerComplete(
  question: StudyQuestion,
  state: {
    selectedOption: number | null;
    msSelected: Set<number>;
    orderingSequence: number[];
    matchingPairs: Map<number, number>;
  }
): boolean {
  const type = question.question_type || "multiple_choice";

  switch (type) {
    case "multiple_choice":
    case "true_false":
      return state.selectedOption !== null;
    case "multiple_select":
      return state.msSelected.size > 0;
    case "ordering":
      return state.orderingSequence.length === question.options.length;
    case "matching":
      return state.matchingPairs.size === question.options.length;
    default:
      return false;
  }
}
