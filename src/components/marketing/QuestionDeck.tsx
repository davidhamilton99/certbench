"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { splitExplanation } from "@/core/path/text";
import type { ChoiceRep } from "@/core/path/types";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { QuestionList, type DeckQuestion } from "@/components/marketing/QuestionList";
import { useKeyboardTurn } from "@/components/path/keyboard-turn";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";

// The question types live with the list, which is not a client module; they
// are exported from here as before for the pages and data files that use them.
export type { DeckQuestion, SampleQuestionData } from "@/components/marketing/QuestionList";

/** What the score offers next. */
export interface DeckNext {
  title: string;
  body: string;
  href: string;
  label: string;
}

/** Room for the public pages' sticky header when the score scrolls into view. */
const HEADER_CLEARANCE = 72;

/** The exam whose study path an address opens ("/path/network-plus-n10-009"), or null for the list of exams. */
function examOf(path: string): string | null {
  const match = /^\/path\/([a-z0-9-]+)/.exec(path);
  return match ? match[1] : null;
}

/**
 * What the score says the study path does. Where the deck leads to one exam's
 * study path, it covers every objective if that exam's steps follow CompTIA's
 * objectives, and every topic if the exam is set out by CertBench's own topics
 * (Network+). Where the deck leads to the list of exams, the sentence is the
 * one that is true of every exam.
 */
function pathCovers(path: string): string {
  const cert = examOf(path);
  return cert
    ? `covers every ${usesOfficialObjectiveNumbers(cert) ? "objective" : "topic"}`
    : "works through your exam topic by topic,";
}

/** The questions as the study path's own: lettered like the exam, the explanation's first line as the takeaway. */
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
 * A page's sample questions, played one at a time on the study path's own
 * card: the same answers, keys and verdict people meet on their study path,
 * then a score that leads to it. Every question, its answer and its
 * explanation are also in the page from the start, in a list folded away
 * below, so anyone who came to read and every search engine have them without
 * playing.
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
  /** The line over the deck, e.g. "Security+ sample questions". */
  label: string;
  /** Analytics surface, e.g. "practice_test_page". */
  surface: string;
  /** Where the score sends them: the exam's study path, or /start to choose one. */
  path: string;
  /** For "Security+ study path". */
  examName: string;
  /** The folded list's summary line. */
  listTitle?: string;
  /** Where the score leads instead of the study path, when that is not the next step. */
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
    title: `${examName} study path`,
    body: `The study path ${pathCovers(path)} in short steps like these, up to a readiness checkpoint that shows where you stand.`,
    href: path,
    label: signedIn ? "Continue the study path" : "Start the study path",
  };

  return (
    <div ref={root} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
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
        <div className="glass min-w-0 rounded-lg p-5 sm:p-8">
          <div className="mb-6 grid gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="cb-label min-w-0 text-muted-foreground">{label}</p>
              <span className="shrink-0 text-note tabular-nums text-muted-foreground">
                Question {i + 1} of {reps.length}
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
            // The first card is there as the page loads and leaves the focus
            // alone. Every card after it follows a press on this page.
            takeFocus={run > 0 || i > 0}
            // What the question belongs to (its objective, or its exam on a page with two).
            preface={questions[i]?.tag}
            nextLabel={i === reps.length - 1 ? "View my score" : undefined}
          />
        </div>
      )}
      <QuestionList questions={questions} title={listTitle} />
    </div>
  );
}

/** The deck's end: the score, and the way onto the study path it was a sample of. */
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
      // Takes the focus so that it is read; it is not a control.
      tabIndex={-1}
      role="group"
      aria-label={`${label}: your score`}
      className="glass path-rise grid min-w-0 scroll-mt-24 gap-5 rounded-lg p-5 sm:p-8"
    >
      <div className="grid min-w-0 gap-1.5">
        <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="cb-label min-w-0 text-muted-foreground">{label}</span>
          <button type="button" onClick={onReplay} className="cb-link cb-tap shrink-0 text-small">
            Answer the questions again
          </button>
        </div>
        <p className="cb-display text-4xl">
          {result.correct} <span className="text-muted-foreground">of {result.total}</span>
        </p>
        <p className="text-body text-muted-foreground">
          {missed === 0
            ? "You answered every question correctly."
            : `${missed} ${missed === 1 ? "question was" : "questions were"} answered incorrectly. Every answer is explained in the full list below.`}
        </p>
      </div>

      <div className="grid gap-4 border-t border-border pt-5 sm:flex sm:items-center sm:justify-between">
        <div className="grid min-w-0 max-w-sm gap-1">
          <p className="cb-statement">{cta.title}</p>
          <p className="text-small text-muted-foreground">{cta.body}</p>
        </div>
        <div className="grid shrink-0 gap-1.5 sm:justify-items-end">
          <Button asChild size="lg" className="h-auto min-h-12 w-full whitespace-normal py-2.5 sm:w-auto">
            <Link href={cta.href} onClick={() => track("upsell_clicked", { context: `${surface}_deck`, href: cta.href })}>
              {cta.label}
              <LinkArrow />
            </Link>
          </Button>
          {!signedIn && (
            <p className="text-note text-muted-foreground">It is free, and you do not need an account to start.</p>
          )}
        </div>
      </div>
    </div>
  );
}
