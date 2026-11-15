"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, RotateCcw } from "lucide-react";
import { identifyUser, track } from "@/lib/analytics";
import { SIGNIN_CANCELLED_PARAM } from "@/lib/google-signin";
import { buildPlan, stopAt } from "@/core/path/plan";
import { finishStop, nextStopIndex, objectiveStatuses, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathCert, type PathProgress, type PathStructure, type Rep } from "@/core/path/types";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { Button } from "@/components/ui/button";
import { ExamMap, MapLegend } from "./ExamMap";
import { useKeyboardTurn } from "./keyboard-turn";
import { RepCard, StopProgress, type RepAnswer } from "./RepCard";
import { nextUpLead, nextUpTitle, SaveAsk } from "./SaveAsk";
import { claimLocalPath, readLocalPath, updateLocalPath } from "./local-path";

/** A finished round: its score, and its own answers as path progress. */
interface RoundResult {
  correct: number;
  total: number;
  /** This round's answers alone; empty when the result was picked back up after a reload. */
  own: PathProgress;
}

/** Room for the public pages' sticky header when the result scrolls into view. */
const HEADER_CLEARANCE = 72;

/**
 * One stop of the guided path, playable right on a public page with no
 * account. Same reps and player as the path, so the page leads with the thing
 * people come back for, and the answers count on their path (kept on this
 * device until they save it). It ends the way a first stop ends on the path:
 * the score, the one account ask with the signup in place, and their map.
 */
