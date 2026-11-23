"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ArrowRight } from "lucide-react";
import { AnswerOption, OPTION_LETTERS, type AnswerState } from "@/components/quiz/AnswerOption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeAnswer } from "@/lib/recall/normalize";
import { gradeAnswer } from "@/lib/tools/subnet-grade";
import type { Rep } from "@/core/path/types";
import { cn } from "@/lib/utils";

/**
 * The kind of question, printed above it only where it changes what to expect.
 * "Recall" and "Quick scenario" are the bank's own filing and tell a learner
 * nothing to act on, so they are not shown. Any other label (a tool's own, a
 * tag) is shown as given.
 */
const KIND: Record<string, string | null> = {
  Recall: null,
  "Quick scenario": null,
  "Exam style": "Exam-style question",
};

/**
 * The words for a question's kind, or null where the kind is not shown. For a
 * page that prints a line of its own above the card (the study path's
 * objective line) and wants the kind on that same line: it prints this there
 * and gives the card `showKind={false}`, so the two never stand as two lines.
 */
export function kindOf(rep: Rep): string | null {
  if (rep.tier === "exam") return "Exam-style question";
  return rep.label in KIND ? KIND[rep.label] : rep.label;
}

export interface RepAnswer {
  correct: boolean;
  /** Option index chosen (choice reps), or -1 for typed reps. */
  picked: number;
}

/**
 * One question: the prompt, its answers (or a field to type in) and, once
 * answered, the verdict in a sentence with the reason. Mount one for each
 * question (key it by id): its state is the question's state.
 *
 * The card answers the person and never the clock. After any answer it waits
 * for "Continue", which takes the focus, so Enter or one tap moves on.
 *
 * Keyboard. The keys 1 to 4 (or A to D where the answers are lettered) answer
 * the question, and they act only while the keyboard's focus is inside the
 * card, never from elsewhere on the page. A card that follows another one on
 * the same page (`takeFocus`) takes the focus as it arrives, so the keys work
 * from one question to the next with no click, and a screen reader reads the
 * new question.
 *
 * Screen readers. The answers are a group named by the question. A marked
 * answer says so in words ("Correct answer: "), and the verdict is read with
 * the Continue button as the focus moves to it.
 */
