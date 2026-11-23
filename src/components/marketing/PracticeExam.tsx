"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { QuestionList, type DeckQuestion } from "@/components/marketing/QuestionList";
import { claimKeyboard, useKeyboardTurn } from "@/components/path/keyboard-turn";
import { RehearsalPlayer } from "@/components/path/RehearsalPlayer";
import { domainOf, RehearsalResult } from "@/components/path/RehearsalResult";
import { clearRun, readRun, writeRun, type RehearsalRun } from "@/components/path/rehearsal-run";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { clock, halfOfExam, REHEARSAL_FORMATS, scoreRehearsal } from "@/core/path/rehearsal";
import type { ChoiceRep, PathStructure, RehearsalSize } from "@/core/path/types";
import { identifyUser, track } from "@/lib/analytics";
import { shuffled } from "@/lib/tools/practice-exam";

/** Runs on a public page belong to the device, not to an account. */
const OWNER = "public";

/** On the page's address after a Google sign-in from the score gate: show the score. */
const SCORED = "exam";

/**
 * Extended time, as a multiple of the standard limit: time and a half, and
 * double time. The standard limit stays the default; a sitting keeps the limit
 * it was started with for as long as it is on the device.
 */
const EXTENDED_TIME = [1.5, 2] as const;
const extendedMinutes = (minutes: number, factor: number) => Math.ceil(minutes * factor);

/** Where a page's practice exam keeps its sitting on the device. */
const storageIdOf = (testId: string) => `${testId}-practice-test`;

export interface PracticeExamNext {
  heading: string;
  body: string;
  primary: { href: string; label: string };
  links?: { href: string; label: string }[];
}

type View = "intro" | "test" | "result";

/**
 * A sitting left mid-way, as the line in a page's opening lines reads it
 * (PracticeExamJump): how far it has gone, and the way back into it. The
 * practice exam on the page publishes it here; nothing is published while the
 * exam itself is on screen.
 */
interface PausedSitting {
  answered: number;
  total: number;
  resume: () => void;
}
const paused = new Map<string, PausedSitting>();
const pausedListeners = new Set<() => void>();

function publishPaused(id: string, sitting: PausedSitting | null) {
  if (sitting) paused.set(id, sitting);
  else if (!paused.delete(id)) return;
  for (const listener of pausedListeners) listener();
}

function subscribePaused(listener: () => void) {
  pausedListeners.add(listener);
  return () => {
    pausedListeners.delete(listener);
  };
}

/**
 * A free practice exam, taken like the real one: every question against the
 * clock, no answers until the end, then a score by domain and every answer
 * explained. It runs on the study path's own exam player and result. The
 * sitting is kept on the device, so leaving (or a closed tab) stops the clock
 * and loses nothing. A full-length exam can also be taken as a half, cut from
 * the same questions, or with extended time. Anyone can take it; the score
 * comes with a free account, which the card says before they start and the end
 * asks for, there on the page.
 *
 * Given `listTitle`, the exam also lists its questions with their answers,
 * folded, under the card. The list is in the page as it is served. It is taken
 * away while a sitting is in progress and until its score has been shown, so
 * the page never shows the answers of an exam that is being taken.
 */
