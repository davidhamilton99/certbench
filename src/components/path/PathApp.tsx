"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { getPathStop, recordPathAnswers } from "@/contracts/path";
import { completeOnboarding, updateExamDate } from "@/contracts/user";
import { ApiError } from "@/contracts/common";
import { stopAt } from "@/core/path/plan";
import {
  hasStarted,
  missedIds,
  nextStopIndex,
  objectiveStatuses,
  seenIds,
  stopsDone,
} from "@/core/path/progress";
import { questionIdOf } from "@/core/path/rep-id";
import { scoreCheckpoint, type CheckpointAnswer } from "@/core/path/checkpoint";
import type { ObjectiveStatus, PathCert, PathPlan, PathStop, PathStructure, Rep } from "@/core/path/types";
import { Button } from "@/components/ui/button";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { ExamMap, MapLegend } from "./ExamMap";
import { RepCard, StopProgress, type RepAnswer } from "./RepCard";
import { PathHeader } from "./PathHeader";
import { PathOffer } from "./PathOffer";
import { PathReveal } from "./PathReveal";
import { GoalStep } from "./GoalStep";
import { usePathProgress } from "./usePathProgress";
import { cn } from "@/lib/utils";

interface Play {
  stop: PathStop;
  reps: Rep[];
  i: number;
  results: (boolean | null)[];
  /** Bank answers to record against the account at the end of the stop. */
  bank: Map<string, number>;
  checkpoint: CheckpointAnswer[];
  /** Objective statuses before the stop, to animate what it changed. */
  before: Map<string, ObjectiveStatus>;
}

type View =
  | { kind: "play" }
  | { kind: "home" }
  | { kind: "loading" }
  | { kind: "end"; stop: PathStop; correct: number; total: number; fresh: Set<string> }
  | { kind: "goal"; step: "exam" | "minutes"; then: number }
  | { kind: "intro"; index: number }
  | { kind: "reveal" }
  | { kind: "error"; message: string; retry: number };

const domainOf = (objective: string) =>
  objective.includes(".") ? `${objective.split(".")[0]}.0` : objective;

function stopLabel(stop: PathStop, total: number): string {
  switch (stop.kind) {
    case "warmup":
      return "Warm-up";
    case "checkpoint":
      return "Readiness checkpoint";
    case "review":
      return "Keep practicing";
    default:
      return `Stop ${stop.index + 1} of ${total}`;
  }
}

/**
 * The guided path for one exam. One screen at a time, one obvious move on
 * each: play a stop, see the map it lit up, continue. Between stops it saves
 * the map to an account, asks one goal question at a time, runs the readiness
 * checkpoint, and makes the one offer — and that's the whole product.
 */
