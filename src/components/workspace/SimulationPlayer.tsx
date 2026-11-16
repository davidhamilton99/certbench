"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Flame, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type {
  PbqGradeResult,
  SimField,
  SimFieldAnswer,
  SimTask,
  SimTaskGradeResult,
  SimulationScenario,
} from "@/data/pbq/types";
import { gradeSimulationScenario } from "@/core/pbq/grade-simulation";
import {
  answerText,
  callPrompt,
  fieldCredit,
  playableStages,
  stageTally,
  stageTitle,
} from "@/core/pbq/sim-play";
import { useKeyboardTurn } from "@/components/path/keyboard-turn";
import { PbqUpsellCard, type PbqUpsell } from "@/components/workspace/pbq-upsell";
import type { PbqHostProps } from "@/components/workspace/pbq-host";
import { CaseFile } from "@/components/workspace/SimCaseFile";
import { SimMove } from "@/components/workspace/SimMoves";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Room for a page's sticky header when part of the lab scrolls back into view. */
const HEADER_CLEARANCE = 72;

/** Where play is: a move in a stage, or the stage's done card once its last move is finished. */
interface Spot {
  stage: number;
  move: number;
  done: boolean;
}

const START: Spot = { stage: 0, move: 0, done: false };

/**
 * A simulation lab, played rather than filled in. Each task is a stage and
 * each of its questions a move, marked the moment it's answered: tiles for a
 * pick, a yes or no on each option of a pick-all, a sort into bins for a
 * placement. The briefing and the stage's evidence sit above as a case file.
 * A stage ends on its score and the explanation, folded; the lab ends on the
 * score the grader gives, partial credit and all, the same as it always was.
 *
 * Replays (Nov 16, 2026) showed why: a visitor did a lab's second task, found
 * "Submit All Answers" greyed out until the first task's dropdowns were
 * filled, went back to a wall of text and left with no score, while the
 * tap-to-order and matching labs on the same page were finished and replayed.
 */
