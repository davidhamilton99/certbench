"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flag, Gauge, RotateCcw, Timer } from "lucide-react";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { claimKeyboard, useKeyboardTurn } from "@/components/path/keyboard-turn";
import { RehearsalPlayer } from "@/components/path/RehearsalPlayer";
import { domainOf, RehearsalResult } from "@/components/path/RehearsalResult";
import { clearRun, readRun, writeRun, type RehearsalRun } from "@/components/path/rehearsal-run";
import { Button } from "@/components/ui/button";
import { clock, halfOfExam, REHEARSAL_FORMATS, scoreRehearsal } from "@/core/path/rehearsal";
import type { ChoiceRep, PathStructure, RehearsalSize } from "@/core/path/types";
import { identifyUser, track } from "@/lib/analytics";
import { shuffled } from "@/lib/tools/practice-exam";

/** Runs on a public page belong to the device, not to an account. */
const OWNER = "public";

/** On the page's address after a Google sign-in from the score gate: show the score. */
const SCORED = "exam";

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
 * device, so leaving (or a closed tab) stops the clock and loses nothing. A
 * full-length test can also be sat as a half, cut from the same questions.
 * Anyone can sit it; the score comes with a free account, which the intro says
 * before they start and the end asks for, right there.
 */
export function PracticeExam({
  testId,
  structure,
  reps,
  size,
  offerHalf = false,
  next,
  headingLevel = "h2",
}: {
  /** Names the test in analytics and the run on this device, e.g. "security-plus-sy0-801". */
  testId: string;
  structure: PathStructure;
  /** Every question of the test, as the page lists them. Each sitting shuffles them. */
  reps: ChoiceRep[];
  /** Its length against the real exam's: `reps` must hold that many questions. */
  size: RehearsalSize;
  /** With a full-length test: also offer a half-length sitting, at the same pace. */
  offerHalf?: boolean;
  /** The way on, shown under the score. */
  next: PracticeExamNext;
  /** The intro title's level: h3 under a section that already has an h2. */
  headingLevel?: "h2" | "h3";
}) {
  const storageId = `${testId}-practice-test`;
  const { minutes } = REHEARSAL_FORMATS[size];
  const halfToo = offerHalf && size === "full" && reps.length > REHEARSAL_FORMATS.half.questions;
  const userId = useSessionUserId();
  // An account made at the score gate opens the score straight away, ahead of the session event.
  const [signedUpHere, setSignedUpHere] = useState(false);
  const signedIn = typeof userId === "string" || signedUpHere;
  const [run, setRun] = useState<RehearsalRun | null>(null);
  const [view, setView] = useState<View>("intro");
  const rootRef = useRef<HTMLDivElement>(null);
  // A deck further down the page also takes 1–4: the keys follow whichever was played last.
  const turnId = useId();
  const keyboard = useKeyboardTurn(turnId, rootRef);

  // This device's run of the test: one in progress, or the last one scored.
  useEffect(() => {
    setRun(readRun(storageId, OWNER));
  }, [storageId]);

  // Back from a Google sign-in made at the score gate: the score they signed up for.
  useEffect(() => {
    if (!signedIn || !run?.done) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(SCORED) !== "scored") return;
    url.searchParams.delete(SCORED);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    track("practice_test_account_linked", { test: testId, method: "redirect" });
    setView("result");
  }, [signedIn, run, testId]);

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

  /** A new sitting: the whole test, or (on a full-length one) the half cut from it. */
  function start(sitting: RehearsalSize = size) {
    const half = sitting !== size;
    const drawn = shuffled(half ? halfOfExam(reps, structure.domains) : reps);
    save({
      v: 1,
      owner: OWNER,
      size: half ? "half" : size,
      asStop: false,
      reps: drawn,
      picks: drawn.map(() => null),
      flagged: [],
      i: 0,
      spentMs: 0,
      limitMs: REHEARSAL_FORMATS[half ? "half" : size].minutes * 60_000,
      startedAt: Date.now(),
      done: null,
    });
    track("practice_test_started", { test: testId, questions: drawn.length, resumed: false });
    claimKeyboard(turnId);
    setView("test");
    toTop();
  }

  function resume() {
    if (!run) return;
    track("practice_test_started", { test: testId, questions: run.reps.length, resumed: true });
    claimKeyboard(turnId);
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
        keyboard={keyboard}
        onChange={save}
        onFinish={finish}
        onLeave={() => {
          setView("intro");
          toTop();
        }}
      />
    );
  } else if (view === "result" && run?.done && !signedIn) {
    screen = (
      <ScoreGate
        heading={headingLevel}
        testId={testId}
        answered={run.done.result.answered}
        total={run.reps.length}
        onSignedIn={(uid, email, method) => {
          identifyUser(uid, email ? { email } : undefined);
          track("practice_test_account_linked", { test: testId, method });
          setSignedUpHere(true);
          setView("result");
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
          <Button variant="outline" onClick={() => start(halfToo ? run.size : size)}>
            <RotateCcw />
            Take the test again
          </Button>
        </div>
      </RehearsalResult>
    );
  } else {
    screen = (
      <Intro
        heading={headingLevel}
        structure={structure}
        questions={reps.length}
        minutes={minutes}
        half={halfToo ? REHEARSAL_FORMATS.half : null}
        signedIn={signedIn}
        run={run}
        onStart={() => start()}
        onStartHalf={() => start("half")}
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

/**
 * The end of a sitting for someone signed out: the score is ready, and a free
 * account shows it, made right here. Google sign-in comes back to the page
 * with the score open.
 */
function ScoreGate({
  heading: Heading,
  testId,
  answered,
  total,
  onSignedIn,
}: {
  heading: "h2" | "h3";
  testId: string;
  answered: number;
  total: number;
  onSignedIn: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => void;
}) {
  useEffect(() => {
    track("practice_test_gate_viewed", { test: testId });
  }, [testId]);
  const nextPath = typeof window === "undefined" ? "/" : `${window.location.pathname}?${SCORED}=scored`;

  return (
    <div className="glass grid gap-5 rounded-[1.75rem] p-6 sm:p-8">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Practice test · scored</span>
      <Heading className="cb-display text-balance text-[2rem] sm:text-[2.6rem]">Your score is ready.</Heading>
      <p className="max-w-prose text-muted-foreground">
        You answered {answered} of {total}. Create a free account to see your score by domain, with every answer
        explained. It stays with your account, next to your path.
      </p>
      <InlineSignup nextPath={nextPath} submitLabel="Show my score" onSignedIn={onSignedIn} />
    </div>
  );
}

/** Before the test, or between sittings: what it is, and the way back into one left mid-way. */
function Intro({
  heading: Heading,
  structure,
  questions,
  minutes,
  half,
  signedIn,
  run,
  onStart,
  onStartHalf,
  onResume,
  onDiscard,
  onSeeResult,
}: {
  heading: "h2" | "h3";
  structure: PathStructure;
  questions: number;
  minutes: number;
  /** A half-length sitting on offer too, with a full-length test. */
  half: { questions: number; minutes: number } | null;
  /** Signed out, the score comes with a free account: said here, before they start. */
  signedIn: boolean;
  run: RehearsalRun | null;
  onStart: () => void;
  onStartHalf: () => void;
  onResume: () => void;
  onDiscard: () => void;
  onSeeResult: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const inProgress = run && !run.done ? run : null;
  const last = run?.done ?? null;
  const answered = inProgress ? inProgress.picks.filter((pick) => pick !== null).length : 0;
  const fullLength = questions >= FULL.questions;

  return (
    <div className="glass grid gap-5 rounded-[1.75rem] p-6 sm:p-8">
      <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Practice test · {structure.examCode}
      </span>
      <Heading className="cb-display text-balance text-[2rem] sm:text-[2.6rem]">
        {questions} questions, {minutes} minutes.
      </Heading>
      <p className="max-w-prose text-muted-foreground">
        {fullLength ? (
          <>
            The real exam&apos;s limit, so it&apos;s full length at the real pace. No answers until the end, as on the
            exam.
          </>
        ) : (
          <>
            Half of the real exam&apos;s limit of {FULL.questions} questions in {FULL.minutes} minutes, so the pace is
            the same. No answers until the end, as on the exam.
          </>
        )}
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
          {last &&
            (signedIn ? (
              <p className="text-sm text-muted-foreground">
                Last time you scored{" "}
                <span className="font-mono tabular-nums text-foreground">{last.result.score}%</span>.{" "}
                <button type="button" onClick={onSeeResult} className="underline underline-offset-4 hover:text-foreground">
                  See that result
                </button>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                You finished it last time.{" "}
                <button type="button" onClick={onSeeResult} className="underline underline-offset-4 hover:text-foreground">
                  See your score
                </button>{" "}
                with a free account.
              </p>
            ))}
          <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Button size="lg" className="h-12 w-full text-base sm:w-auto" onClick={onStart}>
              {last ? "Take the test again" : fullLength ? "Start the full exam" : "Start the test"}
              <ArrowRight />
            </Button>
            {half && (
              <Button variant="outline" size="lg" className="h-12 w-full text-base sm:w-auto" onClick={onStartHalf}>
                Half exam: {half.questions} questions, {half.minutes} min
              </Button>
            )}
            <span className="text-sm text-muted-foreground">
              {signedIn ? "Free." : "Free. A free account shows your score when you finish."}
            </span>
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
