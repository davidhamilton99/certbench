"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flag, Gauge, RotateCcw, Timer } from "lucide-react";
import { RehearsalPlayer } from "@/components/path/RehearsalPlayer";
import { domainOf, RehearsalResult } from "@/components/path/RehearsalResult";
import { clearRun, readRun, writeRun, type RehearsalRun } from "@/components/path/rehearsal-run";
import { Button } from "@/components/ui/button";
import { clock, REHEARSAL_FORMATS, scoreRehearsal } from "@/core/path/rehearsal";
import type { ChoiceRep, PathStructure, RehearsalSize } from "@/core/path/types";
import { track } from "@/lib/analytics";
import { shuffled } from "@/lib/tools/practice-exam";

/** Runs on a public page belong to the device, not to an account. */
const OWNER = "public";

export interface PracticeExamNext {
  heading: string;
  body: string;
  primary: { href: string; label: string };
  links?: { href: string; label: string }[];
}

type View = "intro" | "test" | "result";

/**
 * A free practice test, sat like the exam: every question against the clock,
 * no answers until the end, then a score by domain and every answer explained.
 * It runs on the path's own exam player and result. The run is kept on the
 * device, so leaving (or a closed tab) stops the clock and loses nothing.
 */
export function PracticeExam({
  testId,
  structure,
  reps,
  size,
  next,
}: {
  /** Names the test in analytics and the run on this device, e.g. "security-plus-sy0-801". */
  testId: string;
  structure: PathStructure;
  /** Every question of the test, as the page lists them. Each sitting shuffles them. */
  reps: ChoiceRep[];
  /** Its length against the real exam's: `reps` must hold that many questions. */
  size: RehearsalSize;
  /** The way on, shown under the score. */
  next: PracticeExamNext;
}) {
  const storageId = `${testId}-practice-test`;
  const { minutes } = REHEARSAL_FORMATS[size];
  const [run, setRun] = useState<RehearsalRun | null>(null);
  const [view, setView] = useState<View>("intro");
  const rootRef = useRef<HTMLDivElement>(null);

  // This device's run of the test: one in progress, or the last one scored.
  useEffect(() => {
    setRun(readRun(storageId, OWNER));
  }, [storageId]);

  const save = useCallback(
    (nextRun: RehearsalRun) => {
      setRun(nextRun);
      writeRun(storageId, nextRun);
    },
    [storageId]
  );

  /** Bring the top of the test back into view when the screen changes. */
  const toTop = useCallback(() => {
    rootRef.current?.scrollIntoView?.({ block: "start" });
  }, []);

  function start() {
    const drawn = shuffled(reps);
    save({
      v: 1,
      owner: OWNER,
      size,
      asStop: false,
      reps: drawn,
      picks: drawn.map(() => null),
      flagged: [],
      i: 0,
      spentMs: 0,
      limitMs: minutes * 60_000,
      startedAt: Date.now(),
      done: null,
    });
    track("practice_test_started", { test: testId, questions: drawn.length, resumed: false });
    setView("test");
    toTop();
  }

  function resume() {
    if (!run) return;
    track("practice_test_started", { test: testId, questions: run.reps.length, resumed: true });
    setView("test");
    toTop();
  }

  function discard() {
    clearRun(storageId);
    setRun(null);
  }

  /** Score it and keep the result on the device to look back over. */
  function finish(cur: RehearsalRun, timedOut: boolean) {
    const at = Date.now();
    const answers = cur.reps.map((rep, i) => ({
      domain: domainOf(rep.objective),
      correct: cur.picks[i] === rep.answer,
    }));
    const answered = cur.picks.filter((pick) => pick !== null).length;
    const seconds = Math.round(cur.spentMs / 1000);
    const result = scoreRehearsal(answers, structure.domains, { size: cur.size, answered, seconds, at });
    save({ ...cur, done: { result, before: null, timedOut } });
    track("practice_test_completed", {
      test: testId,
      score: result.score,
      answered,
      total: cur.reps.length,
      minutes: Math.round(seconds / 60),
      timed_out: timedOut,
    });
    track("upsell_viewed", { context: `${testId}_practice_test` });
    setView("result");
    toTop();
  }

  const inProgress = run && !run.done ? run : null;

  let screen;
  if (view === "test" && inProgress) {
    screen = (
      <RehearsalPlayer
        key={inProgress.startedAt}
        run={inProgress}
        examCode={structure.examCode}
        label="Practice test"
        noun="test"
        onChange={save}
        onFinish={finish}
        onLeave={() => {
          setView("intro");
          toTop();
        }}
      />
    );
  } else if (view === "result" && run?.done) {
    screen = (
      <RehearsalResult run={{ ...run, done: run.done }} structure={structure} label="Practice test" caption="Practice test">
        <div className="grid gap-3 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <h3 className="font-display text-lg font-semibold tracking-tight">{next.heading}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{next.body}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button asChild size="lg">
              <Link
                href={next.primary.href}
                onClick={() =>
                  track("upsell_clicked", { context: `${testId}_practice_test`, href: next.primary.href })
                }
              >
                {next.primary.label}
                <ArrowRight />
              </Link>
            </Button>
            {next.links?.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex justify-center">
          <Button variant="outline" onClick={start}>
            <RotateCcw />
            Take the test again
          </Button>
        </div>
      </RehearsalResult>
    );
  } else {
    screen = (
      <Intro
        structure={structure}
        questions={reps.length}
        minutes={minutes}
        run={run}
        onStart={start}
        onResume={resume}
        onDiscard={discard}
        onSeeResult={() => {
          setView("result");
          toTop();
        }}
      />
    );
  }

  return (
    <div ref={rootRef} className="scroll-mt-20">
      {screen}
    </div>
  );
}

const FULL = REHEARSAL_FORMATS.full;

/** Before the test, or between sittings: what it is, and the way back into one left mid-way. */
function Intro({
  structure,
  questions,
  minutes,
  run,
  onStart,
  onResume,
  onDiscard,
  onSeeResult,
}: {
  structure: PathStructure;
  questions: number;
  minutes: number;
  run: RehearsalRun | null;
  onStart: () => void;
  onResume: () => void;
  onDiscard: () => void;
  onSeeResult: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const inProgress = run && !run.done ? run : null;
  const last = run?.done ?? null;
  const answered = inProgress ? inProgress.picks.filter((pick) => pick !== null).length : 0;

  return (
    <div className="glass grid gap-5 rounded-3xl p-6 sm:p-8">
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        Practice test · {structure.examCode}
      </span>
      <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
        {questions} questions, {minutes} minutes.
      </h2>
      <p className="max-w-prose text-muted-foreground">
        Half of the real exam&apos;s limit of {FULL.questions} questions in {FULL.minutes} minutes, so the pace is the
        same. No answers until the end, as on the exam.
      </p>

      {/* The way in comes before the small print: on a phone it's on the first screen. */}
      {inProgress ? (
        <div className="grid gap-3">
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            In progress: {answered} of {inProgress.reps.length} answered,{" "}
            {clock(inProgress.limitMs - inProgress.spentMs)} left
          </p>
          <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Button size="lg" className="h-12 w-full text-base sm:w-auto" onClick={onResume}>
              Resume the test
              <ArrowRight />
            </Button>
            {confirming ? (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Throw away these answers?</span>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setConfirming(false);
                    onDiscard();
                  }}
                >
                  Start over
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  Keep them
                </Button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="justify-self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              >
                Start over
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {last && (
            <p className="text-sm text-muted-foreground">
              Last time you scored{" "}
              <span className="font-mono tabular-nums text-foreground">{last.result.score}%</span>.{" "}
              <button type="button" onClick={onSeeResult} className="underline underline-offset-4 hover:text-foreground">
                See that result
              </button>
            </p>
          )}
          <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Button size="lg" className="h-12 w-full text-base sm:w-auto" onClick={onStart}>
              {last ? "Take the test again" : "Start the test"}
              <ArrowRight />
            </Button>
            <span className="text-sm text-muted-foreground">Free, no account needed.</span>
          </div>
        </div>
      )}

      <ul className="grid gap-2.5 border-t pt-5 text-sm">
        <li className="flex gap-2.5">
          <Flag className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Flag anything to come back to before you finish.
        </li>
        <li className="flex gap-2.5">
          <Timer className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          The clock stops if you leave, and your answers stay on this device.
        </li>
        <li className="flex gap-2.5">
          <Gauge className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
          Your score comes by domain, with every answer explained.
        </li>
      </ul>
    </div>
  );
}
