"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeAnswer } from "@/lib/recall/normalize";
import { grade as gradeSubnet, type DrillQuestion } from "@/lib/tools/subnetting";
import type { Rep } from "@/core/path/types";
import { cn } from "@/lib/utils";

/** How long a right answer stays on screen before moving on by itself. */
const AUTO_ADVANCE_MS = 1400;

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export interface RepAnswer {
  correct: boolean;
  /** Option index chosen (choice reps), or -1 for typed reps. */
  picked: number;
}

/**
 * One rep: the prompt, the options (or a box to type in), and — once answered —
 * the verdict and a one-line takeaway. Right answers on quick reps move on by
 * themselves; misses and exam-style questions wait for "Next", so there's time
 * to read why. Keyboard: 1–4 (or A–D) to answer, Enter to continue.
 *
 * Mount one per rep (key it by id): its state is the rep's state.
 */
export function RepCard({
  rep,
  onAnswer,
  onNext,
}: {
  rep: Rep;
  onAnswer: (answer: RepAnswer) => void;
  onNext: () => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [whyOpen, setWhyOpen] = useState(false);
  const advanced = useRef(false);
  const nextRef = useRef<HTMLButtonElement>(null);

  const answered = correct !== null;
  const autoAdvance = answered && correct && rep.tier !== "exam" && !whyOpen;

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
      ? gradeSubnet({ answerKind: rep.answerKind, answer: rep.accept[0] } as DrillQuestion, typed)
      : rep.accept.includes(normalizeAnswer(typed));
    setCorrect(ok);
    onAnswer({ correct: ok, picked: -1 });
  }

  // Right answers on quick reps move on by themselves.
  useEffect(() => {
    if (!autoAdvance) return;
    const t = window.setTimeout(next, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [autoAdvance, next]);

  // Once answered, Enter continues; keep focus on the button for keyboard users.
  useEffect(() => {
    if (answered) nextRef.current?.focus({ preventScroll: true });
  }, [answered]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (!answered && rep.type === "choice") {
        const digit = Number(e.key);
        if (Number.isInteger(digit) && digit >= 1 && digit <= rep.options.length) {
          e.preventDefault();
          choose(digit - 1);
          return;
        }
        const letter = LETTERS.indexOf(e.key.toUpperCase());
        if (rep.lettered && letter >= 0 && letter < rep.options.length) {
          e.preventDefault();
          choose(letter);
        }
        return;
      }
      if (answered && e.key === "Enter" && target?.tagName !== "BUTTON") {
        e.preventDefault();
        next();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [answered, rep, choose, next]);

  const isExam = rep.tier === "exam";
  const compact =
    rep.type === "choice" && !isExam && rep.options.every((o) => o.length <= 16);
  const rightAnswer = rep.type === "choice" ? rep.options[rep.answer] : rep.answerText;

  return (
    <div className="path-rise grid gap-5">
      <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-primary">
        {rep.label}
      </span>

      <div className="grid gap-2">
        <h2
          className={cn(
            "text-balance",
            isExam
              ? "text-[17px] font-medium leading-relaxed sm:text-lg"
              : "font-display text-2xl font-semibold leading-snug tracking-tight sm:text-[1.75rem]"
          )}
        >
          {rep.prompt}
        </h2>
        {rep.cue && rep.type === "choice" && (
          <p className="font-mono text-sm text-muted-foreground">{rep.cue}</p>
        )}
      </div>

      {rep.type === "choice" ? (
        <div
          role="radiogroup"
          aria-label="Answers"
          className={cn("grid gap-2.5", compact && "grid-cols-2")}
        >
          {rep.options.map((option, i) => {
            const isAnswer = i === rep.answer;
            const isPicked = i === picked;
            return (
              <button
                key={`${i}-${option}`}
                type="button"
                role="radio"
                aria-checked={isPicked}
                disabled={answered}
                onClick={() => choose(i)}
                className={cn(
                  "group flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-[border-color,background-color,opacity,transform] duration-150",
                  !answered && "hover:border-primary/60 hover:bg-primary/[0.03] active:scale-[0.99]",
                  answered && isAnswer && "border-success bg-success/10",
                  answered && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                  answered && !isAnswer && !isPicked && "opacity-45"
                )}
              >
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] text-muted-foreground transition-colors",
                    answered && isAnswer && "border-success bg-success text-success-foreground",
                    answered && isPicked && !isAnswer && "border-destructive bg-destructive text-white"
                  )}
                  aria-hidden
                >
                  {answered && isAnswer ? (
                    <Check className="size-3.5" strokeWidth={3} />
                  ) : answered && isPicked ? (
                    <X className="size-3.5" strokeWidth={3} />
                  ) : rep.lettered ? (
                    LETTERS[i]
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={cn(
                    "min-w-0 [overflow-wrap:anywhere]",
                    rep.mono ? "font-mono text-lg font-medium" : isExam ? "text-[15px] leading-snug" : "text-base"
                  )}
                >
                  {option}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <form onSubmit={submitTyped} className="grid gap-2">
          <label htmlFor={`typed-${rep.id}`} className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {rep.cue ?? "Type your answer"}
          </label>
          <div className="flex gap-2.5">
            <Input
              id={`typed-${rep.id}`}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode={rep.answerKind === "dotted" ? "decimal" : rep.numeric ? "numeric" : "text"}
              placeholder={rep.placeholder}
              value={typed}
              disabled={answered}
              onChange={(e) => setTyped(e.target.value)}
              className={cn(
                "h-12 font-mono text-lg",
                rep.answerKind === "dotted" ? "max-w-64" : "max-w-48",
                answered && correct && "border-success bg-success/10",
                answered && !correct && "border-destructive bg-destructive/10"
              )}
            />
            {!answered && (
              <Button type="submit" size="lg" className="h-12" disabled={!typed.trim()}>
                Check
              </Button>
            )}
          </div>
        </form>
      )}

      {answered && (
        <div
          className={cn(
            "path-rise grid gap-3 rounded-xl px-4 py-3.5",
            correct ? "bg-success/10" : "bg-destructive/[0.07]"
          )}
          role="status"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
            <p className="min-w-0 flex-1 basis-60 text-[15px] leading-relaxed">
              <span className={cn("font-semibold", correct ? "text-success" : "text-destructive")}>
                {correct ? "Right." : `It's ${rightAnswer}.`}
              </span>{" "}
              {rep.takeaway}
            </p>
            <Button
              ref={nextRef}
              size="sm"
              variant={correct ? "outline" : "default"}
              onClick={next}
              className="shrink-0"
            >
              {correct ? "Next" : "Got it"}
              <ArrowRight />
            </Button>
          </div>
          {autoAdvance && (
            <span
              aria-hidden
              className="path-drain block h-0.5 rounded-full bg-success/60"
              style={{ "--dur": `${AUTO_ADVANCE_MS}ms` } as CSSProperties}
            />
          )}
          {rep.explanation && (
            <details
              className="group text-sm text-muted-foreground"
              onToggle={(e) => setWhyOpen((e.target as HTMLDetailsElement).open)}
            >
              <summary className="cursor-pointer select-none font-medium text-foreground marker:text-muted-foreground">
                Why, in full
              </summary>
              <p className="mt-2 leading-relaxed">{rep.explanation}</p>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

/** One segment per rep: done ones coloured by result, the current one lit. */
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
          className={cn(
            "h-1.5 flex-1 rounded-full transition-colors duration-300",
            r === true && "bg-success",
            r === false && "bg-warning",
            r === null && i === current && "bg-primary",
            r === null && i !== current && "bg-muted"
          )}
        />
      ))}
    </div>
  );
}