export function RepCard({
  rep,
  onAnswer,
  onNext,
  promptAs: Prompt = "h2",
  nextLabel,
  keyboard = true,
  explainMisses = false,
  takeFocus = false,
  layout = "flow",
  preface,
  restNote,
  showKind = true,
}: {
  rep: Rep;
  onAnswer: (answer: RepAnswer) => void;
  onNext: () => void;
  /** "p" where the card sits inside a public page, so a prompt is not one of its headings. */
  promptAs?: "h2" | "h3" | "p";
  /** What the button says once answered, where "Continue" would not say what follows. */
  nextLabel?: string;
  /** False where the keys must not answer this card at all. */
  keyboard?: boolean;
  /** Open the full explanation by itself after a wrong answer: the subnetting tool's worked steps. */
  explainMisses?: boolean;
  /**
   * Take the keyboard's focus on arrival. True for a question that follows
   * something the person did on this page (a previous answer, "Start"); false
   * for the first thing on a page as it loads.
   */
  takeFocus?: boolean;
  /**
   * "sheet": the card fills the box it is given and keeps its verdict at the
   * foot, so the box does not change size when an answer is given.
   */
  layout?: "flow" | "sheet";
  /**
   * A line above the question, for example why it is being asked again, or the
   * objective it belongs to. It takes the place of the kind label.
   */
  preface?: ReactNode;
  /** A sentence at the foot of a sheet before the question is answered: what to do. */
  restNote?: ReactNode;
  /**
   * False where every question on the page is of one kind and the page says so
   * itself (a readiness check, a practice-test page), so the label would only
   * repeat it.
   */
  showKind?: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const advanced = useRef(false);
  const promptRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const footRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const promptId = useId();
  const verdictId = useId();
  const hintId = useId();

  const answered = correct !== null;
  const sheet = layout === "sheet";

  const next = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    onNext();
  }, [onNext]);

  const choose = useCallback(
    (i: number) => {
      if (answered || rep.type !== "choice" || i < 0 || i >= rep.options.length) return;
      const ok = i === rep.answer;
      setPicked(i);
      setCorrect(ok);
      onAnswer({ correct: ok, picked: i });
    },
    [answered, rep, onAnswer]
  );

  function submitTyped(e: FormEvent) {
    e.preventDefault();
    if (answered || rep.type !== "typed" || !typed.trim()) return;
    // Subnetting answers go to the subnetting grader: plain text matching
    // drops the dots, so "192.168.10" would pass for "192.168.1.0".
    const ok = rep.answerKind
      ? gradeAnswer(rep.answerKind, rep.accept[0], typed)
      : rep.accept.includes(normalizeAnswer(typed));
    setCorrect(ok);
    onAnswer({ correct: ok, picked: -1 });
  }

  // A question that follows another takes the focus as it arrives: the prompt,
  // so that it is read, or the field where the answer is typed. A touch screen
  // never gets the field (its keyboard would cover the question).
  useEffect(() => {
    if (!takeFocus) return;
    const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
    if (rep.type === "typed" && !coarse) inputRef.current?.focus();
    else promptRef.current?.focus();
  }, [takeFocus, rep.type]);

  // Once answered, Continue takes the focus at once (Enter moves on), and the
  // verdict is brought into view if it is not already there (a small phone, a
  // page at 400%). It is measured on the next frame, when the verdict has been
  // laid out at its real size: measured in the same tick, it can still have
  // the size it had before it was filled.
  useEffect(() => {
    if (!answered) return;
    nextRef.current?.focus({ preventScroll: true });
    if (typeof requestAnimationFrame !== "function") return;
    const frame = requestAnimationFrame(() => {
      const foot = footRef.current;
      if (!foot || typeof foot.scrollIntoView !== "function") return;
      const box = foot.getBoundingClientRect();
      if (box.top >= 0 && box.bottom <= window.innerHeight) return;
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      foot.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    });
    return () => cancelAnimationFrame(frame);
  }, [answered]);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!keyboard || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (!answered && rep.type === "choice") {
      const digit = Number(e.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= rep.options.length) {
        e.preventDefault();
        choose(digit - 1);
        return;
      }
      const letter = (OPTION_LETTERS as readonly string[]).indexOf(e.key.toUpperCase());
      if (rep.lettered && letter >= 0 && letter < rep.options.length) {
        e.preventDefault();
        choose(letter);
      }
      return;
    }
    if (answered && e.key === "Enter" && tag !== "BUTTON" && tag !== "SUMMARY" && tag !== "A") {
      e.preventDefault();
      next();
    }
  }

  const isExam = rep.tier === "exam";
  // A longer quick prompt steps down a size so it does not wrap to four lines.
  const longPrompt = !isExam && rep.prompt.trim().split(/\s+/).length > 14;
  const rightAnswer = rep.type === "choice" ? rep.options[rep.answer] : rep.answerText;
  // One small line above a question at most: where the page gives the card a
  // preface (a tag, a domain, the reason a question is back), that line stands
  // alone and the kind is not printed under it. Nor is it printed where the
  // page asks for none.
  const kind = preface || !showKind ? null : kindOf(rep);

  function stateOf(i: number): AnswerState {
    if (rep.type !== "choice" || !answered) return "idle";
    if (i === rep.answer) return "correct";
    if (i === picked) return "incorrect";
    return "dimmed";
  }

  function srPrefixOf(i: number): string | undefined {
    if (rep.type !== "choice" || !answered) return undefined;
    if (i === rep.answer) return i === picked ? "Your answer, which is correct: " : "Correct answer: ";
    if (i === picked) return "Your answer, which is incorrect: ";
    return undefined;
  }

  const lastKey = rep.type === "choice" ? (rep.lettered ? OPTION_LETTERS[rep.options.length - 1] : rep.options.length) : null;

  return (
    <div
      // Focusable by a press anywhere on the card, so the keys then act on it.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn("group/rep grid gap-5", sheet && "flex h-full min-h-0 flex-col")}
    >
      {(preface || kind) && (
        <div className="grid gap-2">
          {preface && <p className="text-small leading-relaxed text-muted-foreground">{preface}</p>}
          {kind && <span className="cb-label w-fit text-muted-foreground">{kind}</span>}
        </div>
      )}

      <div className={cn("grid gap-2", (preface || kind) && "-mt-2")}>
        <Prompt
          id={promptId}
          // Takes the focus so that it is read; it is not a control.
          ref={promptRef as never}
          tabIndex={-1}
          className={cn(
            "text-pretty",
            isExam
              ? "text-body font-medium sm:text-lg sm:leading-relaxed"
              : longPrompt
                ? "text-xl font-semibold leading-snug tracking-[-0.01em] sm:text-[1.375rem]"
                : "text-2xl font-semibold leading-snug tracking-[-0.015em] sm:text-[1.625rem]"
          )}
        >
          {rep.prompt}
        </Prompt>
        {rep.cue && rep.type === "choice" && <p className="text-small text-muted-foreground">{rep.cue}</p>}
      </div>

      {rep.type === "choice" ? (
        <div role="group" aria-labelledby={promptId} className="grid gap-2.5">
          {rep.options.map((option, i) => (
            <AnswerOption
              key={`${i}-${option}`}
              marker={rep.lettered ? OPTION_LETTERS[i] : String(i + 1)}
              state={stateOf(i)}
              srPrefix={srPrefixOf(i)}
              mono={rep.mono}
              dense={isExam}
              disabled={answered}
              onClick={() => choose(i)}
            >
              {option}
            </AnswerOption>
          ))}
        </div>
      ) : (
        <form onSubmit={submitTyped} className="grid gap-2">
          <label htmlFor={`typed-${rep.id}`} className="cb-label text-muted-foreground">
            {rep.cue ?? "Type your answer"}
          </label>
          {/* The form the answer takes, as a sentence that stays in view while
              typing. Grey text inside the field would vanish at the first key
              and is cut off beside the button on a phone. */}
          {rep.placeholder && (
            <p id={hintId} className="-mt-1 text-note text-muted-foreground">
              For example, <span className="font-mono">{rep.placeholder}</span>.
            </p>
          )}
          <div className="flex gap-2.5">
            <Input
              ref={inputRef}
              id={`typed-${rep.id}`}
              aria-describedby={rep.placeholder ? `${promptId} ${hintId}` : promptId}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode={rep.answerKind === "dotted" ? "decimal" : rep.numeric ? "numeric" : "text"}
              value={typed}
              disabled={answered}
              onChange={(e) => setTyped(e.target.value)}
              className={cn(
                // A step down on phones, so a typed address is not cut off beside the button.
                "h-12 font-mono text-base sm:text-lg md:text-lg pointer-coarse:h-12",
                rep.answerKind === "dotted" ? "max-w-64" : "max-w-48",
                answered && correct && "border-success bg-success/10",
                answered && !correct && "border-destructive bg-destructive/10"
              )}
            />
            {!answered && (
              <Button type="submit" size="lg" className="h-12 px-4 sm:px-6" disabled={!typed.trim()}>
                Check answer
              </Button>
            )}
          </div>
        </form>
      )}

      {/*
        The foot: the verdict once answered. Ink on the paper under a hairline;
        the two marked answers above carry the colour. On a sheet it is always
        there, at the bottom, with room kept for the verdict.
      */}
      <div
        ref={footRef}
        className={cn(
          "grid content-start gap-3",
          // Below lg the sheet is as tall as its contents, so room is kept for
          // the verdict; from lg its height comes from the row it stands in.
          sheet && "mt-auto min-h-[9.25rem] border-t border-border pt-4 sm:min-h-24 lg:min-h-0",
          !sheet && answered && "border-t border-border pt-4"
        )}
      >
        {answered ? (
          <>
            <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 sm:flex-nowrap">
              <p id={verdictId} className="min-w-0 flex-1 basis-60 text-small leading-relaxed">
                <span className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>
                  {correct ? "Correct." : `Incorrect. The correct answer is ${rightAnswer}.`}
                </span>{" "}
                {rep.takeaway}
              </p>
              <Button
                ref={nextRef}
                onClick={next}
                aria-describedby={verdictId}
                className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
              >
                {nextLabel ?? "Continue"}
                <ArrowRight />
              </Button>
            </div>
            {rep.explanation && (
              <details
                className="text-small text-muted-foreground"
                // Opens by itself after a wrong answer where the card asks it to.
                open={explainMisses && !correct ? true : undefined}
              >
                <summary className="cb-tap w-fit cursor-pointer select-none font-medium text-foreground marker:text-muted-foreground">
                  Read the full explanation
                </summary>
                <p className="mt-2 leading-relaxed">{rep.explanation}</p>
              </details>
            )}
          </>
        ) : (
          (restNote || (keyboard && lastKey !== null)) && (
            <p className={cn("text-note text-muted-foreground", !restNote && "hidden group-focus-within/rep:block pointer-coarse:group-focus-within/rep:hidden")}>
              {restNote}
              {keyboard && lastKey !== null && (
                // Said only while the keys would act: the focus is inside the
                // card, on a device that has a keyboard.
                <span className="hidden group-focus-within/rep:inline pointer-coarse:group-focus-within/rep:hidden">
                  {restNote ? " " : ""}You can answer with the keys {rep.type === "choice" && rep.lettered ? "A" : "1"} to{" "}
                  {lastKey}.
                </span>
              )}
            </p>
          )
        )}
      </div>
    </div>
  );
}

/**
 * Progress through a set of questions: one segment a question, filled once it
 * is answered and outlined while it is the one in hand. It shows how far along,
 * not how well: the verdict on each answer is given with the answer.
 */
export function StopProgress({
  results,
  current,
}: {
  results: (boolean | null)[];
  current: number;
}) {
  return (
    <div className="flex gap-1" aria-hidden>
      {results.map((r, i) => (
        <span
          key={i}
          // Drawn in one quiet colour; the state is kept in the markup for tests and tools.
          data-state={r === true ? "right" : r === false ? "wrong" : i === current ? "current" : "ahead"}
          className={cn(
            "h-1.5 flex-1 rounded-xs transition-colors duration-200",
            r !== null && "bg-primary",
            r === null && i === current && "bg-primary/35",
            r === null && i !== current && "bg-foreground/[0.12]"
          )}
        />
      ))}
    </div>
  );
}
