"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ScoreLevel } from "@/components/instrument/ScoreLevel";
import type { PbqGradeResult, SimField, SimFieldAnswer } from "@/data/pbq/types";
import { answerText, callPrompt, fieldCredit, stageSentence, stageTally } from "@/core/pbq/sim-play";
import { PbqUpsellCard, type PbqUpsell } from "@/components/workspace/pbq-upsell";
import type { PbqHostProps } from "@/components/workspace/pbq-host";
import { SimMove } from "@/components/workspace/SimMoves";
import { track } from "@/lib/analytics";
import { bandFor } from "@/lib/readiness/band";
import { cn } from "@/lib/utils";

/**
 * The pieces every lab is played with: a header, a staged run of moves (a
 * simulation's tasks, a topology's broken devices), the card that ends a
 * stage, and the score that ends a lab. One look and one feel across labs.
 */

/** Room for a page's sticky header when part of a lab scrolls back into view. */
const HEADER_CLEARANCE = 72;

/* ------------------------------------------------------------------ */
/*  Header                                                             */
/* ------------------------------------------------------------------ */

export function LabHeader({
  title,
  subtitle,
  onBack,
  backLabel,
  takeFocus = false,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel?: string;
  /** Put the keyboard's focus on the title as the lab opens (see PbqHostProps). */
  takeFocus?: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (takeFocus) heading.current?.focus();
  }, [takeFocus]);

  return (
    <div className="flex items-start gap-1">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel ?? "Return to the scenarios"}
        // The only way back to the list: a full-size target, the arrow at its centre.
        className="cb-tap -ml-2 flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <div className="min-w-0 pt-1">
        {/* Takes the focus so that it is read when the lab opens; it is not a control. */}
        <h2 ref={heading} tabIndex={-1} className="text-lg font-semibold leading-snug">
          {title}
        </h2>
        <p className="text-note text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  A staged run                                                       */
/* ------------------------------------------------------------------ */

/** One stage of a run: a simulation's task, or a topology's device to fix. */
export interface LabStage {
  id: string;
  /** Shown in the HUD and the results, e.g. "Diagnose the Display Issue" or "FW-Perimeter". */
  title: string;
  fields: SimField[];
  /** Folded on the stage's card. */
  explanation: string;
}

/** A stage's line in the results: the grader's points for it. */
export interface StageScore {
  correct: number;
  total: number;
}

/** Where play is: a move in a stage, or the stage's card once its last move is done. */
export interface Spot {
  stage: number;
  move: number;
  done: boolean;
}

const START: Spot = { stage: 0, move: 0, done: false };

/**
 * A lab played as stages of moves, each move marked the moment it's
 * answered, each stage ending on its score, the lab on the grader's score.
 * `renderCase` draws what sits between the HUD and the move: the ticket and
 * the evidence for a simulation, the map and configs for a topology.
 */
