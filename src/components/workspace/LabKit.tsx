"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PbqGradeResult, SimField, SimFieldAnswer } from "@/data/pbq/types";
import { answerText, callPrompt, fieldCredit, stageTally } from "@/core/pbq/sim-play";
import { useKeyboardTurn } from "@/components/path/keyboard-turn";
import { PbqUpsellCard, type PbqUpsell } from "@/components/workspace/pbq-upsell";
import { SimMove } from "@/components/workspace/SimMoves";
import { track } from "@/lib/analytics";
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
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
  backLabel?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label={backLabel ?? "Back to scenarios"}
        className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-5" />
      </button>
      <div className="min-w-0">
        <h2 className="text-lg font-semibold leading-snug">{title}</h2>
        <p className="text-[13px] text-muted-foreground">{subtitle}</p>
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
  onGraded?: (result: PbqGradeResult) => void;
  backLabel?: string;
}) {
  const turnId = useId();
  const root = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const play = useRef<HTMLDivElement>(null);
  const keyboard = useKeyboardTurn(turnId, root);

  const [run, setRun] = useState(0);
  const [spot, setSpot] = useState<Spot>(START);
  const [answers, setAnswers] = useState<Record<string, SimFieldAnswer>>({});
  const [credit, setCredit] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [graded, setGraded] = useState<{ result: PbqGradeResult; stages: StageScore[] } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Handlers read these rather than render state: a move can move on from a timer.
  const spotRef = useRef<Spot>(START);
  const answersRef = useRef<Record<string, SimFieldAnswer>>({});
  const creditRef = useRef<Record<string, number>>({});

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
    setStreak((s) => (c >= 1 ? s + 1 : 0));
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
    setStreak(0);
    setGraded(null);
    moveTo(START);
    setRun((r) => r + 1);
  }

  function leave() {
    if (Object.keys(answersRef.current).length > 0 && !graded) setConfirmLeave(true);
    else onBack();
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
    <div ref={root} className="flex min-w-0 scroll-mt-24 flex-col gap-4 sm:gap-5">
      <ConfirmDialog
        open={confirmLeave}
        title="Leave this lab?"
        message="Your answers so far won't be kept."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={onBack}
        onCancel={() => setConfirmLeave(false)}
      />
      <LabHeader title={title} subtitle={subtitle} onBack={leave} backLabel={backLabel} />

      {graded ? (
        <LabResult
          result={graded.result}
          unit="points, partial credit included"
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
          <div ref={hud} className="scroll-mt-24">
            <Hud stages={stages} spot={spot} credit={credit} streak={streak} noun={noun} />
          </div>
          {renderCase({ stage: spot.stage, done: spot.done, run, credit })}
          <div ref={play} className="min-w-0 scroll-mt-24 pt-1">
            {spot.done ? (
              <StageCard
                key={`${run}-${spot.stage}-done`}
                stage={stage}
                noun={noun}
                index={spot.stage}
                count={stages.length}
                credit={credit}
                last={spot.stage === stages.length - 1}
                keyboard={keyboard}
                onNext={onStageNext}
              />
            ) : (
              <SimMove
                key={`${run}-${field.id}`}
                field={field}
                keyboard={keyboard}
                takeFocus={!(run === 0 && spot.stage === 0 && spot.move === 0)}
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
 * Where the run is: the stage, a streak once three in a row are right, and a
 * segment per move, grouped by stage and filled by the credit it earned.
 */
export function Hud({
  stages,
  spot,
  credit,
  streak,
  noun,
}: {
  stages: readonly LabStage[];
  spot: Spot;
  credit: Readonly<Record<string, number>>;
  streak: number;
  noun: string;
}) {
  const stage = stages[spot.stage];
  const moves = stages.reduce((n, s) => n + s.fields.length, 0);
  const answered = stages.reduce((n, s) => n + s.fields.filter((f) => credit[f.id] !== undefined).length, 0);
  return (
    <div className="grid gap-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {noun} {spot.stage + 1} of {stages.length} · {stage.title}
        </p>
        <div className="flex shrink-0 items-center gap-2.5">
          {streak >= 3 && (
            <span
              key={streak}
              className="path-pop inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-700 dark:text-amber-300"
            >
              <Flame className="size-3.5" aria-hidden />
              {streak} in a row
            </span>
          )}
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {answered}/{moves}
            <span className="sr-only"> answered</span>
          </span>
        </div>
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

/** A move's segment: lit while it's being played, then filled green by the share it earned. */
export function Segment({ credit, current = false }: { credit: number | undefined; current?: boolean }) {
  if (credit === undefined) {
    return (
      <span
        className={cn("h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-300", current ? "bg-primary" : "bg-muted")}
      />
    );
  }
  return (
    <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-warning">
      <span
        className="absolute inset-y-0 left-0 rounded-full bg-success"
        style={{ width: `${Math.round(Math.max(0, Math.min(1, credit)) * 100)}%` }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  End of a stage                                                     */
/* ------------------------------------------------------------------ */

/** A stage's score, its explanation folded away, and the way on. */
export function StageCard({
  stage,
  noun,
  index,
  count,
  credit,
  last,
  keyboard,
  onNext,
}: {
  stage: LabStage;
  noun: string;
  index: number;
  count: number;
  credit: Readonly<Record<string, number>>;
  last: boolean;
  keyboard: boolean;
  onNext: () => void;
}) {
  const tally = stageTally(stage, credit);
  const perfect = tally.right === tally.moves;
  const button = useRef<HTMLButtonElement>(null);
  // Once only: a double click mustn't skip a stage or grade the lab twice.
  const went = useRef(false);
  const go = useCallback(() => {
    if (went.current) return;
    went.current = true;
    onNext();
  }, [onNext]);

  useEffect(() => {
    button.current?.focus({ preventScroll: true });
  }, []);

  // Enter moves on from anywhere but a control (a button clicks itself, the fold toggles).
  useEffect(() => {
    if (!keyboard) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter" || e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "BUTTON" || tag === "SUMMARY" || tag === "A" || tag === "INPUT") return;
      e.preventDefault();
      go();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [keyboard, go]);

  return (
    <div className="path-rise grid gap-4 rounded-2xl border border-border bg-card/80 p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn(
            "path-pop flex size-11 shrink-0 items-center justify-center rounded-full",
            perfect ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
          )}
        >
          {perfect ? <Check className="size-5" strokeWidth={3} /> : <span className="font-mono text-sm font-semibold">{index + 1}</span>}
        </span>
        <div className="grid min-w-0 gap-0.5" role="status">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {noun} {index + 1} of {count} done
          </p>
          <p className="font-display text-xl font-semibold tracking-tight">
            {perfect && tally.moves > 1 ? `All ${tally.moves} right` : `${tally.right} of ${tally.moves} right`}
            {tally.partly > 0 && <span className="text-muted-foreground"> · {tally.partly} partly</span>}
          </p>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {stage.fields.map((f) => (
          <Segment key={f.id} credit={credit[f.id]} />
        ))}
      </div>
      <Fold summary="Why these are the answers">{stage.explanation}</Fold>
      <Button ref={button} size="lg" className="h-12 w-full px-6 text-base sm:w-auto sm:justify-self-start" onClick={go}>
        {last ? "See my score" : `Next ${noun.toLowerCase()}`}
        <ArrowRight />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  End of a lab                                                       */
/* ------------------------------------------------------------------ */

export interface ResultRow {
  id: string;
  title: string;
  correct: number;
  total: number;
  /** One segment per move, by the credit it earned. */
  credits?: (number | undefined)[];
}

/**
 * A lab's score: a ring that sweeps up to it, each stage's line, then what to
 * look at again and what the lab teaches, both folded away, the offer where
 * the host passes one, and the way to play again.
 */
export function LabResult({
  result,
  unit,
  rows,
  missCount = 0,
  misses,
  explanation,
  upsell,
  backLabel,
  onRetry,
  onBack,
}: {
  result: PbqGradeResult;
  /** Under "7 of 9": "points, partial credit included", "pairs matched"… */
  unit: string;
  rows?: ResultRow[];
  missCount?: number;
  misses?: ReactNode;
  explanation: string;
  upsell?: PbqUpsell;
  backLabel?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const tone = result.score >= 75 ? "success" : result.score >= 40 ? "warning" : "danger";
  const verdict = result.score >= 75 ? "Solved" : result.score >= 40 ? "Partly solved" : "Not solved yet";
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    top.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div ref={top} tabIndex={-1} role="group" aria-label="Your score" className="path-rise grid gap-5 outline-none">
      <div className="flex items-center gap-5 rounded-2xl border border-border bg-card/80 p-5 sm:p-6">
        <ScoreRing score={result.score} tone={tone} />
        <div className="grid min-w-0 gap-1">
          <p
            className={cn(
              "font-mono text-[11px] font-semibold uppercase tracking-[0.16em]",
              tone === "success" ? "text-success" : tone === "warning" ? "text-amber-700 dark:text-amber-300" : "text-destructive"
            )}
          >
            {verdict}
          </p>
          <p className="font-display text-3xl font-semibold tracking-tight">
            {result.correctItems} <span className="text-muted-foreground">of {result.totalItems}</span>
          </p>
          <p className="text-sm text-muted-foreground">{unit}</p>
        </div>
      </div>

      {rows && rows.length > 0 && (
        <ul className="grid gap-3">
          {rows.map((r, i) => (
            <li key={r.id} className="grid min-w-0 gap-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{i + 1}</span>
                  {r.title}
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                  {r.correct}/{r.total}
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
        <Fold summary={missCount === 1 ? "The one to look at again" : `The ${missCount} to look at again`}>{misses}</Fold>
      )}

      <Fold summary="What this lab teaches">{explanation}</Fold>

      {upsell && <PbqUpsellCard upsell={upsell} />}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onRetry}>
          <RotateCcw />
          Play again
        </Button>
        <Button variant="secondary" onClick={onBack}>
          {backLabel ?? "Back to scenarios"}
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
        <li key={f.id} className="grid gap-1.5 rounded-xl border border-border/70 bg-card/60 p-3">
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
          {yours && <span className="text-muted-foreground line-through decoration-destructive/60">{yours}</span>}
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

/** "This → that" lines, the right side ticked: a sort's or a match's misses. */
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

export function Should({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 font-medium text-success">
      <Check className="size-3.5 translate-y-0.5" strokeWidth={3} aria-hidden />
      {children}
    </span>
  );
}

/** Text that's there for whoever wants it, folded away for whoever doesn't. */
export function Fold({ summary, children }: { summary: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border/70 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
      <summary className="flex cursor-pointer select-none list-none items-center justify-between gap-3 font-medium text-foreground [&::-webkit-details-marker]:hidden">
        {summary}
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-2.5 leading-relaxed">{children}</div>
    </details>
  );
}

/** The score as a ring that sweeps up to it. */
export function ScoreRing({ score, tone }: { score: number; tone: "success" | "warning" | "danger" }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const stroke = tone === "success" ? "var(--success)" : tone === "warning" ? "var(--warning)" : "var(--destructive)";
  return (
    <div className="relative size-20 shrink-0 sm:size-24" role="img" aria-label={`${score}%`}>
      <svg viewBox="0 0 80 80" className="size-full -rotate-90" aria-hidden>
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="7" className="stroke-muted" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={stroke}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
          className="animate-gauge"
          style={{ "--gauge-track": c } as CSSProperties}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-semibold tabular-nums sm:text-xl">
        {score}%
      </span>
    </div>
  );
}

/** A one-move lab's root: keys for its turn, and the score kept in view once it's up. */
export function useLabTurn(): { root: RefObject<HTMLDivElement | null>; keyboard: boolean } {
  const turnId = useId();
  const root = useRef<HTMLDivElement>(null);
  const keyboard = useKeyboardTurn(turnId, root);
  return { root, keyboard };
}
