"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, RotateCcw } from "lucide-react";
import { track } from "@/lib/analytics";
import { splitExplanation } from "@/core/path/text";
import type { ChoiceRep } from "@/core/path/types";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { useKeyboardTurn } from "@/components/path/keyboard-turn";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import { Button } from "@/components/ui/button";

/** A bank question as a public page shows it. */
export interface SampleQuestionData {
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface DeckQuestion extends SampleQuestionData {
  /** The question's tag, e.g. "4.1 · Mitigating controls". "Exam style" when absent. */
  tag?: string;
}

/** What the score offers next. */
export interface DeckNext {
  title: string;
  body: string;
  href: string;
  label: string;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Room for the public pages' sticky header when the score scrolls into view. */
const HEADER_CLEARANCE = 72;

/** The questions as the path's reps: lettered like the exam, the explanation's first line as the takeaway. */
function toReps(questions: readonly DeckQuestion[]): ChoiceRep[] {
  return questions.map((q, k) => {
    const { takeaway, rest } = splitExplanation(q.explanation);
    return {
      type: "choice",
      id: `deck-${k}`,
      label: q.tag ?? "Exam style",
      tier: "exam",
      objective: "",
      prompt: q.questionText,
      options: q.options,
      answer: q.correctIndex,
      takeaway,
      ...(rest ? { explanation: rest } : {}),
      lettered: true,
    };
  });
}

/**
 * A page's sample questions, played one at a time on the path's own card:
 * the same tiles, keys and verdict people meet on their path, then a score
 * that leads to it. Every question, its answer and its explanation are also in
 * the page from the start, in a list folded away below, so anyone who came to
 * read and every search engine have them without playing.
 */
export function QuestionDeck({
  questions,
  label,
  surface,
  path,
  examName,
  listTitle,
  next,
}: {
  questions: DeckQuestion[];
  /** Eyebrow over the deck, e.g. "Security+ · exam style". */
  label: string;
  /** Analytics surface, e.g. "practice_test_page". */
  surface: string;
  /** Where the score sends them: the exam's path, or /start to pick one. */
  path: string;
  /** For "Your Security+ path". */
  examName: string;
  /** The folded list's summary line. */
  listTitle?: string;
  /** Where the score leads instead of the path, when the path isn't the next step. */
  next?: DeckNext;
}) {
  const reps = useMemo(() => toReps(questions), [questions]);
  const turnId = useId();
  const root = useRef<HTMLDivElement>(null);
  const keyboard = useKeyboardTurn(turnId, root);
  const userId = useSessionUserId();
  const [run, setRun] = useState(0);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(() => reps.map(() => null));
  const [ended, setEnded] = useState<{ correct: number; total: number } | null>(null);
  // Handlers read these, not render state.
  const current = useRef(0);
  const right = useRef(0);

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const index = current.current;
      if (answer.correct) right.current += 1;
      setResults((prev) => {
        const next = [...prev];
        next[index] = answer.correct;
        return next;
      });
      track("sample_question_answered", { correct: answer.correct, surface });
    },
    [surface]
  );

  const onNext = useCallback(() => {
    if (current.current < reps.length - 1) {
      current.current += 1;
      setI(current.current);
      return;
    }
    track("question_deck_completed", { surface, correct: right.current, total: reps.length });
    setEnded({ correct: right.current, total: reps.length });
  }, [reps.length, surface]);

  function playAgain() {
    current.current = 0;
    right.current = 0;
    setI(0);
    setResults(reps.map(() => null));
    setEnded(null);
    setRun((r) => r + 1);
  }

  if (reps.length === 0) return null;
  const rep = reps[i];
  const signedIn = Boolean(userId);
  const cta: DeckNext = next ?? {
    title: `Your ${examName} path`,
    body: "Every objective in short stops like these, up to a readiness checkpoint that shows where you stand.",
    href: path,
    label: signedIn ? "Continue my path" : "Start my path",
  };

