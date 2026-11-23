"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { identifyUser, track } from "@/lib/analytics";
import { api } from "@/lib/api-client";
import { savePathProgress } from "@/contracts/client";
import { SIGNIN_CANCELLED_PARAM } from "@/lib/google-signin";
import { buildPlan, stopAt } from "@/core/path/plan";
import { doneStopIds, finishStop, hasStarted, nextStopIndex, objectiveStatuses, recordRep } from "@/core/path/progress";
import { EMPTY_PATH_PROGRESS, type PathCert, type PathProgress, type PathStructure, type Rep } from "@/core/path/types";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { ExamMap, objectiveStanding } from "./ExamMap";
import { RepCard, StopProgress, type RepAnswer } from "./RepCard";
import { nextUpLead, nextUpTitle, SaveAsk } from "./SaveAsk";
import { claimLocalPath, readVisitorPath, updateLocalPath } from "./local-path";
import { markBegunOnPublicPage, oweStartEvent } from "./path-start";
import { useWhenKnown } from "./useWhenKnown";

/** A finished round: its score, and its own answers as path progress. */
interface RoundResult {
  correct: number;
  total: number;
  /** This round's answers alone; empty when the result was picked back up after a reload. */
  own: PathProgress;
  /** False when the browser refused to keep the round on this device. */
  kept: boolean;
}

/** Room for the public pages' sticky header when the result scrolls into view. */
const HEADER_CLEARANCE = 72;

