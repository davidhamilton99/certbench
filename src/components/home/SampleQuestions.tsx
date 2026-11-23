"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PathStructure, Rep } from "@/core/path/types";
import { hasStarted, recordRep } from "@/core/path/progress";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { readVisitorPath, updateLocalPath } from "@/components/path/local-path";
import { markBegunOnPublicPage, oweStartEvent } from "@/components/path/path-start";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import { useWhenKnown } from "@/components/path/useWhenKnown";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const SURFACE = "home_demo";

/** A question answered incorrectly is asked once more before the result; at most this many are. */
const MAX_REPEATS = 2;

/**
 * The homepage's sample questions, set as one sheet of an examination paper.
 *
 * The sheet is the product itself: a few real questions from the study path on
 * the path's own question card. It keeps one size from the first question to
 * the result, each answer is marked in ink where it was given, a question that
 * was answered incorrectly is asked once more (which is what the study path
 * does), and it ends as the visitor's own marked paper: every question with
 * its objective, the correct answer and the result.
 *
 * The answers are kept on the device as the first answers of the study path
 * they come from, so a visitor who goes on to that path is not asked the same
 * questions again.
 */
export function SampleQuestions({
  reps,
  structure,
  steps,
}: {
  reps: Rep[];
  structure: PathStructure;
  /** How many steps the full path has, for the closing sentence. */
  steps: number;
}) {
  const [round, setRound] = useState(0);
  // The order of play: every question once, then the ones to repeat.
  const [queue, setQueue] = useState<number[]>(() => reps.map((_, k) => k));
  const [pos, setPos] = useState(0);
  const [first, setFirst] = useState<(RepAnswer | null)[]>(() => reps.map(() => null));
  const [second, setSecond] = useState<(boolean | null)[]>(() => reps.map(() => null));
  const resultRef = useRef<HTMLParagraphElement>(null);
  // Who is signed in, if anyone. Unknown for a moment on a signed-in visit: an
  // answer given in that moment is kept once it is known whose it is.
  const whenKnown = useWhenKnown(useSessionUserId());

  const done = pos >= queue.length;
  const index = queue[pos];
  const rep = done ? undefined : reps[index];
  const repeating = !done && pos >= reps.length;
  const correct = first.filter((a) => a?.correct).length;
  const missed = first.some((a) => a && !a.correct);
  const objectives = structure.domains.reduce((n, d) => n + d.objectives.length, 0);
  const exam = `${structure.examName} ${structure.examCode}`;

  const objectiveTitle = useMemo(() => {
    const all = new Map(structure.domains.flatMap((d) => d.objectives.map((o) => [o.code, o.title] as const)));
    return (code: string) => all.get(code);
  }, [structure.domains]);

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const current = reps[index];
      if (!current) return;
      if (repeating) {
        setSecond((prev) => prev.map((r, k) => (k === index ? answer.correct : r)));
      } else {
        setFirst((prev) => prev.map((r, k) => (k === index ? answer : r)));
        if (!answer.correct) {
          setQueue((q) => (q.length - reps.length < MAX_REPEATS ? [...q, index] : q));
        }
      }
      // These are the study path's own first questions: the answer counts there.
      // It is kept as the work of whoever is signed in (nobody, for most
      // visitors), so that on a shared computer it never joins another
      // account's study path.
      const cert = structure.certSlug;
      const at = Date.now();
      whenKnown((who) => {
        const before = readVisitorPath(cert, who);
        // An answer that begins the device's copy: the path page still owes its
        // `path_started` for this visitor, and a signed-out visitor's work is
        // marked as begun here, not by the study path's save request (see
        // path-start.ts).
        if (!before || !hasStarted(before)) {
          oweStartEvent(cert);
          if (who === null) markBegunOnPublicPage(cert);
        }
        updateLocalPath(cert, (p) => recordRep(p, current.id, answer.correct, at), who);
      });
      // Once for each question, as the event has always been sent: a question
      // asked a second time after a miss is not counted again.
      if (!repeating) track("sample_question_answered", { correct: answer.correct, surface: SURFACE });
    },
    [index, repeating, reps, structure.certSlug, whenKnown]
  );

  const onNext = useCallback(() => {
    const n = pos + 1;
    setPos(n);
    if (n >= queue.length) {
      track("question_deck_completed", { surface: SURFACE, correct, total: reps.length });
    }
  }, [pos, queue.length, correct, reps.length]);

  // The result takes the focus as it arrives, so that it is read.
  useEffect(() => {
    if (done) resultRef.current?.focus({ preventScroll: true });
  }, [done]);

  function again() {
    setRound((r) => r + 1);
    setQueue(reps.map((_, k) => k));
    setPos(0);
    setFirst(reps.map(() => null));
    setSecond(reps.map(() => null));
  }

  return (
    <section
      aria-labelledby="sample-questions"
      className="glass cb-exam-sheet flex h-full flex-col overflow-hidden rounded-lg"
    >
      <header className="grid gap-3 border-b border-border px-5 pb-4 pt-4 sm:px-6">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="sample-questions" className="text-base font-semibold">
            Sample questions
          </h2>
          {!done && (
            <p className="shrink-0 text-small text-muted-foreground">
              {repeating ? "A question repeated" : `Question ${pos + 1} of ${reps.length}`}
            </p>
          )}
        </div>
        <StopProgress results={first.map((a) => (a ? a.correct : null))} current={done || repeating ? -1 : pos} />
      </header>

      <div className="flex min-h-[27rem] flex-1 flex-col gap-5 p-5 sm:p-6">
        {rep ? (
          <>
            {objectiveTitle(rep.objective) && (
              <p className="text-small text-muted-foreground">
                {structure.examName} objective {rep.objective}: {objectiveTitle(rep.objective)}.
              </p>
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              <RepCard
                key={`${round}-${pos}-${rep.id}`}
                rep={rep}
                onAnswer={onAnswer}
                onNext={onNext}
                promptAs="p"
                layout="sheet"
                takeFocus={pos > 0 || round > 0}
                restNote="Choose an answer. It is marked at once, with the reason."
                preface={
                  repeating
                    ? "You answered this question incorrectly. The study path repeats a question until you answer it correctly."
                    : undefined
                }
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <p ref={resultRef} tabIndex={-1} className="cb-statement">
              You answered {correct} of {reps.length} questions correctly.
            </p>

            <ol className="grid border-t border-border" aria-label="Your answers">
              {reps.map((r, k) => {
                const a = first[k];
                const ok = !!a?.correct;
                const again = second[k];
                const answer = r.type === "choice" ? r.options[r.answer] : r.answerText;
                return (
                  <li
                    key={r.id}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border py-2.5"
                  >
                    <span className="font-mono text-note text-muted-foreground">
                      <span className="sr-only">Objective </span>
                      {r.objective}
                    </span>
                    <span className="grid gap-0.5">
                      <span className="text-small leading-snug">{r.prompt}</span>
                      <span className="text-note text-muted-foreground">
                        Correct answer: <span className={cn(r.type === "choice" && r.mono && "font-mono")}>{answer}</span>.
                      </span>
                    </span>
                    <span
                      className={cn(
                        "max-w-28 text-right text-small font-semibold leading-snug",
                        ok ? "text-success" : again === true ? "text-warning-ink" : "text-destructive"
                      )}
                    >
                      {ok ? "Correct" : again === true ? "Incorrect, then correct" : again === false ? "Incorrect twice" : "Incorrect"}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="text-small leading-relaxed text-muted-foreground">
              {missed
                ? `The ${exam} study path asks questions like these on all ${objectives} exam objectives, and repeats each question that you answer incorrectly until you answer it correctly.`
                : `The ${exam} study path asks questions like these on all ${objectives} exam objectives, in ${steps} short steps.`}
            </p>

            <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-4">
              <Button asChild size="lg">
                <Link href="/start" onClick={() => track("upsell_clicked", { context: SURFACE, href: "/start" })}>
                  Start the study path
                  <LinkArrow />
                </Link>
              </Button>
              <button type="button" onClick={again} className="cb-link cb-tap text-small font-medium">
                Answer the questions again
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