export function SimulationPlayer({
  scenario,
  onBack,
  upsell,
  onGraded,
  backLabel,
}: {
  scenario: SimulationScenario;
  onBack: () => void;
  upsell?: PbqUpsell;
} & PbqHostProps) {
  const stages = useMemo(() => playableStages(scenario.tasks), [scenario.tasks]);
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
  const [graded, setGraded] = useState<{ result: PbqGradeResult; taskResults: SimTaskGradeResult[] } | null>(null);
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
    const task = stages[stage];
    if (move < task.fields.length - 1) {
      moveTo({ stage, move: move + 1, done: false });
      return;
    }
    const tally = stageTally(task, creditRef.current);
    track("sim_stage_cleared", {
      scenario_id: scenario.id,
      stage: stage + 1,
      stages: stages.length,
      correct: Math.round(tally.points),
      total: tally.total,
    });
    moveTo({ stage, move, done: true });
  }, [moveTo, scenario.id, stages]);

  const onStageNext = useCallback(() => {
    const { stage } = spotRef.current;
    if (stage < stages.length - 1) {
      moveTo({ stage: stage + 1, move: 0, done: false });
      return;
    }
    const result = gradeSimulationScenario(scenario, answersRef.current);
    setGraded(result);
    onGraded?.(result.result);
  }, [moveTo, onGraded, scenario, stages.length]);

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

  // Keep what changed in view: a new stage from its top (its evidence is new),
  // a new move or the stage's card where it starts, the score from the top.
  // Only on a change of place, never on the first render.
  const shownAt = useRef(`${run}:${spot.stage}:${spot.move}:${spot.done}:${Boolean(graded)}`);
  useEffect(() => {
    const at = `${run}:${spot.stage}:${spot.move}:${spot.done}:${Boolean(graded)}`;
    if (shownAt.current === at) return;
    shownAt.current = at;
    const target = graded ? root.current : spot.move === 0 && !spot.done ? hud.current : play.current;
    if (!target || target.getBoundingClientRect().top >= HEADER_CLEARANCE) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
  }, [spot, graded, run]);

  if (stages.length === 0) return null;
  const task = stages[Math.min(spot.stage, stages.length - 1)];
  const field = task.fields[Math.min(spot.move, task.fields.length - 1)];
  const lastStage = spot.stage === stages.length - 1;

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

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={leave}
          aria-label={backLabel ?? "Back to scenarios"}
          className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold leading-snug">{scenario.title}</h2>
          <p className="text-[13px] text-muted-foreground">
            {scenario.domain_number} {scenario.domain_title}
          </p>
        </div>
      </div>

      {graded ? (
        <Results
          scenario={scenario}
          stages={stages}
          result={graded.result}
          taskResults={graded.taskResults}
          answers={answers}
          credit={credit}
          upsell={upsell}
          backLabel={backLabel}
          onRetry={playAgain}
          onBack={onBack}
        />
      ) : (
        <>
          <div ref={hud} className="scroll-mt-24">
            <Hud stages={stages} spot={spot} credit={credit} streak={streak} />
          </div>
          <CaseFile key={`${run}-${spot.stage}`} briefing={scenario.briefing} evidence={task.evidence} />
          <div ref={play} className="min-w-0 scroll-mt-24 pt-1">
            {spot.done ? (
              <StageCard
                key={`${run}-${spot.stage}-done`}
                task={task}
                index={spot.stage}
                count={stages.length}
                credit={credit}
                last={lastStage}
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

/* ------------------------------------------------------------------ */
/*  The run's scoreboard                                               */
/* ------------------------------------------------------------------ */

/**
 * Where the run is: the stage, a streak once three in a row are right, and a
 * segment per move, grouped by stage and filled by the credit it earned.
 */
function Hud({
  stages,
  spot,
  credit,
  streak,
}: {
  stages: readonly SimTask[];
  spot: Spot;
  credit: Readonly<Record<string, number>>;
  streak: number;
}) {
  const task = stages[spot.stage];
  const moves = stages.reduce((n, t) => n + t.fields.length, 0);
  const answered = stages.reduce((n, t) => n + t.fields.filter((f) => credit[f.id] !== undefined).length, 0);
  return (
    <div className="grid gap-2.5">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Stage {spot.stage + 1} of {stages.length} · {stageTitle(task.title)}
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
        {stages.map((t, s) => (
          <div key={t.id} className="flex min-w-0 gap-1" style={{ flex: `${t.fields.length} 1 0%` }}>
            {t.fields.map((f, m) => (
              <Segment
                key={f.id}
                credit={credit[f.id]}
                current={s === spot.stage && m === spot.move && !spot.done}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** A move's segment: lit while it's being played, then filled green by the share it earned. */
function Segment({ credit, current = false }: { credit: number | undefined; current?: boolean }) {
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
function StageCard({
  task,
  index,
  count,
  credit,
  last,
  keyboard,
  onNext,
}: {
  task: SimTask;
  index: number;
  count: number;
  credit: Readonly<Record<string, number>>;
  last: boolean;
  keyboard: boolean;
  onNext: () => void;
}) {
  const tally = stageTally(task, credit);
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
            Stage {index + 1} of {count} done
          </p>
          <p className="font-display text-xl font-semibold tracking-tight">
            {perfect && tally.moves > 1 ? `All ${tally.moves} right` : `${tally.right} of ${tally.moves} right`}
            {tally.partly > 0 && <span className="text-muted-foreground"> · {tally.partly} partly</span>}
          </p>
        </div>
      </div>
      <div className="flex gap-1" aria-hidden>
        {task.fields.map((f) => (
          <Segment key={f.id} credit={credit[f.id]} />
        ))}
      </div>
      <Fold summary="Why these are the answers">{task.explanation}</Fold>
      <Button ref={button} size="lg" className="h-12 w-full px-6 text-base sm:w-auto sm:justify-self-start" onClick={go}>
        {last ? "See my score" : "Next stage"}
        <ArrowRight />
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  End of the lab                                                     */
/* ------------------------------------------------------------------ */

function Results({
  scenario,
  stages,
  result,
  taskResults,
  answers,
  credit,
  upsell,
  backLabel,
  onRetry,
  onBack,
}: {
  scenario: SimulationScenario;
  stages: readonly SimTask[];
  result: PbqGradeResult;
  taskResults: readonly SimTaskGradeResult[];
  answers: Readonly<Record<string, SimFieldAnswer>>;
  credit: Readonly<Record<string, number>>;
  upsell?: PbqUpsell;
  backLabel?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const tone = result.score >= 75 ? "success" : result.score >= 40 ? "warning" : "danger";
  const verdict = result.score >= 75 ? "Solved" : result.score >= 40 ? "Partly solved" : "Not solved yet";
  const misses = stages.flatMap((t) => t.fields.filter((f) => (credit[f.id] ?? 0) < 1));
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
          <p className="text-sm text-muted-foreground">points, partial credit included</p>
        </div>
      </div>

      <ul className="grid gap-3">
        {stages.map((t, s) => {
          // The grader reports every task in order, stages being the ones with questions.
          const tr = taskResults[scenario.tasks.indexOf(t)];
          return (
            <li key={t.id} className="grid min-w-0 gap-1.5">
              <div className="flex min-w-0 items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate">
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{s + 1}</span>
                  {stageTitle(t.title)}
                </span>
                {tr && (
                  <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                    {tr.correctFields}/{tr.totalFields}
                  </span>
                )}
              </div>
              <div className="flex gap-1" aria-hidden>
                {t.fields.map((f) => (
                  <Segment key={f.id} credit={credit[f.id]} />
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      {misses.length > 0 && (
        <Fold summary={misses.length === 1 ? "The one to look at again" : `The ${misses.length} to look at again`}>
          <ol className="mt-1 grid gap-2.5">
            {misses.map((f) => (
              <li key={f.id} className="grid gap-1.5 rounded-xl border border-border/70 bg-card/60 p-3">
                <p className="font-medium leading-snug text-foreground">
                  {f.type === "select-many" ? callPrompt(f.label) : f.label}
                </p>
                <MissDetail field={f} answer={answers[f.id]} />
              </li>
            ))}
          </ol>
        </Fold>
      )}

      <Fold summary="What this lab teaches">{scenario.explanation}</Fold>

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

/** What a missed move should have been, in as few words as it takes. */
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
      return (
        <ul className="grid gap-1">
          {wrong.map((x) => (
            <li key={x.item} className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="min-w-0">{x.item}</span>
              <Should>{x.zone}</Should>
            </li>
          ))}
        </ul>
      );
    }
  }
}

function Should({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-baseline gap-1 font-medium text-success">
      <Check className="size-3.5 translate-y-0.5" strokeWidth={3} aria-hidden />
      {children}
    </span>
  );
}

/** Text that's there for whoever wants it, folded away for whoever doesn't. */
function Fold({ summary, children }: { summary: string; children: ReactNode }) {
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
function ScoreRing({ score, tone }: { score: number; tone: "success" | "warning" | "danger" }) {
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
