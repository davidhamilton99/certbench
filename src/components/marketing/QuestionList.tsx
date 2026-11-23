import { ChevronDown } from "lucide-react";
import { OPTION_LETTERS } from "@/components/quiz/AnswerOption";

/** A bank question as a public page shows it. */
export interface SampleQuestionData {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DeckQuestion extends SampleQuestionData {
  /** A line above the question: its objective, or its exam. None when absent. */
  tag?: string;
}

/**
 * Every question with its answer and its explanation, folded away until
 * someone opens it: in the page for a reader and for search, out of the way
 * of play.
 *
 * It has no state and no handlers, and this file is not a client module. A
 * server component that renders it sends its markup and nothing more; a client
 * component that renders it (the question deck, the practice exam) builds it
 * from the questions that component already holds. Either way the questions
 * are sent to the browser once and not a second time as this list's own data.
 */
export function QuestionList({ questions, title }: { questions: readonly DeckQuestion[]; title?: string }) {
  return (
    <details className="group rounded-lg border border-border bg-card">
      {/* The whole row opens the list, so it is an easy target on a phone. */}
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 rounded-lg px-5 py-4 text-small font-medium [&::-webkit-details-marker]:hidden">
        <span>{title ?? `All ${questions.length} questions, with answers`}</span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
        />
      </summary>
      {/* One column that can shrink: a long command or address in a question wraps
          inside the list and never pushes it wider than the page. */}
      <ol className="grid grid-cols-[minmax(0,1fr)] gap-5 px-5 pb-5">
        {questions.map((q, k) => (
          <li key={k} className="grid grid-cols-[minmax(0,1fr)] gap-2 border-t border-border pt-5 [overflow-wrap:anywhere]">
            {q.tag && <p className="text-note text-muted-foreground">{q.tag}</p>}
            <p className="text-body">
              <span className="mr-2 tabular-nums text-muted-foreground">{k + 1}.</span>
              {q.questionText}
            </p>
            <ul className="grid gap-1 text-small text-muted-foreground">
              {q.options.map((option, j) => (
                <li key={j} className="flex gap-2">
                  <span>{OPTION_LETTERS[j]}.</span>
                  <span className="min-w-0">{option}</span>
                </li>
              ))}
            </ul>
            <p className="text-small">
              <span className="font-medium text-success">
                Answer: {OPTION_LETTERS[q.correctIndex]}. {q.options[q.correctIndex].replace(/\.$/, "")}.
              </span>{" "}
              <span className="text-muted-foreground">{q.explanation}</span>
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
}