export function PracticeExam({
  testId,
  structure,
  reps,
  size,
  offerHalf = false,
  next,
  headingLevel = "h2",
  listTitle,
  objectiveCodes = true,
}: {
  /** Names the exam in analytics and the sitting on this device, e.g. "security-plus-sy0-801". */
  testId: string;
  structure: PathStructure;
  /** Every question of the exam, as the page lists them. Each sitting shuffles them. */
  reps: ChoiceRep[];
  /** Its length against the real exam's: `reps` must hold that many questions. */
  size: RehearsalSize;
  /** With a full-length exam: also offer a half-length sitting, at the same pace. */
  offerHalf?: boolean;
  /** The way on, shown under the score. */
  next: PracticeExamNext;
  /** The level of the card's heading: h3 under a section that already has an h2. */
  headingLevel?: "h2" | "h3";
  /** The summary line of the folded list of questions and answers. No list without it. */
  listTitle?: string;
  /** False where the exam's objective numbers are not CompTIA's own: the list then names each objective without one. */
  objectiveCodes?: boolean;
}) {
  const storageId = storageIdOf(testId);
  const { minutes } = REHEARSAL_FORMATS[size];
  const halfToo = offerHalf && size === "full" && reps.length > REHEARSAL_FORMATS.half.questions;
  const userId = useSessionUserId();
  // An account made at the score gate opens the score at once, ahead of the session event.
  const [signedUpHere, setSignedUpHere] = useState<string | null>(null);
  const account = typeof userId === "string" ? userId : signedUpHere;
  const signedIn = account !== null;
  const [stored, setStored] = useState<RehearsalRun | null>(null);
  const [view, setView] = useState<View>("intro");
  // Counts the changes of screen the person has asked for. The card they come
  // back to takes the focus only then, and never as the page loads.
  const [arrival, setArrival] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // A deck further down the page also takes 1 to 4: the keys follow whichever was played last.
  const turnId = useId();
  const keyboard = useKeyboardTurn(turnId, rootRef);

  // This device's sitting: one in progress, or the last one scored.
  useEffect(() => {
    setStored(readRun(storageId, OWNER));
  }, [storageId]);

  // A finished exam is shown only to the account it was first shown to. On a
  // shared computer, the next person to sign in starts from a clean card.
  const foreign = Boolean(stored?.done && stored.claimedBy && account && stored.claimedBy !== account);
  const run = foreign ? null : stored;
  const inProgress = run && !run.done ? run : null;

  const save = useCallback(
    (nextRun: RehearsalRun) => {
      setStored(nextRun);
      writeRun(storageId, nextRun);
    },
    [storageId]
  );

  /** Bring the top of the exam back into view when the screen changes. */
  const toTop = useCallback(() => {
    rootRef.current?.scrollIntoView?.({ block: "start" });
  }, []);

  /** Change the screen in answer to the person: its heading takes the focus. */
  const show = useCallback(
    (nextView: View) => {
      setView(nextView);
      setArrival((n) => n + 1);
      toTop();
    },
    [toTop]
  );

  // Back from a Google sign-in made at the score gate: the score they signed in for.
  useEffect(() => {
    if (!signedIn || !run?.done) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get(SCORED) !== "scored") return;
    url.searchParams.delete(SCORED);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    track("practice_test_account_linked", { test: testId, method: "redirect" });
    setView("result");
    toTop();
  }, [signedIn, run, testId, toTop]);

  // The score has been shown to an account: the exam is that account's from
  // now on. The study path brings a finished exam into an account only when
  // nobody else has claimed it (core/path/exam-import.ts).
  useEffect(() => {
    if (view !== "result" || !account || !run?.done || run.claimedBy) return;
    save({ ...run, claimedBy: account });
  }, [view, account, run, save]);

  /**
   * A new sitting: the whole exam, or (on a full-length one) the half cut from
   * it. `limitMs` is the time allowed where it is not the standard limit.
   */
  function start(sitting: RehearsalSize = size, limitMs?: number) {
    const half = sitting !== size;
    const drawn = shuffled(half ? halfOfExam(reps, structure.domains) : reps);
    save({
      v: 1,
      owner: OWNER,
      claimedBy: null,
      size: half ? "half" : size,
      asStop: false,
      reps: drawn,
      picks: drawn.map(() => null),
      flagged: [],
      i: 0,
      spentMs: 0,
      limitMs: limitMs ?? REHEARSAL_FORMATS[half ? "half" : size].minutes * 60_000,
      startedAt: Date.now(),
      done: null,
    });
    track("practice_test_started", { test: testId, questions: drawn.length, resumed: false });
    claimKeyboard(turnId);
    setView("test");
    toTop();
  }

  // The sitting as it stands now, for `resume`: one function for the life of
  // the page, which the line in the opening lines can hold on to. It reads the
  // sitting from here and not from storage, so it works where storage is refused.
  const latest = useRef(inProgress);
  useEffect(() => {
    latest.current = inProgress;
  });
  const resume = useCallback(() => {
    const cur = latest.current;
    if (!cur) return;
    track("practice_test_started", { test: testId, questions: cur.reps.length, resumed: true });
    claimKeyboard(turnId);
    setView("test");
    toTop();
  }, [testId, turnId, toTop]);

  function discard() {
    clearRun(storageId);
    setStored(null);
    setArrival((n) => n + 1);
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
    show("result");
  }

  // A sitting left mid-way is offered in the page's opening lines as well.
  const pausedAnswered = inProgress && view !== "test" ? inProgress.picks.filter((p) => p !== null).length : null;
  const pausedTotal = inProgress?.reps.length ?? 0;
  useEffect(() => {
    publishPaused(
      storageId,
      pausedAnswered === null ? null : { answered: pausedAnswered, total: pausedTotal, resume }
    );
    return () => publishPaused(storageId, null);
  }, [storageId, pausedAnswered, pausedTotal, resume]);

  // The exam's questions with their answers, for the folded list.
  const listed = useMemo(
    () => (listTitle ? listedQuestions(reps, structure, objectiveCodes) : null),
    [listTitle, reps, structure, objectiveCodes]
  );
  // Not while a sitting is in progress, and not before its score has been shown.
  const showList = listed !== null && !inProgress && (!run?.done || signedIn);

  let screen;
  if (view === "test" && inProgress) {
    screen = (
      <RehearsalPlayer
        key={inProgress.startedAt}
        run={inProgress}
        examCode={structure.examCode}
        heading={headingLevel}
        scoreNeedsAccount={!signedIn}
        keyboard={keyboard}
        onChange={save}
        onFinish={finish}
        onLeave={() => show("intro")}
      />
    );
  } else if (view === "result" && run?.done && !signedIn) {
    screen = (
      <ScoreGate
        heading={headingLevel}
        testId={testId}
        answered={run.done.result.answered}
        total={run.reps.length}
        timedOut={run.done.timedOut}
        onSignedIn={(uid, email, method) => {
          identifyUser(uid, email ? { email } : undefined);
          track("practice_test_account_linked", { test: testId, method });
          setSignedUpHere(uid);
          show("result");
        }}
        onBack={() => show("intro")}
      />
    );
  } else if (view === "result" && run?.done) {
    screen = (
      <RehearsalResult run={{ ...run, done: run.done }} structure={structure} takeFocus>
        <div className="glass grid gap-3 rounded-lg p-5 sm:p-6">
          <h3 className="cb-statement">{next.heading}</h3>
          <p className="cb-measure text-small text-muted-foreground">{next.body}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Button asChild size="lg" className="h-auto min-h-12 max-w-full whitespace-normal py-2.5">
              <Link
                href={next.primary.href}
                onClick={() =>
                  track("upsell_clicked", { context: `${testId}_practice_test`, href: next.primary.href })
                }
              >
                {next.primary.label}
                <LinkArrow />
              </Link>
            </Button>
            {next.links?.map((link) => (
              <Link key={link.href} href={link.href} className="cb-link text-small">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          {/* The same length and the same time allowed as the sitting just finished. */}
          <Button variant="outline" onClick={() => start(halfToo ? run.size : size, run.limitMs)}>
            <RotateCcw aria-hidden />
            Take the exam again
          </Button>
        </div>
      </RehearsalResult>
    );
  } else {
    screen = (
      <Intro
        heading={headingLevel}
        arrival={arrival}
        questions={reps.length}
        minutes={minutes}
        half={halfToo ? REHEARSAL_FORMATS.half : null}
        signedIn={signedIn}
        run={run}
        onStart={() => start()}
        onStartHalf={() => start("half")}
        onStartExtended={(factor) => start(size, extendedMinutes(minutes, factor) * 60_000)}
        onResume={resume}
        onDiscard={discard}
        onSeeResult={() => show("result")}
      />
    );
  }

  return (
    <div ref={rootRef} className="grid scroll-mt-20 grid-cols-[minmax(0,1fr)] gap-4">
      {screen}
      {showList && listed && <QuestionList questions={listed} title={listTitle} />}
    </div>
  );
}

/**
 * In a page's opening lines: the way down to the practice exam, or, when a
 * sitting was left mid-way on this device, how far it has gone and the way
 * back into it. One line for either, so the page does not grow a new block
 * for a returning visitor.
 */
export function PracticeExamJump({ testId, href = "#practice-test" }: { testId: string; href?: string }) {
  const id = storageIdOf(testId);
  const sitting = useSyncExternalStore(
    subscribePaused,
    () => paused.get(id) ?? null,
    () => null
  );
  return (
    <p className="text-small text-muted-foreground">
      {sitting ? (
        <>
          You have a practice exam in progress, with {sitting.answered} of {sitting.total} questions answered.{" "}
          {/* A button and not a link to the exam's place on the page: it opens
              the question where the sitting stopped, brings it into view and
              puts the focus on it. (A link to a place on the page would take
              the focus away again as the browser followed it.) */}
          <button type="button" className="cb-link cb-tap" onClick={sitting.resume}>
            Resume the exam
          </button>
          .
        </>
      ) : (
        <>
          <a href={href} className="cb-link cb-tap">
            Go to the practice exam
          </a>
          .
        </>
      )}
    </p>
  );
}

/** The exam's questions for the folded list, each under its objective. */
function listedQuestions(reps: readonly ChoiceRep[], structure: PathStructure, codes: boolean): DeckQuestion[] {
  const titles = new Map(structure.domains.flatMap((d) => d.objectives.map((o) => [o.code, o.title] as const)));
  return reps.map((rep) => {
    const title = titles.get(rep.objective);
    return {
      questionText: rep.prompt,
      options: rep.options,
      correctIndex: rep.answer,
      explanation: [rep.takeaway, rep.explanation].filter(Boolean).join(" "),
      tag: title === undefined ? undefined : codes ? `${rep.objective} ${title}` : title,
    };
  });
}

const FULL = REHEARSAL_FORMATS.full;

/**
 * The end of a sitting for someone signed out: the exam has been scored, and a
 * free account shows the score, made there on the page. Google sign-in comes
 * back to the page with the score open. It is shown in answer to a press or to
 * the clock running out, so its heading takes the focus and a screen reader
 * reads it, with the sentence under it, at once.
 */
function ScoreGate({
  heading: Heading,
  testId,
  answered,
  total,
  timedOut,
  onSignedIn,
  onBack,
}: {
  heading: "h2" | "h3";
  testId: string;
  answered: number;
  total: number;
  /** The clock ran out: said first, before anything else. */
  timedOut: boolean;
  onSignedIn: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => void;
  /** Back to the card the exam is started from, the score still waiting. */
  onBack: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bodyId = useId();
  useEffect(() => {
    track("practice_test_gate_viewed", { test: testId });
  }, [testId]);
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  const nextPath = typeof window === "undefined" ? "/" : `${window.location.pathname}?${SCORED}=scored`;

  return (
    <div className="glass grid gap-5 rounded-lg p-5 sm:p-8">
      <Heading ref={headingRef} tabIndex={-1} aria-describedby={bodyId} className="cb-subsection">
        {timedOut ? "The time limit was reached." : "Your practice exam has been scored."}
      </Heading>
      <p id={bodyId} className="cb-measure text-body text-muted-foreground">
        {timedOut && "Your practice exam has been scored. "}You answered {answered} of {total} questions. Create a free
        account to see your score by domain, with every answer explained.
      </p>
      <InlineSignup nextPath={nextPath} submitLabel="Show my score" onSignedIn={onSignedIn} />
      <p className="text-small">
        <button type="button" onClick={onBack} className="cb-link cb-tap">
          Return to the practice exam page
        </button>
      </p>
    </div>
  );
}

/** Before the exam, or between sittings: what it is, and the way back into one left mid-way. */
function Intro({
  heading: Heading,
  arrival,
  questions,
  minutes,
  half,
  signedIn,
  run,
  onStart,
  onStartHalf,
  onStartExtended,
  onResume,
  onDiscard,
  onSeeResult,
}: {
  heading: "h2" | "h3";
  /** Above zero once the person has come back to this card: its heading then takes the focus. */
  arrival: number;
  questions: number;
  minutes: number;
  /** A half-length sitting on offer too, with a full-length exam. */
  half: { questions: number; minutes: number } | null;
  /** Signed out, the score comes with a free account: said here, before they start. */
  signedIn: boolean;
  run: RehearsalRun | null;
  onStart: () => void;
  onStartHalf: () => void;
  /** The whole exam with more time: one and a half times the limit, or twice. */
  onStartExtended: (factor: (typeof EXTENDED_TIME)[number]) => void;
  onResume: () => void;
  onDiscard: () => void;
  onSeeResult: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const discardRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);
  // True once the person has opened or closed the question about discarding.
  const asked = useRef(false);
  const inProgress = run && !run.done ? run : null;
  const last = run?.done ?? null;
  const answered = inProgress ? inProgress.picks.filter((pick) => pick !== null).length : 0;
  const fullLength = questions >= FULL.questions;

  useEffect(() => {
    if (arrival > 0) headingRef.current?.focus({ preventScroll: true });
  }, [arrival]);

  // The question about discarding opens on the choice that loses nothing, and
  // closing it returns the focus to the control that opened it.
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
    <div className="glass grid gap-5 rounded-lg p-5 sm:p-8">
      <Heading ref={headingRef} tabIndex={-1} className="cb-subsection">
        {questions} questions in {minutes} minutes
      </Heading>
      <div className="cb-measure grid gap-3 text-body">
        <p className="text-muted-foreground">
          {fullLength
            ? "These are the limits of the real exam, so the practice exam is full length and at the real pace. As in the real exam, answers are not shown until the end."
            : `This is half of the real exam's limit of ${FULL.questions} questions in ${FULL.minutes} minutes, so the pace is the same. As in the real exam, answers are not shown until the end.`}
        </p>
        {/* What it costs and what the score needs, in the card's own words and not in small print. */}
        <p>
          {signedIn
            ? "The exam is free. When you finish, your score is shown by domain, with the explanation of every answer."
            : "The exam is free. When you finish, a free account shows your score by domain and the explanation of every answer."}
        </p>
      </div>

      {inProgress ? (
        <div className="grid gap-3">
          <p className="text-small text-muted-foreground">
            You have a practice exam in progress, with {answered} of {inProgress.reps.length} questions answered and{" "}
            {clock(inProgress.limitMs - inProgress.spentMs)} remaining.
          </p>
          <div>
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
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  asked.current = false;
                  setConfirming(false);
                  onDiscard();
                }}
              >
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
      ) : (
        <div className="grid gap-3">
          {last &&
            (signedIn ? (
              <p className="text-small text-muted-foreground">
                Your last score was <span className="font-medium tabular-nums text-foreground">{last.result.score}%</span>
                .{" "}
                <button type="button" onClick={onSeeResult} className="cb-link cb-tap">
                  View that result
                </button>
                .
              </p>
            ) : (
              <p className="text-small text-muted-foreground">
                You have already completed this practice exam.{" "}
                <button type="button" onClick={onSeeResult} className="cb-link cb-tap">
                  View your score
                </button>{" "}
                with a free account.
              </p>
            ))}
          <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            <Button size="lg" className="w-full sm:w-auto" onClick={onStart}>
              {last ? "Take the exam again" : fullLength ? "Start the full exam" : "Start the exam"}
              <ArrowRight aria-hidden />
            </Button>
            {half && (
              <Button
                variant="outline"
                size="lg"
                className="h-auto min-h-12 w-full whitespace-normal py-2.5 sm:w-auto"
                onClick={onStartHalf}
              >
                Half-length exam: {half.questions} questions in {half.minutes} minutes
              </Button>
            )}
          </div>
          {/* For a candidate who sits the real exam with extended time. Each
              choice is named in full for a screen reader, which may read it
              without the words before it. */}
          <p className="text-small text-muted-foreground">
            Take the exam with extended time:{" "}
            {EXTENDED_TIME.map((factor, k) => (
              <span key={factor}>
                {k > 0 && " or "}
                <button type="button" onClick={() => onStartExtended(factor)} className="cb-link cb-tap">
                  {extendedMinutes(minutes, factor)} minutes <span className="sr-only">of extended time</span>
                </button>
              </span>
            ))}
            .
          </p>
        </div>
      )}

      <ul className="grid list-disc gap-2 border-t border-border pl-5 pt-5 text-small text-muted-foreground">
        <li>You can flag any question and return to it before you finish.</li>
        <li>The clock stops if you leave, and your answers are kept on this device.</li>
      </ul>
    </div>
  );
}
