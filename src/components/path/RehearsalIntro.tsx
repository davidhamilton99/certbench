"use client";

import { useState } from "react";
import { ArrowRight, Flag, Gauge, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock, REHEARSAL_FORMATS, type Reading } from "@/core/path/rehearsal";
import type { PathStructure, RehearsalResult, RehearsalSize } from "@/core/path/types";
import type { RehearsalRun } from "./rehearsal-run";

const fmtDay = (at: number) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const FULL = REHEARSAL_FORMATS.full;
const HALF = REHEARSAL_FORMATS.half;

/** Before a rehearsal: what it is, how it runs, and its two lengths. */
export function RehearsalIntro({
  structure,
  stopNumber,
  reading,
  onStart,
  onBack,
}: {
  structure: PathStructure;
  /** Its place on the path, when it's the path's last stop. */
  stopNumber: number | null;
  /** The reading its score will be set against. */
  reading: Reading | null;
  onStart: (size: RehearsalSize) => void;
  onBack: () => void;
}) {
  return (
    <div className="glass path-rise grid gap-5 rounded-3xl p-6 sm:p-8">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {stopNumber ? `Stop ${stopNumber} · Exam rehearsal` : `Exam rehearsal · ${structure.examCode}`}
      </span>
      <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        Sit the whole exam, start to finish.
      </h2>
      <p className="max-w-prose text-muted-foreground">
        {FULL.questions} questions in {FULL.minutes} minutes, the real {structure.examCode}&apos;s limits, drawn
        from all {structure.domains.length} domains in the exam&apos;s weights. No answers until the end, as on the
        exam.
      </p>
      <ul className="grid gap-2.5 text-sm">
        <li className="flex gap-2.5">
          <Flag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Flag anything to come back to before you finish.
        </li>
        <li className="flex gap-2.5">
          <Timer className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          The clock stops if you leave, and you pick up where you left off.
        </li>
        <li className="flex gap-2.5">
          <Gauge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          <span>
            Your score lands on the readiness dial
            {reading
              ? `, set against your ${reading.source}'s ${reading.score}% from ${fmtDay(reading.at)}.`
              : ", with every answer explained."}
          </span>
        </li>
      </ul>
      <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <Button size="lg" className="h-12 w-full text-base sm:w-auto" onClick={() => onStart("full")}>
          Start the full rehearsal
          <ArrowRight />
        </Button>
        <Button size="lg" variant="outline" className="h-12 w-full text-base sm:w-auto" onClick={() => onStart("half")}>
          Half: {HALF.questions} questions, {HALF.minutes} min
        </Button>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="justify-self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Back to my map
      </button>
    </div>
  );
}

/** On the home, a rehearsal left mid-way: back to it, or throw it away. */
export function RehearsalResumeCard({
  run,
  onResume,
  onDiscard,
}: {
  run: RehearsalRun;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const answered = run.picks.filter((pick) => pick !== null).length;
  return (
    <div className="glass grid gap-4 rounded-3xl p-5 ring-1 ring-primary/40 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Exam rehearsal · in progress</p>
          <p className="mt-1 font-display text-xl font-semibold tracking-tight">
            {answered} of {run.reps.length} answered
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-muted-foreground">
            <Timer className="size-3.5" aria-hidden />
            {clock(run.limitMs - run.spentMs)} left
          </p>
        </div>
        <Button size="lg" className="h-12 w-full px-6 text-base sm:w-auto" onClick={onResume}>
          Resume
          <ArrowRight />
        </Button>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Throw it away? Its answers won&apos;t count.</span>
          <Button size="sm" variant="destructive" onClick={onDiscard}>
            Discard it
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Keep it
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="justify-self-start text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Discard this rehearsal
        </button>
      )}
    </div>
  );
}

/** On a Pro home: the whole exam, any time, with how the last one went. */
export function RehearsalStartCard({
  last,
  onStart,
  onReview,
}: {
  last: RehearsalResult | null;
  onStart: () => void;
  /** Look back over the last one's answers, while this device still has them. */
  onReview?: () => void;
}) {
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 basis-64 items-start gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Timer className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Exam rehearsal · {FULL.questions} questions · {FULL.minutes} min
          </p>
          <p className="mt-1 font-display text-lg font-semibold tracking-tight">Sit the whole exam, any time</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {last ? (
              <>
                Last one: {last.score}% on {fmtDay(last.at)}
                {onReview && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={onReview}
                      className="underline underline-offset-4 hover:text-foreground"
                    >
                      See its answers
                    </button>
                  </>
                )}
              </>
            ) : (
              "Timed, scored on your readiness dial, every answer explained."
            )}
          </p>
        </div>
      </div>
      <Button size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto" onClick={onStart}>
        Start
        <ArrowRight />
      </Button>
    </div>
  );
}
