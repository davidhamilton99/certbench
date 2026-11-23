"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { estimateReadiness, type CheckAnswer, type CheckQuestion } from "@/lib/tools/readiness-estimate";
import { bandFor } from "@/lib/readiness/band";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { track } from "@/lib/analytics";
import { mentionsOptionLetter, splitExplanation } from "@/core/path/text";
import type { ChoiceRep } from "@/core/path/types";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import { ScoreBar, ScoreLevel } from "@/components/instrument/ScoreLevel";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";

/** Room for the public pages' sticky header when the estimate scrolls into view. */
const HEADER_CLEARANCE = 72;

/**
 * The check's questions as the study path's question card asks them: lettered
 * like the exam, with the first sentence of the explanation as the reason and
 * the rest folded under it.
 */
function toReps(questions: readonly CheckQuestion[]): ChoiceRep[] {
  return questions.map((q, k) => {
    const { takeaway, rest } = splitExplanation(q.explanation);
    return {
      type: "choice",
      id: `check-${k}`,
      label: "Exam style",
      tier: "exam",
      objective: "",
      prompt: q.questionText,
      options: q.options,
      answer: q.correctIndex,
      takeaway,
      ...(rest ? { explanation: rest } : {}),
      lettered: true,
      ...(mentionsOptionLetter(`${takeaway} ${rest}`) ? { keepsLetters: true } : {}),
    };
  });
}

/**
 * The readiness check that needs no account: ten questions in the exam's
 * domain weights, marked in the browser, ending in an estimate.
 *
 * It is played on the study path's own question card, so every answer is
 * followed by its verdict in a sentence ("Correct." or "Incorrect. The correct
 * answer is X."), the reason, and "Continue", which takes the focus. A screen
 * reader is told each result and each new question, and the keys act only
 * while the focus is inside the card.
 */
export function ReadinessCheck({
  cert,
  questions,
  shortCertName,
  objectiveCount,
}: {
  /** The exam's slug, which names its study path. */
  cert: string;
  questions: CheckQuestion[];
  shortCertName: string;
  objectiveCount: number;
}) {
  const reps = useMemo(() => toReps(questions), [questions]);
  // Raised when the check is taken again, so the first question is a new card.
  const [run, setRun] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<CheckAnswer[]>([]);

  const total = questions.length;
  const done = index >= total;
  const question = questions[index];

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const asked = questions[index];
      if (!asked) return;
      setAnswers((prev) => [
        ...prev,
        { domainTitle: asked.domainTitle, examWeight: asked.examWeight, correct: answer.correct },
      ]);
    },
    [questions, index]
  );

  const onNext = useCallback(() => setIndex((i) => i + 1), []);

  function restart() {
    setIndex(0);
    setAnswers([]);
    setRun((r) => r + 1);
  }

  if (total === 0) return null;

  if (done) {
    return (
      <Estimate
        answers={answers}
        total={total}
        shortCertName={shortCertName}
        objectiveCount={objectiveCount}
        // Network+ is set out by CertBench's own topics, which are not CompTIA's objectives.
        official={usesOfficialObjectiveNumbers(cert)}
        // The way on is the same for everyone: this exam's study path.
        pathHref={`/path/${cert}`}
        onRestart={restart}
      />
    );
  }

  const results = questions.map((_, k) => (k < answers.length ? answers[k].correct : null));

  return (
    <section aria-label={`${shortCertName} readiness check`} className="glass grid min-w-0 gap-6 rounded-lg p-5 sm:p-8">
      <div className="grid gap-3">
        <div className="flex min-w-0 items-baseline justify-between gap-4">
          {/* The exam domain the question is drawn from. It wraps on a phone: it is not cut short. */}
          <p className="cb-label min-w-0 text-muted-foreground">{question.domainTitle}</p>
          <p className="shrink-0 text-small text-muted-foreground">
            Question {index + 1} of {total}
          </p>
        </div>
        <StopProgress results={results} current={index} />
      </div>
      <RepCard
        key={`${run}-${index}`}
        rep={reps[index]}
        onAnswer={onAnswer}
        onNext={onNext}
        promptAs="p"
        // The first question is on the page as it loads and takes no focus;
        // every later one follows an answer or a restart.
        takeFocus={index > 0 || run > 0}
        nextLabel={index === total - 1 ? "View my estimate" : undefined}
        // Every question of the check is exam-style, and the domain is named above it.
        showKind={false}
      />
    </section>
  );
}

/**
 * The estimate: how many answers were correct, the score against the readiness
 * target in the words every score report uses, each domain on the same scale,
 * and the way on to the exam's study path.
 */
function Estimate({
  answers,
  total,
  shortCertName,
  objectiveCount,
  official,
  pathHref,
  onRestart,
}: {
  answers: CheckAnswer[];
  total: number;
  shortCertName: string;
  objectiveCount: number;
  /** Whether the exam's study path follows CompTIA's own objectives, so that its count may be called objectives. */
  official: boolean;
  pathHref: string;
  onRestart: () => void;
}) {
  const result = useMemo(() => estimateReadiness(answers), [answers]);
  const band = bandFor(result.score);
  const correct = answers.filter((a) => a.correct).length;

  // The estimate replaces a question of a different height, which may have
  // been scrolled past. Its heading takes the focus so that it is read, and
  // its top is brought back under the header when it is out of sight.
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const el = heading.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const y = el.getBoundingClientRect().top;
    if (y >= HEADER_CLEARANCE && y <= window.innerHeight / 2) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
  }, []);

  return (
    <section
      aria-label={`${shortCertName} readiness estimate`}
      className="glass grid min-w-0 gap-6 rounded-lg p-5 sm:p-8"
    >
      <h2 ref={heading} tabIndex={-1} className="cb-statement">
        You answered {correct} of {total} questions correctly.
      </h2>

      <ScoreLevel score={result.score} band={band} caption="Estimated readiness" />

      <p className="cb-measure-sm text-small text-muted-foreground">
        The estimate is weighted in the same way as the domains of the real exam.
      </p>

      <ul aria-label="Your answers by exam domain" className="grid gap-3.5 border-t border-border pt-6">
        {result.domains.map((d) => (
          <li
            key={d.domainTitle}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-x-5 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
          >
            <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
              <span className="min-w-0">{d.domainTitle}</span>
              <span className="shrink-0 text-note text-muted-foreground">
                {d.correct} of {d.total} correct
              </span>
            </div>
            {/* Beside the label from the sm width, the bar sits on the label's first line (24 pixels high, the bar 8),
                so a domain whose name wraps keeps its count and its bar on one line. */}
            <ScoreBar value={d.pct} color={bandFor(d.pct).accent} className="sm:mt-2" />
          </li>
        ))}
      </ul>

      <div className="grid gap-4 border-t border-border pt-6">
        <p className="cb-measure-sm text-small text-muted-foreground">
          This is an estimate from {total} questions. The {shortCertName} study path covers all {objectiveCount}{" "}
          {official ? "objectives" : "topics"}, one short step at a time, and shows where you stand as you progress.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button asChild size="lg" className="h-auto min-h-12 whitespace-normal py-2.5">
            <Link href={pathHref} onClick={() => track("upsell_clicked", { context: "readiness_check", href: pathHref })}>
              Start the {shortCertName} study path
              <LinkArrow />
            </Link>
          </Button>
          <button type="button" onClick={onRestart} className="cb-link cb-tap text-small font-medium">
            Take the check again
          </button>
        </div>
      </div>
    </section>
  );
}
