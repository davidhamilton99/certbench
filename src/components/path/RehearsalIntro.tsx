"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock, REHEARSAL_FORMATS, type Reading } from "@/core/path/rehearsal";
import type { PathStructure, RehearsalSize } from "@/core/path/types";
import type { RehearsalRun } from "./rehearsal-run";

/** "March 3": the page is in English, so its dates are too, whatever the browser's own language. */
const fmtDay = (at: number) => new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric" });

const FULL = REHEARSAL_FORMATS.full;
const HALF = REHEARSAL_FORMATS.half;

/**
 * Before a practice exam on the study path: what it is, how it runs, and its
 * two lengths. It opens in answer to a press, so its heading takes the focus
 * and a screen reader reads it.
 */
export function RehearsalIntro({
  structure,
  stopNumber,
  reading,
  onStart,
  onBack,
}: {
  structure: PathStructure;
  /** Its place on the study path, when it is the last step. */
  stopNumber: number | null;
  /** The reading its score will be set against. */
  reading: Reading | null;
  onStart: (size: RehearsalSize) => void;
  onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="glass path-rise grid gap-5 rounded-lg p-5 sm:p-8">
      <div className="grid gap-2">
        {/* Its place on the study path is a fact the heading does not hold. Opened
            from anywhere else it has no line above it: the exam's code is in
            the sentence below. */}
        {stopNumber && <p className="cb-label text-muted-foreground">Step {stopNumber}: practice exam</p>}
        {/* The screen's title: on the study path this is a screen of its own. */}
        <h1 ref={headingRef} tabIndex={-1} className="cb-subsection">
          Take a full-length practice exam.
        </h1>
      </div>
      <p className="cb-measure text-body text-muted-foreground">
        The practice exam has {FULL.questions} questions and a time limit of {FULL.minutes} minutes, which are the
        limits of the real {structure.examCode} exam. The questions are drawn from all {structure.domains.length}{" "}
        domains in the same proportions as the exam. As in the real exam, answers are not shown until the end.
      </p>
      <ul className="grid list-disc gap-2 pl-5 text-small text-muted-foreground">
        <li>You can flag any question and return to it before you finish.</li>
        <li>The clock stops if you leave, and you can continue from where you stopped.</li>
        <li>
          Your score is compared with the readiness target
          {reading
            ? ` and with your ${reading.source === "rehearsal" ? "last practice exam" : "checkpoint"} result of ${reading.score}% from ${fmtDay(reading.at)}.`
            : ", and every answer is explained."}
        </li>
      </ul>
      <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <Button size="lg" className="w-full sm:w-auto" onClick={() => onStart("full")}>
          Start the full practice exam
          <ArrowRight aria-hidden />
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-auto min-h-12 w-full whitespace-normal py-2.5 sm:w-auto"
          onClick={() => onStart("half")}
        >
          Half-length exam: {HALF.questions} questions in {HALF.minutes} minutes
        </Button>
      </div>
      <button type="button" onClick={onBack} className="cb-link cb-tap justify-self-start text-small">
        Return to the study path
      </button>
    </div>
  );
}

/** On the study path's home, a practice exam left mid-way: back to it, or discard it. */
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
  const discardRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  // True once the person has opened or closed the question about discarding.
  const asked = useRef(false);
  const answered = run.picks.filter((pick) => pick !== null).length;

  // The question opens on the choice that loses nothing, and closing it
  // returns the focus to the control that opened it.
  useEffect(() => {
    if (!asked.current) return;
    if (confirming) keepRef.current?.focus();
    else discardRef.current?.focus();
  }, [confirming]);

  function ask(open: boolean) {
    asked.current = true;
    setConfirming(open);
  }

  return (
    // The card's edge is the ordinary rule, as every card's is. The pressable
    // colour is kept for what can be pressed: here, the button that resumes.
    <div className="glass grid gap-4 rounded-lg p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-small text-muted-foreground">You have a practice exam in progress.</p>
          <p className="mt-1 text-xl font-semibold">
            {answered} of {run.reps.length} questions answered
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1.5 text-small tabular-nums text-muted-foreground">
            <Timer className="size-3.5" aria-hidden />
            {clock(run.limitMs - run.spentMs)} remaining
          </p>
        </div>
        <Button size="lg" className="w-full sm:w-auto" onClick={onResume}>
          Resume the exam
          <ArrowRight aria-hidden />
        </Button>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 text-small">
          <span className="text-muted-foreground">
            Do you want to discard this practice exam? Its answers will not be counted.
          </span>
          <Button size="sm" variant="destructive" onClick={onDiscard}>
            Discard the exam
          </Button>
          <Button ref={keepRef} size="sm" variant="ghost" onClick={() => ask(false)}>
            Keep the exam
          </Button>
        </div>
      ) : (
        <button
          ref={discardRef}
          type="button"
          onClick={() => ask(true)}
          className="cb-link cb-tap justify-self-start text-small"
        >
          Discard this practice exam
        </button>
      )}
    </div>
  );
}