export function QuickRound({
  cert,
  stopId,
  examName,
  structure,
  reps,
  label,
  surface,
  unit = "objectives",
}: {
  cert: PathCert;
  /** The path stop being played ("warmup" or an objective code). */
  stopId: string;
  examName: string;
  /** The exam's domains and objectives, for the map the round ends on. */
  structure: PathStructure;
  reps: Rep[];
  /** Eyebrow for the round, e.g. "Objective 1.1 · Security controls". */
  label: string;
  /** Analytics surface, e.g. "objective_page". */
  surface: string;
  /** What the page calls the map's tiles: Network+ pages go by topic. */
  unit?: "objectives" | "topics";
}) {
  const [run, setRun] = useState(0);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(() => reps.map(() => null));
  const [ended, setEnded] = useState<RoundResult | null>(null);
  // Asked while the round is played, so its end never waits to know who's there.
  const userId = useSessionUserId();
  // The keys are this round's until someone plays another player on the page.
  const turnId = useId();
  const root = useRef<HTMLDivElement>(null);
  const keyboard = useKeyboardTurn(turnId, root);
  // Handlers read these, not render state: a right answer moves on by timer.
  const current = useRef(0);
  const right = useRef(0);
  const own = useRef<PathProgress>(EMPTY_PATH_PROGRESS);

  // Back from a Google sign-in they didn't finish: the page loaded afresh, so
  // pick the round up at the result they left, where its Google button says so.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has(SIGNIN_CANCELLED_PARAM)) return;
    const record = readLocalPath(cert)?.progress.stops[stopId];
    // The address and the device's path can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (record) setEnded({ correct: record.c, total: record.t, own: EMPTY_PATH_PROGRESS });
  }, [cert, stopId]);

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const index = current.current;
      const rep = reps[index];
      if (!rep) return;
      if (answer.correct) right.current += 1;
      const now = Date.now();
      own.current = recordRep(own.current, rep.id, answer.correct, now);
      updateLocalPath(cert, (p) => recordRep(p, rep.id, answer.correct, now));
      setResults((prev) => {
        const next = [...prev];
        next[index] = answer.correct;
        return next;
      });
    },
    [cert, reps]
  );

  const onNext = useCallback(() => {
    if (current.current < reps.length - 1) {
      current.current += 1;
      setI(current.current);
      return;
    }
    updateLocalPath(cert, (p) => finishStop(p, stopId, right.current, reps.length, Date.now()));
    track("quick_round_completed", { cert, surface, correct: right.current, total: reps.length });
    setEnded({ correct: right.current, total: reps.length, own: own.current });
  }, [cert, stopId, surface, reps.length]);

  function playAgain() {
    current.current = 0;
    right.current = 0;
    own.current = EMPTY_PATH_PROGRESS;
    setI(0);
    setResults(reps.map(() => null));
    setEnded(null);
    setRun((r) => r + 1);
  }

  const rep = reps[i];
  // min-w-0 down to the label: the pages lay the round out in a grid, where a
  // one-line label would otherwise widen the card past a phone's screen.
  return (
    <div ref={root} className="min-w-0">
      {ended ? (
        <RoundEnd
          cert={cert}
          examName={examName}
          structure={structure}
          reps={reps}
          label={label}
          surface={surface}
          unit={unit}
          userId={userId ?? null}
          result={ended}
          onReplay={playAgain}
        />
      ) : (
        <div className="glass min-w-0 rounded-3xl p-5 sm:p-8">
          <div className="mb-6 grid gap-3">
            <div className="flex min-w-0 items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </p>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {i + 1} / {reps.length}
              </span>
            </div>
            <StopProgress results={results} current={i} />
          </div>
          {rep && (
            <RepCard
              key={`${run}-${i}-${rep.id}`}
              rep={rep}
              onAnswer={onAnswer}
              onNext={onNext}
              promptAs="p"
              keyboard={keyboard}
              // The last answer leads somewhere the page hasn't shown yet: say where.
              nextLabel={i === reps.length - 1 ? "See my result" : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Where a public round ends. Someone with no account gets the path's save ask
 * right here (signing up carries the round into their account and opens their
 * path); someone signed in gets the way back to it. Both see their map.
 */
function RoundEnd({
  cert,
  examName,
  structure,
  reps,
  label,
  surface,
  unit,
  userId,
  result,
  onReplay,
}: {
  cert: PathCert;
  examName: string;
  structure: PathStructure;
  reps: Rep[];
  label: string;
  surface: string;
  unit: "objectives" | "topics";
  /**
   * Who's signed in; null when no one is. By a round's end the session has
   * been read, and someone back from a cancelled sign-in has none.
   */
  userId: string | null;
  result: RoundResult;
  onReplay: () => void;
}) {
  const router = useRouter();
  // The device's path as the round left it. This only mounts in the browser,
  // once a round is over, so it can be read straight away.
  const [device] = useState(() => readLocalPath(cert));
  // The device can hold an account's path while that account is signed out,
  // or while someone else is signed in. That map isn't this visitor's to see,
  // so theirs is this round alone.
  const theirs = device !== null && (device.owner === null || device.owner === userId);
  const progress = theirs ? device.progress : result.own;
  const statuses = useMemo(() => objectiveStatuses(progress.items), [progress]);
  const plan = useMemo(() => buildPlan(structure), [structure]);
  const next = stopAt(plan, structure, nextStopIndex(plan, progress));
  const nextUp = nextUpTitle(next);
  const fresh = useMemo(() => new Set(reps.map((r) => r.objective)), [reps]);
  const tiles = structure.domains.reduce((n, d) => n + d.objectives.length, 0);
  const missed = result.total - result.correct;

  // The result replaces a question that was a different height, and may have
  // been scrolled past: bring its top back under the header, and focus with it.
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = top.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const y = el.getBoundingClientRect().top;
    if (y >= HEADER_CLEARANCE && y <= window.innerHeight / 2) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
  }, []);

  return (
    <div
      ref={top}
      tabIndex={-1}
      role="group"
      aria-label={`${label}: your result`}
      className="grid min-w-0 scroll-mt-24 gap-4 outline-none"
    >
      <div className="glass path-rise grid min-w-0 gap-5 rounded-3xl p-6 sm:p-8">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </span>
            <button
              type="button"
              onClick={onReplay}
              className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Play again
            </button>
          </div>
          <p className="font-display text-4xl font-semibold tracking-tight">
            {result.correct} <span className="text-muted-foreground">of {result.total}</span>
          </p>
          <p className="text-muted-foreground">
            {missed === 0
              ? "Every one right."
              : `${missed} to revisit. ${missed === 1 ? "It comes" : "They come"} back in a later stop on your path.`}
          </p>
        </div>

        {userId ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/70 pt-5">
            <div className="grid min-w-0 gap-1">
              {theirs && (
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  This round counts on your path
                </p>
              )}
              <p className="font-display text-xl font-semibold tracking-tight">Your {examName} path</p>
            </div>
            <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
              <Link href={`/path/${cert}`} onClick={() => track("path_exam_picked", { cert, surface })}>
                Continue
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 border-t border-border/70 pt-5">
            <SaveAsk
              cert={cert}
              surface={surface}
              title={nextUp ?? "Save your map"}
              titleAs="h2"
              staysOnPage={false}
              onSaved={(uid, email, method) => {
                identifyUser(uid, { email });
                track("path_account_linked", { cert, method });
                // This device's rounds are the new account's now: the path saves
                // them when it opens (and doesn't count the link a second time).
                claimLocalPath(cert, uid);
                router.push(`/path/${cert}`);
              }}
            >
              {nextUpLead(next)}A free account saves your map and opens your {examName} path: short rounds like
              this, up to a readiness checkpoint that shows where you stand.
              {!nextUp && " Until then, your map is kept on this device only."}
            </SaveAsk>
          </div>
        )}
      </div>

      <div className="glass grid min-w-0 gap-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display font-semibold tracking-tight">Your {examName} map</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {statuses.size} of {tiles} {unit} started
          </span>
        </div>
        <ExamMap structure={structure} statuses={statuses} fresh={fresh} />
        <MapLegend />
      </div>
    </div>
  );
}