export function StagedLab({
  scenarioId,
  title,
  subtitle,
  stages,
  noun,
  renderCase,
  grade,
  explanation,
  upsell,
  onBack,
  onGraded,
  backLabel,
  onStarted,
  takeFocus,
  confirmLeave = true,
}: {
  scenarioId: string;
  title: string;
  subtitle: string;
  stages: readonly LabStage[];
  /** "Stage" or "Device", for "Stage 1 of 3". */
  noun: string;
  renderCase: (at: { stage: number; done: boolean; run: number; credit: Readonly<Record<string, number>> }) => ReactNode;
  /** The lab's own grader, with each stage's points in the stages' order. */
  grade: (answers: Record<string, SimFieldAnswer>) => { result: PbqGradeResult; stages: StageScore[] };
  explanation: string;
  upsell?: PbqUpsell;
  onBack: () => void;
} & PbqHostProps) {
  const root = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const play = useRef<HTMLDivElement>(null);

  const [run, setRun] = useState(0);
  const [spot, setSpot] = useState<Spot>(START);
  const [answers, setAnswers] = useState<Record<string, SimFieldAnswer>>({});
  const [credit, setCredit] = useState<Record<string, number>>({});
  const [graded, setGraded] = useState<{ result: PbqGradeResult; stages: StageScore[] } | null>(null);
  const [askingToLeave, setAskingToLeave] = useState(false);
  // Handlers read these rather than render state, so a second press in the same frame sees the first.
  const spotRef = useRef<Spot>(START);
  const answersRef = useRef<Record<string, SimFieldAnswer>>({});
  const creditRef = useRef<Record<string, number>>({});
  const started = useStarted(onStarted);

  const moveTo = useCallback((next: Spot) => {
    spotRef.current = next;
    setSpot(next);
  }, []);

  const onAnswer = useCallback((field: SimField, answer: SimFieldAnswer) => {
    const c = fieldCredit(field, answer);
    answersRef.current = { ...answersRef.current, [field.id]: answer };
    creditRef.current = { ...creditRef.current, [field.id]: c };
    setAnswers(answersRef.current);
    setCredit(creditRef.current);
  }, []);

  const onNext = useCallback(() => {
    const { stage, move } = spotRef.current;
    const current = stages[stage];
    if (move < current.fields.length - 1) {
      moveTo({ stage, move: move + 1, done: false });
      return;
    }
    const tally = stageTally(current, creditRef.current);
    track("sim_stage_cleared", {
      scenario_id: scenarioId,
      stage: stage + 1,
      stages: stages.length,
      correct: Math.round(tally.points),
      total: tally.total,
    });
    moveTo({ stage, move, done: true });
  }, [moveTo, scenarioId, stages]);

  const onStageNext = useCallback(() => {
    const { stage } = spotRef.current;
    if (stage < stages.length - 1) {
      moveTo({ stage: stage + 1, move: 0, done: false });
      return;
    }
    const result = grade(answersRef.current);
    setGraded(result);
    onGraded?.(result.result);
  }, [grade, moveTo, onGraded, stages.length]);

  function playAgain() {
    answersRef.current = {};
    creditRef.current = {};
    setAnswers({});
    setCredit({});
    setGraded(null);
    moveTo(START);
    setRun((r) => r + 1);
  }

  function leave() {
    if (confirmLeave && Object.keys(answersRef.current).length > 0 && !graded) setAskingToLeave(true);
    else onBack();
  }

  // The question closes before the lab is left: a host that keeps the lab on
  // its page would otherwise leave it open, with the focus held inside it.
  function leaveAfterAsking() {
    setAskingToLeave(false);
    onBack();
  }

  // Keep what changed in view: a new stage from its top (its case is new), a
  // new move or the stage's card where it starts, the score from the top.
  useKeepInView(`${run}:${spot.stage}:${spot.move}:${spot.done}:${Boolean(graded)}`, () =>
    graded ? root.current : spot.move === 0 && !spot.done ? hud.current : play.current
  );

  if (stages.length === 0) return null;
  const stage = stages[Math.min(spot.stage, stages.length - 1)];
  const field = stage.fields[Math.min(spot.move, stage.fields.length - 1)];
  const missed = stages.flatMap((s) => s.fields.filter((f) => (credit[f.id] ?? 0) < 1));

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <ConfirmDialog
        open={askingToLeave}
        title="Do you want to leave this lab?"
        message="Your answers so far will not be kept."
        confirmLabel="Leave the lab"
        cancelLabel="Stay in the lab"
        onConfirm={leaveAfterAsking}
        onCancel={() => setAskingToLeave(false)}
      />
      <LabHeader title={title} subtitle={subtitle} onBack={leave} backLabel={backLabel} takeFocus={takeFocus} />

      {graded ? (
        <LabResult
          result={graded.result}
          summary={`You earned ${graded.result.correctItems} of ${graded.result.totalItems} points, including partial credit.`}
          rows={stages.map((s, i) => ({
            id: s.id,
            title: s.title,
            correct: graded.stages[i]?.correct ?? 0,
            total: graded.stages[i]?.total ?? 0,
            credits: s.fields.map((f) => credit[f.id]),
          }))}
          missCount={missed.length}
          misses={<FieldMisses fields={missed} answers={answers} />}
          explanation={explanation}
          upsell={upsell}
          backLabel={backLabel}
          onRetry={playAgain}
          onBack={onBack}
        />
      ) : (
        <>
          <div ref={hud}>
            <Hud stages={stages} spot={spot} credit={credit} noun={noun} />
          </div>
          {renderCase({ stage: spot.stage, done: spot.done, run, credit })}
          <div ref={play} className="min-w-0 pt-1">
            {spot.done ? (
              <StageCard
                key={`${run}-${spot.stage}-done`}
                stage={stage}
                noun={noun}
                index={spot.stage}
                count={stages.length}
                credit={credit}
                last={spot.stage === stages.length - 1}
                onNext={onStageNext}
              />
            ) : (
              <SimMove
                key={`${run}-${field.id}`}
                field={field}
                takeFocus={!(run === 0 && spot.stage === 0 && spot.move === 0)}
                onStep={started}
                onAnswer={(answer) => onAnswer(field, answer)}
                onNext={onNext}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Tells the host that play has started, once for each lab that is opened: the
 * returned function may be called at every answer and passes only the first on.
 */
export function useStarted(onStarted: (() => void) | undefined): () => void {
  const told = useRef(false);
  const latest = useRef(onStarted);
  useEffect(() => {
    latest.current = onStarted;
  }, [onStarted]);
  return useCallback(() => {
    if (told.current) return;
    told.current = true;
    latest.current?.();
  }, []);
}

/**
 * Bring an element back into view when `at` changes (never on the first
 * render): when it has scrolled up under the page's header, scroll it to the
 * top. Nothing moves while it's already in view.
 */
export function useKeepInView(at: string, target: () => HTMLElement | null) {
  const shownAt = useRef(at);
  const pick = useRef(target);
  useEffect(() => {
    pick.current = target;
  });
  useEffect(() => {
    if (shownAt.current === at) return;
    shownAt.current = at;
    const el = pick.current();
    if (!el || el.getBoundingClientRect().top >= HEADER_CLEARANCE) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
  }, [at]);
}

/* ------------------------------------------------------------------ */
/*  The run's scoreboard                                               */
/* ------------------------------------------------------------------ */

/**
 * Where the run is: the stage, and a segment per move, grouped by stage and
 * filled by the credit it earned.
 */
export function Hud({
  stages,
  spot,
  credit,
  noun,
}: {
  stages: readonly LabStage[];
  spot: Spot;
  credit: Readonly<Record<string, number>>;
  noun: string;
}) {
  const stage = stages[spot.stage];
  const moves = stages.reduce((n, s) => n + s.fields.length, 0);
  const answered = stages.reduce((n, s) => n + s.fields.filter((f) => credit[f.id] !== undefined).length, 0);
  return (
    <div className="grid gap-2.5">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        {/* The stage's name wraps: cut short, it could not be read at a large zoom. */}
        <p className="cb-label min-w-0 text-muted-foreground">
          {noun} {spot.stage + 1} of {stages.length}: {stage.title}
        </p>
        <span className="shrink-0 text-note tabular-nums text-muted-foreground">
          {answered} of {moves} answered
        </span>
      </div>
      <div className="flex gap-2" aria-hidden>
        {stages.map((s, i) => (
          <div key={s.id} className="flex min-w-0 gap-1" style={{ flex: `${s.fields.length} 1 0%` }}>
            {s.fields.map((f, m) => (
              <Segment key={f.id} credit={credit[f.id]} current={i === spot.stage && m === spot.move && !spot.done} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * A move's segment: the page's blue while it is being played, then green for
 * the share of credit it earned over red for the share it missed, the colours
 * its answer was marked in. A rule drawn thick, with square ends, at its final
 * length: nothing here grows or sweeps.
 */
export function Segment({ credit, current = false }: { credit: number | undefined; current?: boolean }) {
  if (credit === undefined) {
    return <span className={cn("h-1.5 min-w-0 flex-1 rounded-xs", current ? "bg-primary" : "bg-foreground/[0.12]")} />;
  }
  return (
    <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-xs bg-destructive">
      <span
        className="absolute inset-0 origin-left bg-success"
        style={{ transform: `scaleX(${Math.max(0, Math.min(1, credit))})` }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  End of a stage                                                     */
/* ------------------------------------------------------------------ */

/** A stage's score in a sentence, its explanation folded away, and the way on. */
export function StageCard({
  stage,
  noun,
  index,
  count,
  credit,
  last,
  onNext,
}: {
  stage: LabStage;
  noun: string;
  index: number;
  count: number;
  credit: Readonly<Record<string, number>>;
  last: boolean;
  onNext: () => void;
}) {
  const tally = stageTally(stage, credit);
  const button = useRef<HTMLButtonElement>(null);
  const scoreId = useId();
  // Once only: a double click mustn't skip a stage or grade the lab twice.
  const went = useRef(false);
  const go = useCallback(() => {
    if (went.current) return;
    went.current = true;
    onNext();
  }, [onNext]);

  // The way on takes the focus, and the stage's score is its description, so
  // a screen reader reads the score with the button.
  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, []);

  // Enter moves on while the focus is on the card itself. On a control it does
  // what the control does (a button presses itself, the fold opens).
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "BUTTON" || tag === "SUMMARY" || tag === "A" || tag === "INPUT") return;
    e.preventDefault();
    go();
  }

  return (
    <div
      // Focusable by a press anywhere on the card, so Enter then acts on it.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="path-rise grid gap-4 rounded-lg border border-border bg-card p-5 sm:p-6"
    >
      <div id={scoreId} className="grid min-w-0 gap-1">
        <p className="cb-label text-muted-foreground">
          {noun} {index + 1} of {count} complete
        </p>
        <p className="cb-statement">{stageSentence(tally)}</p>
      </div>
      <div className="flex gap-1" aria-hidden>
        {stage.fields.map((f) => (
          <Segment key={f.id} credit={credit[f.id]} />
        ))}
      </div>
      <Fold summary="Why these answers are correct">{stage.explanation}</Fold>
      <Button
        ref={button}
        size="lg"
        aria-describedby={scoreId}
        className="w-full sm:w-auto sm:justify-self-start"
        onClick={go}
      >
        {last ? "View my score" : `Next ${noun.toLowerCase()}`}
        <ArrowRight />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  End of a lab                                                       */
/* ------------------------------------------------------------------ */

/** A lab's verdict in each band of its score, in the lab's own words. */
export interface LabVerdicts {
  ready: string;
  close: string;
  work: string;
}

const SOLVED: LabVerdicts = { ready: "Solved", close: "Partly solved", work: "Not yet solved" };

/**
 * A lab's score, drawn the way every score on CertBench is: the figure, its
 * verdict and a bar at its final length (ScoreLevel). The bands are the
 * site's own (`bandFor`), so a lab and a practice exam agree on where they
 * fall; the words are the lab's. There is no readiness target on the bar: one
 * lab is too small a sample to call anyone ready for an exam.
 */
export function LabScore({
  score,
  verdicts = SOLVED,
  summary,
}: {
  score: number;
  verdicts?: LabVerdicts;
  /** A sentence saying what the score counts: "You earned 7 of 9 points, including partial credit." */
  summary: string;
}) {
  const band = bandFor(score);
  const label = band.key === "ready" ? verdicts.ready : band.key === "close" ? verdicts.close : verdicts.work;
  return (
    <div className="grid gap-3 rounded-lg border border-border bg-card p-5 sm:p-6">
      <ScoreLevel score={score} band={{ ...band, label }} caption="Lab score" readyMark={false} />
      <p className="text-small text-muted-foreground">{summary}</p>
    </div>
  );
}

export interface ResultRow {
  id: string;
  title: string;
  correct: number;
  total: number;
  /** One segment per move, by the credit it earned. */
  credits?: (number | undefined)[];
}

/**
 * The end of a lab: its score, each stage's line, then what to look at again
 * and what the lab teaches, both folded away, the offer where the host passes
 * one, and the way to play again.
 */
export function LabResult({
  result,
  summary,
  rows,
  missCount = 0,
  misses,
  missesSummary,
  explanation,
  upsell,
  backLabel,
  onRetry,
  onBack,
}: {
  result: PbqGradeResult;
  /** A sentence saying what the score counts (see LabScore). */
  summary: string;
  rows?: ResultRow[];
  missCount?: number;
  misses?: ReactNode;
  /** The folded list's own title, where "The 2 answers to review" would not say what it holds. */
  missesSummary?: string;
  explanation: string;
  upsell?: PbqUpsell;
  backLabel?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const top = useRef<HTMLDivElement>(null);

  // The score takes the focus so that it is read; it is not a control.
  useEffect(() => {
    top.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={top} tabIndex={-1} role="group" aria-label="Your score" className="path-rise grid gap-5">
      <LabScore score={result.score} summary={summary} />

      {rows && rows.length > 0 && (
        <ul className="grid gap-3">
          {rows.map((r, i) => (
            <li key={r.id} className="grid min-w-0 gap-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
                <span className="min-w-0">
                  <span className="mr-2 text-note tabular-nums text-muted-foreground">{i + 1}</span>
                  {r.title}
                </span>
                <span className="shrink-0 text-note tabular-nums text-muted-foreground">
                  {r.correct} of {r.total}
                  <span className="sr-only"> points</span>
                </span>
              </div>
              {r.credits && (
                <div className="flex gap-1" aria-hidden>
                  {r.credits.map((c, k) => (
                    <Segment key={k} credit={c} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {missCount > 0 && misses && (
        <Fold summary={missesSummary ?? (missCount === 1 ? "The answer to review" : `The ${missCount} answers to review`)}>
          {misses}
        </Fold>
      )}

      <Fold summary="What this lab teaches">{explanation}</Fold>

      {upsell && <PbqUpsellCard upsell={upsell} />}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onRetry}>
          <RotateCcw />
          Repeat the lab
        </Button>
        <Button variant="outline" onClick={onBack}>
          {backLabel ?? "Return to the scenarios"}
        </Button>
      </div>
    </div>
  );
}

/** Missed fields, each with what it should have been. */
export function FieldMisses({
  fields,
  answers,
}: {
  fields: readonly SimField[];
  answers: Readonly<Record<string, SimFieldAnswer>>;
}) {
  return (
    <ol className="mt-1 grid gap-2.5">
      {fields.map((f) => (
        <li key={f.id} className="grid gap-1.5 rounded-lg border border-border p-3">
          <p className="font-medium leading-snug text-foreground">{f.type === "select-many" ? callPrompt(f.label) : f.label}</p>
          <MissDetail field={f} answer={answers[f.id]} />
        </li>
      ))}
    </ol>
  );
}

/** What a missed field should have been, in as few words as it takes. */
function MissDetail({ field, answer }: { field: SimField; answer: SimFieldAnswer | undefined }) {
  switch (field.type) {
    case "dropdown":
    case "text": {
      const yours =
        field.type === "dropdown"
          ? answer?.type === "dropdown"
            ? field.options[answer.selectedIndex]
            : undefined
          : answer?.type === "text"
            ? answer.value.trim()
            : undefined;
      return (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Should>{answerText(field)}</Should>
          {yours && (
            <span className="min-w-0 text-muted-foreground line-through decoration-destructive/60 [overflow-wrap:anywhere]">
              <span className="sr-only">Your answer: </span>
              {yours}
            </span>
          )}
        </p>
      );
    }
    case "select-many": {
      const said = new Set(answer?.type === "select-many" ? answer.selectedIndices : []);
      const yes = new Set(field.correctIndices);
      const wrong = field.options.map((o, i) => ({ o, yes: yes.has(i) })).filter((x, i) => x.yes !== said.has(i));
      return (
        <ul className="grid gap-1">
          {wrong.map((x) => (
            <li key={x.o} className="flex items-baseline justify-between gap-3">
              <span className="min-w-0">{x.o}</span>
              <Should>{x.yes ? "Yes" : "No"}</Should>
            </li>
          ))}
        </ul>
      );
    }
    case "zone-placement": {
      const placed = answer?.type === "zone-placement" ? answer.placements : [];
      const wrong = field.items
        .map((item, i) => ({ item, zone: field.zones[field.correctZones[i]], ok: placed[i] === field.correctZones[i] }))
        .filter((x) => !x.ok);
      return <PairList pairs={wrong.map((x) => [x.item, x.zone])} />;
    }
  }
}

/** Each missed item beside what it belongs with: a sort's or a match's misses. */
export function PairList({ pairs }: { pairs: readonly (readonly [string, string])[] }) {
  return (
    <ul className="grid gap-1">
      {pairs.map(([left, right], i) => (
        <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="min-w-0">{left}</span>
          <Should>{right}</Should>
        </li>
      ))}
    </ul>
  );
}

/**
 * The correct answer, ticked, and said to be so to a screen reader. It is
 * never wider than its row: a long answer ("CVE-2024-38428 (OpenSSL RCE,
 * 9.8)") wraps inside its card on a phone. A short one ("Yes") keeps its width
 * beside a long line.
 */
export function Should({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex max-w-full shrink-0 items-baseline gap-1 font-medium text-success [overflow-wrap:anywhere]">
      <Check className="size-3.5 translate-y-0.5" strokeWidth={3} aria-hidden />
      <span className="sr-only">Correct answer: </span>
      {children}
    </span>
  );
}

/** Text that's there for whoever wants it, folded away for whoever doesn't. */
export function Fold({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border px-4 py-3 text-small text-muted-foreground">
      {/* The summary fills the box's height, so the whole row opens it under a thumb. */}
      <summary className="-my-3 flex cursor-pointer select-none list-none items-center justify-between gap-3 py-3 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2.5 leading-relaxed">{children}</div>
    </details>
  );
}
