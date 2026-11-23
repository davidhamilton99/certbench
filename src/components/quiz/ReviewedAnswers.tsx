import { OPTION_LETTERS } from "@/components/quiz/AnswerOption";
import { cn } from "@/lib/utils";

/**
 * The answers of a question under review: a lettered list with the correct
 * answer marked in words and, where the question was answered incorrectly, the
 * answer that was given.
 *
 * The letters are text, so a screen reader reads them, and they are the letters
 * the question is shown under while it is answered. An explanation that says
 * "option C" therefore names the answer lettered C here. `order` is the order
 * the answers were shown in (see answerOrder); left out, it is the stored
 * order, which is also the order of every question whose explanation names a
 * letter.
 *
 * It holds no state, so a server page can print it as it stands.
 */
export function ReviewedAnswers({
  options,
  correctIndex,
  selectedIndex,
  order,
}: {
  /** The answers' words, in their stored order. */
  options: readonly string[];
  /** The stored index of the correct answer. */
  correctIndex: number;
  /** The stored index of the answer that was given, where one was. */
  selectedIndex?: number;
  /** `order[place]` is the stored index of the answer shown at that place. */
  order?: readonly number[];
}) {
  const shown = order ?? options.map((_, i) => i);
  return (
    <>
      {shown.map((stored, place) => {
        const correct = stored === correctIndex;
        const wrongPick = stored === selectedIndex && !correct;
        return (
          <p
            key={stored}
            className={cn(
              "flex items-baseline gap-2 rounded-xs px-2 py-1",
              correct && "bg-success/10",
              wrongPick && "bg-destructive/10"
            )}
          >
            <span className="w-5 shrink-0 text-note text-muted-foreground">
              {OPTION_LETTERS[place] ?? place + 1}.{" "}
            </span>
            <span className="min-w-0 [overflow-wrap:anywhere]">
              {correct && <span className="font-semibold text-success">Correct answer: </span>}
              {wrongPick && <span className="font-semibold text-destructive">Your answer: </span>}
              {options[stored]}
            </span>
          </p>
        );
      })}
    </>
  );
}
