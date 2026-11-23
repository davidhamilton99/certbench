import type { ComponentProps, ReactNode } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** The letters printed in an option's key box where a question letters its answers. */
export const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/**
 * Where an answer stands:
 *   idle       not yet chosen
 *   chosen     selected and still changeable (a timed exam, a plan)
 *   correct    marked: this is the correct answer
 *   incorrect  marked: this was chosen and is wrong
 *   dimmed     marked: neither chosen nor correct
 */
export type AnswerState = "idle" | "chosen" | "correct" | "incorrect" | "dimmed";

const FRAME: Record<AnswerState, string> = {
  idle: "border-input hover:border-primary hover:bg-tint-hover active:bg-tint-press",
  chosen: "border-primary bg-tint-selected",
  correct: "border-success bg-success/10",
  incorrect: "border-destructive bg-destructive/10",
  // Quiet the frame and not the words: the options that were not chosen are
  // still read, to see what they were.
  dimmed: "border-border text-muted-foreground",
};

const KEY: Record<AnswerState, string> = {
  idle: "border-input text-muted-foreground group-hover/option:border-primary group-hover/option:text-primary",
  chosen: "border-primary bg-primary text-primary-foreground",
  correct: "border-success bg-success text-success-foreground",
  incorrect: "border-destructive bg-destructive text-destructive-foreground",
  dimmed: "border-border text-muted-foreground",
};

/**
 * One answer to a question: a key box and the answer's words, as a button.
 * Every player draws its answers with this (the study path, the sample
 * questions, the practice exam, the readiness check, the labs), so an answer
 * looks and behaves the same wherever it is met.
 *
 * A mark is carried three ways at once, never by colour alone: the frame and
 * the key box change, the key box shows a check or a cross, and `srPrefix`
 * says it in words to a screen reader ("Correct answer: ").
 *
 * It renders a plain `<button>` and passes every other prop to it, so it can
 * be the child of a radio group item where a choice can be changed.
 */
export function AnswerOption({
  marker,
  state = "idle",
  srPrefix,
  mono = false,
  dense = false,
  className,
  children,
  ...props
}: Omit<ComponentProps<"button">, "children"> & {
  /** What the key box prints: "1", "A". */
  marker: string;
  state?: AnswerState;
  /** Words for a screen reader before the answer once it is marked. */
  srPrefix?: string;
  /** The answer is something typed or coded on the exam: a port, an address, a command. */
  mono?: boolean;
  /** Longer, exam-style answers set a size smaller. */
  dense?: boolean;
  children: ReactNode;
}) {
  const marked = state === "correct" || state === "incorrect" || state === "dimmed";
  return (
    <button
      type="button"
      data-state={state}
      className={cn(
        "group/option flex min-h-12 w-full min-w-0 items-center gap-3 rounded-md border bg-card px-3.5 py-3 text-left",
        // A hover answers at once; a mark is not animated at all.
        marked ? "transition-none" : "transition-[border-color,background-color] duration-100",
        FRAME[state],
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-xs border font-mono text-xs",
          KEY[state]
        )}
      >
        {state === "correct" ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : state === "incorrect" ? (
          <X className="size-3.5" strokeWidth={3} />
        ) : (
          marker
        )}
      </span>
      <span
        className={cn(
          "min-w-0 [overflow-wrap:anywhere]",
          mono ? "font-mono text-lg font-medium" : dense ? "text-small leading-snug" : "text-base"
        )}
      >
        {srPrefix && <span className="sr-only">{srPrefix}</span>}
        {children}
      </span>
    </button>
  );
}
