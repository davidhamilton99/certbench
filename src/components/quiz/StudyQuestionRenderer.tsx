"use client";

import type { StudyQuestion } from "@/contracts/study-sets";
import type { ResponseValue } from "@/core/quiz-engine/types";
import type {
  MCTFOption,
  MatchingOption,
  OrderingOption,
} from "@/core/study-materials/types";
import { MultipleChoice } from "./renderers/MultipleChoice";
import { MultipleSelect } from "./renderers/MultipleSelect";
import { Ordering } from "./renderers/Ordering";
import { Matching } from "./renderers/Matching";

/** Dispatches a study question to the renderer for its type. */
export function StudyQuestionRenderer({
  question,
  seed,
  value,
  onChange,
  revealed,
}: {
  question: StudyQuestion;
  seed: string;
  value: ResponseValue | undefined;
  onChange: (value: ResponseValue) => void;
  revealed: boolean;
}) {
  switch (question.question_type) {
    case "multiple_choice":
    case "true_false": {
      const options = question.options as MCTFOption[];
      return (
        <MultipleChoice
          questionId={question.id}
          options={options.map((o) => o.text)}
          seed={seed}
          value={value}
          onChange={onChange}
          revealed={revealed}
          correctIndex={options.findIndex((o) => o.is_correct)}
        />
      );
    }
    case "multiple_select": {
      const options = question.options as MCTFOption[];
      return (
        <MultipleSelect
          questionId={question.id}
          options={options.map((o) => o.text)}
          correctIndexes={options.flatMap((o, i) => (o.is_correct ? [i] : []))}
          seed={seed}
          value={value}
          onChange={onChange}
          revealed={revealed}
        />
      );
    }
    case "ordering": {
      const options = question.options as OrderingOption[];
      return (
        <Ordering
          questionId={question.id}
          items={options.map((o) => o.text)}
          correctPositions={options.map((o) => o.correct_position)}
          seed={seed}
          value={value}
          onChange={onChange}
          revealed={revealed}
        />
      );
    }
    case "matching": {
      const options = question.options as MatchingOption[];
      return (
        <Matching
          questionId={question.id}
          pairs={options}
          seed={seed}
          value={value}
          onChange={onChange}
          revealed={revealed}
        />
      );
    }
  }
}