  return (
    <div ref={root} className="grid min-w-0 gap-4">
      {ended ? (
        <DeckScore
          label={label}
          result={ended}
          cta={cta}
          surface={surface}
          signedIn={signedIn}
          onReplay={playAgain}
        />
      ) : (
        <div className="glass min-w-0 rounded-3xl p-5 sm:p-8">
          <div className="mb-6 grid gap-3">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </p>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {i + 1} / {reps.length}
              </span>
            </div>
            <StopProgress results={results} current={i} />
          </div>
          <RepCard
            key={`${run}-${i}`}
            rep={rep}
            onAnswer={onAnswer}
            onNext={onNext}
            promptAs="p"
            keyboard={keyboard}
            nextLabel={i === reps.length - 1 ? "See my score" : undefined}
          />
        </div>
      )}
      <QuestionList questions={questions} title={listTitle} />
    </div>
  );
}

/** The deck's end: the score, and the way into the path it was a taste of. */
function DeckScore({
  label,
  result,
  cta,
  surface,
  signedIn,
  onReplay,
}: {
  label: string;
  result: { correct: number; total: number };
  cta: DeckNext;
  surface: string;
  signedIn: boolean;
  onReplay: () => void;
}) {
  const missed = result.total - result.correct;

  // The score replaces a question that was a different height, and may have
  // been scrolled past: bring its top back under the header, and focus with it.
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = top.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const y = el.getBoundingClientRect().top;
    if (y >= HEADER_CLEARANCE && y <= window.innerHeight / 2) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
  }, []);

  return (
    <div
      ref={top}
      tabIndex={-1}
      role="group"
      aria-label={`${label}: your score`}
      className="glass path-rise grid min-w-0 scroll-mt-24 gap-5 rounded-3xl p-6 outline-none sm:p-8"
    >
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Play again
          </button>
        </div>
        <p className="font-display text-4xl font-semibold tracking-tight">
          {result.correct} <span className="text-muted-foreground">of {result.total}</span>
        </p>
        <p className="text-muted-foreground">
          {missed === 0
            ? "Every one right."
            : `${missed} to look at again. Every answer is explained in the full list below.`}
        </p>
      </div>

      <div className="grid gap-4 border-t border-border/70 pt-5 sm:flex sm:items-center sm:justify-between">
        <div className="grid min-w-0 max-w-sm gap-1">
          <p className="font-display text-xl font-semibold tracking-tight">{cta.title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{cta.body}</p>
        </div>
        <div className="grid shrink-0 gap-1.5 sm:justify-items-end">
          <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
            <Link href={cta.href} onClick={() => track("upsell_clicked", { context: `${surface}_deck`, href: cta.href })}>
              {cta.label}
              <ArrowRight />
            </Link>
          </Button>
          {!signedIn && <p className="text-center text-xs text-muted-foreground">Free, no account needed to start.</p>}
        </div>
      </div>
    </div>
  );
}

/** Every question with its answer and explanation, folded away until someone opens it. */
/** Every question with its answer, folded: in the page for readers and search, out of the way of play. */
export function QuestionList({ questions, title }: { questions: DeckQuestion[]; title?: string }) {
  return (
    <details className="group rounded-2xl border border-border/70 bg-card/40 px-5 py-4">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <span>{title ?? `All ${questions.length} questions, with answers`}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <ol className="mt-4 grid gap-5">
        {questions.map((q, k) => (
          <li key={k} className="grid gap-2 border-t border-border/60 pt-5 first:border-t-0 first:pt-1">
            {q.tag && (
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{q.tag}</p>
            )}
            <p className="leading-relaxed">
              <span className="mr-2 font-mono text-sm text-muted-foreground">{k + 1}.</span>
              {q.questionText}
            </p>
            <ul className="grid gap-1 text-sm text-muted-foreground">
              {q.options.map((option, j) => (
                <li key={j} className="flex gap-2">
                  <span className="font-mono">{LETTERS[j]}.</span>
                  <span>{option}</span>
                </li>
              ))}
            </ul>
            <p className="text-sm leading-relaxed">
              <span className="font-medium text-success">
                Answer: {LETTERS[q.correctIndex]}. {q.options[q.correctIndex].replace(/\.$/, "")}.
              </span>{" "}
              <span className="text-muted-foreground">{q.explanation}</span>
            </p>
          </li>
        ))}
      </ol>
    </details>
  );
}