/**
 * One stop of the study path, playable right on a public page with no
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
  /** The line above the round, which says what it is: "Objective 1.1: Security controls". */
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
  // Handlers read these, not render state, so that an answer and the press
  // after it in one moment always see the question in hand.
  const current = useRef(0);
  const right = useRef(0);
  const own = useRef<PathProgress>(EMPTY_PATH_PROGRESS);
  // False once the browser has refused to keep an answer of this round.
  const kept = useRef(true);

  // Back from a Google sign-in they didn't finish: the page loaded afresh, so
  // pick the round up at the result they left, where its Google button says so.
  // Nobody is signed in then, so the round is in the visitor's own work.
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has(SIGNIN_CANCELLED_PARAM)) return;
    const record = readVisitorPath(cert)?.stops[stopId];
    // The address and the device's path can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (record) setEnded({ correct: record.c, total: record.t, own: EMPTY_PATH_PROGRESS, kept: true });
  }, [cert, stopId]);

  // The round is the work of whoever is at the keyboard. On a device that
  // holds another account's study path it is kept beside that copy, never in
  // it (see local-path.ts). Until the session has been read, an answer waits
  // in memory, so that it is never kept as the wrong person's work.
  const whenKnown = useWhenKnown(userId);

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const index = current.current;
      const rep = reps[index];
      if (!rep) return;
      if (answer.correct) right.current += 1;
      const now = Date.now();
      own.current = recordRep(own.current, rep.id, answer.correct, now);
      whenKnown((who) => {
        // An answer that begins the visitor's work on this device: the path
        // page still owes its `path_started`, and a signed-out visitor's work
        // is marked as begun here (path-start.ts), as the home page does.
        const before = readVisitorPath(cert, who);
        if (!before || !hasStarted(before)) {
          oweStartEvent(cert);
          if (who === null) markBegunOnPublicPage(cert);
        }
        if (!updateLocalPath(cert, (p) => recordRep(p, rep.id, answer.correct, now), who)) kept.current = false;
      });
      setResults((prev) => {
        const next = [...prev];
        next[index] = answer.correct;
        return next;
      });
    },
    [cert, reps, whenKnown]
  );

  const onNext = useCallback(() => {
    if (current.current < reps.length - 1) {
      current.current += 1;
      setI(current.current);
      return;
    }
    const now = Date.now();
    const correct = right.current;
    own.current = finishStop(own.current, stopId, correct, reps.length, now);
    whenKnown((who) => {
      if (!updateLocalPath(cert, (p) => finishStop(p, stopId, correct, reps.length, now), who)) kept.current = false;
    });
    track("quick_round_completed", { cert, surface, correct, total: reps.length });
    setEnded({ correct, total: reps.length, own: own.current, kept: kept.current });
  }, [cert, stopId, surface, reps.length, whenKnown]);

  function playAgain() {
    current.current = 0;
    right.current = 0;
    own.current = EMPTY_PATH_PROGRESS;
    kept.current = true;
    setI(0);
    setResults(reps.map(() => null));
    setEnded(null);
    setRun((r) => r + 1);
  }

  const rep = reps[i];
  // min-w-0 down to the label: the pages lay the round out in a grid, where a
  // long label would otherwise widen the card past a phone's screen. The label
  // wraps and is never cut short: at high zoom a cut label cannot be read.
  return (
    <div className="min-w-0">
      {ended ? (
        <RoundEnd
          cert={cert}
          examName={examName}
          structure={structure}
          label={label}
          surface={surface}
          unit={unit}
          userId={userId ?? null}
          result={ended}
          onReplay={playAgain}
        />
      ) : (
        <div className="glass min-w-0 rounded-lg p-5 sm:p-8">
          <div className="mb-6 grid gap-3">
            <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="cb-label min-w-0 text-muted-foreground">{label}</p>
              {/* A new element for each question: a browser that translates
                  the page replaces the text of a line it has translated, and
                  React can then no longer change that text. */}
              <p key={i} className="shrink-0 text-note tabular-nums text-muted-foreground">
                Question {i + 1} of {reps.length}
              </p>
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
              // Every question after the one that the page loads with follows a
              // press (Continue, or "Answer the questions again"), so it takes
              // the focus and is read.
              takeFocus={i > 0 || run > 0}
              // The last answer leads somewhere the page hasn't shown yet: say where.
              nextLabel={i === reps.length - 1 ? "View my result" : undefined}
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
  // The visitor's own work on this device as the round left it. This only
  // mounts in the browser, once a round is over, so it can be read straight
  // away. The device can hold an account's path while that account is signed
  // out, or while someone else is signed in: that copy is not this visitor's
  // to see, and the round was kept beside it. When the browser keeps nothing,
  // their work is this round alone.
  const [device] = useState(() => readVisitorPath(cert, userId));
  const progress = device ?? result.own;
  // The round is on the device, so their study path takes it up when it opens.
  const theirs = result.kept && device !== null;
  const statuses = useMemo(() => objectiveStatuses(progress.items), [progress]);
  // Which steps are finished: the outline marks an objective complete only once its own step is.
  const doneStops = useMemo(() => doneStopIds(progress), [progress]);
  const plan = useMemo(() => buildPlan(structure), [structure]);
  const next = stopAt(plan, structure, nextStopIndex(plan, progress));
  const nextUp = nextUpTitle(next);
  const codes = structure.domains.flatMap((d) => d.objectives.map((o) => o.code));
  // Counted as the outline under it counts: everything that is no longer "Not started".
  const started = codes.filter(
    (code) => objectiveStanding(statuses.get(code) ?? "new", doneStops.has(code)) !== "new"
  ).length;
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
      // It takes the focus so that the result is read; it is not a control.
      tabIndex={-1}
      role="group"
      aria-label={`${label}: your result`}
      className="grid min-w-0 gap-4"
    >
      <div className="glass path-rise grid min-w-0 gap-5 rounded-lg p-5 sm:p-8">
        <div className="grid min-w-0 gap-1.5">
          <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            {/* It wraps and is never cut short. */}
            <p className="cb-label min-w-0 text-muted-foreground">{label}</p>
            <button
              type="button"
              onClick={onReplay}
              className="cb-tap inline-flex shrink-0 items-center gap-1.5 text-small text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              Answer the questions again
            </button>
          </div>
          <p className="cb-display text-5xl tabular-nums">
            {result.correct} <span className="text-muted-foreground">of {result.total}</span>
          </p>
          <p className="text-body text-muted-foreground">
            {missed === 0
              ? "You answered every question correctly."
              : `${missed} ${missed === 1 ? "question" : "questions"} will be repeated in a later step of your study path.`}
          </p>
        </div>

        {userId ? (
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-5">
            <div className="grid min-w-0 gap-1">
              {theirs && (
                <p className="text-small text-muted-foreground">These questions count toward your study path.</p>
              )}
              <p className="cb-statement">Your {examName} study path</p>
            </div>
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={`/path/${cert}`} onClick={() => track("path_exam_picked", { cert, surface })}>
                Continue
                <LinkArrow />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 border-t border-border pt-5">
            <SaveAsk
              cert={cert}
              surface={surface}
              title={nextUp ?? "Save your progress"}
              titleAs="h2"
              staysOnPage={false}
              onSaved={async (uid, email, method) => {
                identifyUser(uid, { email });
                track("path_account_linked", { cert, method });
                // This device's rounds are the new account's now: the path saves
                // them when it opens (and doesn't count the link a second time).
                claimLocalPath(cert, uid);
                // A browser that keeps nothing has nothing to hand over, so the
                // round goes to the account from here. If that fails, the study
                // path still opens.
                if (!result.kept) await api(savePathProgress, { cert, progress: result.own }).catch(() => {});
                router.push(`/path/${cert}`);
              }}
            >
              {/* What a free account opens, in the pricing page's own words. */}
              {nextUpLead(next)}A free account saves your progress and opens the first study step and the readiness
              checkpoint of your {examName} study path. The checkpoint shows where you stand on the whole exam.
              {!result.kept
                ? " This browser is not saving your progress. Create a free account to keep it."
                : !nextUp && " Until then, your progress is kept on this device only."}
            </SaveAsk>
          </div>
        )}
      </div>

      <div className="glass grid min-w-0 gap-5 rounded-lg p-5 sm:p-8">
        <div className="grid gap-1.5">
          {/* Named as the page names the map's tiles: Network+ goes by CertBench's own topics. */}
          <h2 className="cb-statement">
            {examName} {unit}
          </h2>
          <p className="text-small text-muted-foreground">
            You have started {started} of {codes.length} {unit}.
          </p>
        </div>
        <ExamMap structure={structure} statuses={statuses} doneStops={doneStops} />
      </div>
    </div>
  );
}