export function PathApp({
  cert,
  structure,
  plan,
  warmup,
  questionCount,
}: {
  cert: PathCert;
  structure: PathStructure;
  plan: PathPlan;
  /** The warm-up, built on the server, so a first visit starts instantly. */
  warmup: { stop: PathStop; reps: Rep[] };
  questionCount: number;
}) {
  const p = usePathProgress(cert);
  const total = plan.stops.length;

  const freshPlay = useCallback(
    (stop: PathStop, reps: Rep[], before: Map<string, ObjectiveStatus>): Play => ({
      stop,
      reps,
      i: 0,
      results: reps.map(() => null),
      bank: new Map(),
      checkpoint: [],
      before,
    }),
    []
  );

  const [view, setView] = useState<View>({ kind: "play" });
  const [play, setPlayState] = useState<Play>(() => freshPlay(warmup.stop, warmup.reps, new Map()));
  // Handlers read the play through a ref, so a timer-driven "next" or an
  // answer-then-advance in one tick always sees the current rep.
  const playRef = useRef(play);
  const setPlay = useCallback((next: Play) => {
    playRef.current = next;
    setPlayState(next);
  }, []);

  // First paint is the warm-up (fast for first-time visitors and crawlers);
  // once the device's progress is known, a returning learner goes home.
  const booted = useRef(false);
  useEffect(() => {
    if (!p.ready || booted.current) return;
    booted.current = true;
    if (hasStarted(p.progress)) setView({ kind: "home" });
  }, [p.ready, p.progress]);

  const statuses = useMemo(() => objectiveStatuses(p.progress.items), [p.progress.items]);
  const next = nextStopIndex(plan, p.progress);
  const nextStop = stopAt(plan, structure, next);
  const remaining = total - stopsDone(plan, p.progress);
  const pro = p.access === "pro";

  const startStop = useCallback(
    async (index: number, opts?: { skipIntro?: boolean }) => {
      const stop = stopAt(plan, structure, index);
      if (!stop) return;
      // An account keeps the map; without one, the warm-up is the whole visit.
      if (index > 0 && !p.signedIn) {
        setView({ kind: "home" });
        return;
      }
      if (index > plan.freeThrough && !pro) {
        setView({ kind: "reveal" });
        return;
      }
      if (p.signedIn && index >= 2 && !p.progress.goal) {
        setView({ kind: "goal", step: "exam", then: index });
        return;
      }
      if (p.signedIn && index >= 3 && p.progress.goal?.minutes === null) {
        setView({ kind: "goal", step: "minutes", then: index });
        return;
      }
      if (stop.kind === "checkpoint" && !opts?.skipIntro) {
        setView({ kind: "intro", index });
        return;
      }

      setView({ kind: "loading" });
      try {
        const built = await api(getPathStop, {
          cert,
          index,
          seen: seenIds(p.progress.items),
          missed: missedIds(p.progress.items),
          run: p.progress.stops[stop.id]?.n ?? 0,
        });
        if (built.reps.length === 0) {
          p.finish(built.stop.id, 0, 0);
          setView({ kind: "home" });
          return;
        }
        setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(p.progress.items)));
        setView({ kind: "play" });
        window.scrollTo({ top: 0 });
      } catch (err) {
        if (err instanceof ApiError && err.code === "unauthorized") {
          setView({ kind: "home" });
        } else if (err instanceof ApiError && err.code === "quota_exceeded") {
          await p.refreshAccess();
          setView({ kind: "reveal" });
        } else {
          setView({
            kind: "error",
            message: err instanceof ApiError ? err.message : "Couldn't load your next stop.",
            retry: index,
          });
        }
      }
    },
    [cert, plan, structure, p, pro, freshPlay, setPlay]
  );

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const cur = playRef.current;
      const rep = cur.reps[cur.i];
      if (!rep || cur.results[cur.i] !== null) return;
      if (!hasStarted(p.progress)) track("path_started", { cert });
      p.record(rep.id, answer.correct);
      const results = [...cur.results];
      results[cur.i] = answer.correct;
      const bank = new Map(cur.bank);
      const qid = questionIdOf(rep.id);
      if (qid && answer.picked >= 0) bank.set(qid, answer.picked);
      const checkpoint =
        cur.stop.kind === "checkpoint"
          ? [...cur.checkpoint, { domain: domainOf(rep.objective), correct: answer.correct }]
          : cur.checkpoint;
      setPlay({ ...cur, results, bank, checkpoint });
    },
    [cert, p, setPlay]
  );

  const finishStop = useCallback(() => {
    const cur = playRef.current;
    const correct = cur.results.filter((r) => r === true).length;
    const totalReps = cur.reps.length;
    track("path_stop_completed", {
      cert,
      stop: cur.stop.id,
      index: cur.stop.index,
      kind: cur.stop.kind,
      correct,
      total: totalReps,
      signed_in: p.signedIn,
    });
    if (p.signedIn && cur.bank.size > 0) {
      const answers = [...cur.bank].map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
      void api(recordPathAnswers, { cert, answers }).catch(() => {});
    }
    if (cur.stop.kind === "checkpoint") {
      const result = scoreCheckpoint(cur.checkpoint, structure.domains, Date.now());
      p.finish(cur.stop.id, correct, totalReps, result);
      track("path_checkpoint_completed", { cert, score: result.score });
      setView({ kind: "reveal" });
    } else {
      p.finish(cur.stop.id, correct, totalReps);
      // Diff against the statuses as they are once this stop's answers count.
      setView({ kind: "end", stop: cur.stop, correct, total: totalReps, fresh: new Set() });
    }
    window.scrollTo({ top: 0 });
  }, [cert, p, structure.domains]);

  const onNext = useCallback(() => {
    const cur = playRef.current;
    if (cur.i < cur.reps.length - 1) setPlay({ ...cur, i: cur.i + 1 });
    else finishStop();
  }, [finishStop, setPlay]);

  // The stop-end map animates the objectives this stop changed.
  const endFresh = useMemo(() => {
    if (view.kind !== "end") return new Set<string>();
    const before = play.before;
    const changed = new Set<string>();
    for (const [code, status] of statuses) if (before.get(code) !== status) changed.add(code);
    return changed;
  }, [view.kind, play.before, statuses]);

  async function saveGoalExam(examDate: string | null, target: string | null) {
    p.setGoal({ examDate, target, minutes: null });
    track("path_goal_set", { cert, step: "exam", value: examDate ? "booked" : (target ?? "unknown") });
    if (p.certId) {
      // Enrol them in this exam (and set the date) so reminders and Pro line up.
      try {
        await api(completeOnboarding, { certId: p.certId, examDate });
        if (examDate) await api(updateExamDate, { certId: p.certId, examDate });
      } catch {
        /* the path doesn't depend on it — the goal is saved with their progress */
      }
    }
  }

  // ─── Screens ──────────────────────────────────────────────────────────────

  let screen: React.ReactNode;

  if (view.kind === "play") {
    const rep = play.reps[play.i];
    screen = (
      <div className="glass rounded-3xl p-5 sm:p-8">
        <div className="mb-6 grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {stopLabel(play.stop, total)}
              {play.stop.kind === "learn" && <span className="text-foreground"> · {play.stop.title}</span>}
              {play.stop.kind === "practice" && <span className="text-foreground"> · {play.stop.title}</span>}
            </p>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {play.i + 1} / {play.reps.length}
            </span>
          </div>
          <StopProgress results={play.results} current={play.i} />
        </div>
        {rep && <RepCard key={`${play.stop.id}-${play.i}-${rep.id}`} rep={rep} onAnswer={onAnswer} onNext={onNext} />}
      </div>
    );
  } else if (view.kind === "loading") {
    screen = (
      <div className="glass grid min-h-80 place-items-center rounded-3xl p-8 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Building your next stop…
        </span>
      </div>
    );
  } else if (view.kind === "error") {
    screen = (
      <div className="glass grid min-h-80 place-items-center gap-4 rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{view.message}</p>
        <Button onClick={() => startStop(view.retry, { skipIntro: true })}>
          <RotateCcw />
          Try again
        </Button>
      </div>
    );
  } else if (view.kind === "goal") {
    screen = (
      <div className="glass rounded-3xl p-6 sm:p-8">
        <GoalStep
          step={view.step}
          examName={structure.examName}
          onExam={async (examDate, target) => {
            await saveGoalExam(examDate, target);
            setView({ kind: "goal", step: "minutes", then: view.then });
          }}
          onMinutes={(minutes) => {
            p.setGoal({
              examDate: p.progress.goal?.examDate ?? null,
              target: p.progress.goal?.target ?? null,
              minutes,
            });
            track("path_goal_set", { cert, step: "minutes", value: String(minutes) });
            void startStopAfterGoal(view.then);
          }}
        />
      </div>
    );
  } else if (view.kind === "intro") {
    screen = (
      <div className="glass path-rise grid gap-5 rounded-3xl p-6 sm:p-8">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Stop {view.index + 1} · Readiness checkpoint
        </span>
        <h2 className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Now try it the way the exam asks.
        </h2>
        <p className="max-w-prose text-muted-foreground">
          Twelve exam-style questions from all {structure.domains.length} domains, weighted like the real{" "}
          {structure.examCode}. Some cover ground you haven&apos;t reached yet. That&apos;s the point: it
          shows where you stand across the whole exam.
        </p>
        <Button size="lg" className="h-12 w-full text-base sm:w-auto sm:justify-self-start" onClick={() => startStop(view.index, { skipIntro: true })}>
          Start the checkpoint
          <ArrowRight />
        </Button>
      </div>
    );
  } else if (view.kind === "reveal") {
    const result = p.progress.checkpoint;
    screen = result ? (
      <PathReveal result={result} structure={structure} goal={p.progress.goal} remainingStops={remaining}>
        {pro ? (
          <ContinueCard stop={nextStop} total={total} onContinue={() => startStop(next)} />
        ) : (
          <>
            <PathOffer
              cert={cert}
              certId={p.certId}
              examName={structure.examName}
              remainingStops={remaining}
              questionCount={questionCount}
              proPlan={p.proPlan}
              examDate={p.progress.goal?.examDate ?? null}
              context="reveal"
            />
            <button
              type="button"
              onClick={() => setView({ kind: "home" })}
              className="justify-self-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              Back to my map
            </button>
          </>
        )}
      </PathReveal>
    ) : (
      renderHome()
    );
  } else if (view.kind === "end") {
    const missed = view.total - view.correct;
    screen = (
      <div className="path-rise grid gap-6">
        <div className="grid gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {view.stop.kind === "warmup" ? "Warm-up" : `Stop ${view.stop.index + 1}`} complete
          </span>
          <h2 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {view.correct} <span className="text-muted-foreground">of {view.total}</span>
          </h2>
          <p className="text-muted-foreground">
            {missed === 0
              ? "Every one right."
              : `${missed} to revisit. ${missed === 1 ? "It comes" : "They come"} back in your next stop.`}
          </p>
        </div>

        <div className="glass grid gap-5 rounded-3xl p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display font-semibold tracking-tight">Your {structure.examName} map</h3>
            <span className="font-mono text-xs text-muted-foreground">
              {statuses.size} of {structure.domains.reduce((s, d) => s + d.objectives.length, 0)} objectives started
            </span>
          </div>
          <ExamMap
            structure={structure}
            statuses={statuses}
            fresh={endFresh}
            current={nextStop ? new Set(nextStop.objectives.length > 3 ? [] : nextStop.objectives) : undefined}
          />
          <MapLegend />
        </div>

        {p.signedIn ? (
          <ContinueCard stop={nextStop} total={total} onContinue={() => startStop(next)} locked={next > plan.freeThrough && !pro} />
        ) : (
          <SaveCard cert={cert} onSaved={async (uid, email, method) => {
            await p.linkAccount(uid, email, method);
            await startStopDirect(1);
          }} />
        )}
      </div>
    );
  } else {
    screen = renderHome();
  }

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <PathHeader cert={cert} examName={structure.examName} signedIn={p.signedIn} pro={pro} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-10">
        <div className="path-stage" data-ready={p.ready ? "true" : "false"}>
          {screen}
        </div>
      </main>
    </div>
  );

  async function startStopAfterGoal(index: number) {
    // Goal answers just landed in state; start the stop they were waiting on.
    const stop = stopAt(plan, structure, index);
    if (stop?.kind === "checkpoint") setView({ kind: "intro", index });
    else await startStopDirect(index);
  }

  /**
   * Fetch and play a stop without the between-stop checks — for moments when
   * this render's state is a step behind: right after saving the map, or right
   * after answering a goal question.
   */
  async function startStopDirect(index: number) {
    setView({ kind: "loading" });
    try {
      const built = await api(getPathStop, {
        cert,
        index,
        seen: seenIds(p.progress.items),
        missed: missedIds(p.progress.items),
        run: p.progress.stops[stopAt(plan, structure, index)?.id ?? ""]?.n ?? 0,
      });
      setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(p.progress.items)));
      setView({ kind: "play" });
    } catch {
      setView({ kind: "error", message: "Couldn't load your next stop.", retry: index });
    }
  }

  function renderHome() {
    const result = p.progress.checkpoint;
    const anonymousDone = !p.signedIn && hasStarted(p.progress);
    const lockedNext = p.signedIn && next > plan.freeThrough && !pro;
    return (
      <div className="path-rise grid gap-6">
        <div className="grid gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            {structure.examCode}
          </span>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your {structure.examName} path
          </h1>
          <p className="text-muted-foreground">
            {Math.min(next, total)} of {total} stops done · {statuses.size} of{" "}
            {structure.domains.reduce((s, d) => s + d.objectives.length, 0)} objectives started
            {result && <> · last checkpoint {result.score}%</>}
          </p>
        </div>

        {anonymousDone ? (
          <SaveCard cert={cert} onSaved={async (uid, email, method) => {
            await p.linkAccount(uid, email, method);
            await startStopDirect(1);
          }} />
        ) : lockedNext && result ? (
          <PathOffer
            cert={cert}
            certId={p.certId}
            examName={structure.examName}
            remainingStops={remaining}
            questionCount={questionCount}
            proPlan={p.proPlan}
            examDate={p.progress.goal?.examDate ?? null}
            context="home"
          />
        ) : (
          <ContinueCard stop={nextStop} total={total} onContinue={() => startStop(next)} />
        )}

        <div className="glass grid gap-5 rounded-3xl p-5 sm:p-6">
          <h2 className="font-display font-semibold tracking-tight">Your map</h2>
          <ExamMap
            structure={structure}
            statuses={statuses}
            current={nextStop && nextStop.objectives.length <= 3 ? new Set(nextStop.objectives) : undefined}
          />
          <MapLegend />
        </div>
      </div>
    );
  }
}

function ContinueCard({
  stop,
  total,
  onContinue,
  locked,
}: {
  stop: PathStop | null;
  total: number;
  onContinue: () => void;
  locked?: boolean;
}) {
  if (!stop) return null;
  const label =
    stop.kind === "review"
      ? "Keep practicing"
      : stop.kind === "checkpoint"
        ? "Readiness checkpoint"
        : stop.title;
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {stop.kind === "review" ? "Path complete · review round" : `Next · stop ${stop.index + 1} of ${total}`}
        </p>
        <p className="mt-1 truncate font-display text-xl font-semibold tracking-tight">{label}</p>
      </div>
      <Button size="lg" className={cn("h-12 w-full px-6 text-base sm:w-auto")} onClick={onContinue}>
        {locked ? "See what's next" : "Continue"}
        <ArrowRight />
      </Button>
    </div>
  );
}

function SaveCard({
  cert,
  onSaved,
}: {
  cert: PathCert;
  onSaved: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => Promise<void>;
}) {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("path_save_viewed", { cert });
  }, [cert]);
  return (
    <div className="glass grid gap-4 rounded-3xl p-5 sm:p-6">
      <div className="grid gap-1">
        <h3 className="font-display text-xl font-semibold tracking-tight">Save your map to keep going</h3>
        <p className="text-sm text-muted-foreground">
          A free account keeps your progress and opens the next stops, through to your readiness
          checkpoint.
        </p>
      </div>
      <InlineSignup nextPath={`/path/${cert}`} submitLabel="Save and continue" onSignedIn={onSaved} />
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/start?pick=1" className="underline underline-offset-4 hover:text-foreground">
          Studying for a different exam?
        </Link>
      </p>
    </div>
  );
}
