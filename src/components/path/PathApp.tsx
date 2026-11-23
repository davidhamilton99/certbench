"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, FlaskConical, Loader2, RotateCcw, Timer } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
// Named without their schemas (src/contracts/lazy.ts): the schema library is
// fetched with the first request, not with the page.
import { enrollInPath, getPathLab, getPathRehearsal, getPathStop, recordPathAnswers } from "@/contracts/client";
import { ApiError, type ApiErrorCode } from "@/contracts/errors";
import { userMessage } from "@/lib/errors/user-message";
import { FREE_LAB_COUNT, type FreeOnPublicPages } from "@/core/path/free-labs";
import { CHECKPOINT_SIZE, PRACTICE_SIZE, stopAt } from "@/core/path/plan";
import {
  answersSoFar,
  doneStopIds,
  hasStarted,
  isStopDone,
  MAX_MISSED_SENT,
  missedIds,
  nextStopIndex,
  objectiveStatuses,
  reviewIds,
  seenIds,
  stopsDone,
} from "@/core/path/progress";
import { questionIdOf } from "@/core/path/rep-id";
import { checkpointFromExam, examToImport } from "@/core/path/exam-import";
import { EXAM_CODES, examVersions, LAST_EXAM_DAY, longDate, newerVersion } from "@/core/path/versions";
import { scoreCheckpoint, type CheckpointAnswer } from "@/core/path/checkpoint";
import { latestReading, REHEARSAL_FORMATS, scoreRehearsal } from "@/core/path/rehearsal";
import type {
  ChoiceRep,
  ObjectiveStatus,
  PathCert,
  PathLabInfo,
  PathPlan,
  PathProgress,
  PathStop,
  PathStructure,
  RehearsalSize,
  Rep,
  StopRecord,
} from "@/core/path/types";
import type { PbqGradeResult, PbqScenario } from "@/data/pbq/types";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { preloadLab } from "@/components/workspace/pbq-host";
import {
  ExamMap,
  labTileKey,
  MapLegend,
  objectiveStanding,
  REHEARSAL_TILE,
  type LabState,
  type MapRehearsal,
  type MapTile,
} from "./ExamMap";
import { WelcomeBack } from "./WelcomeBack";
import { LabLibrary, NextLabCard } from "./LabLibrary";
import { RepCard, StopProgress, type RepAnswer } from "./RepCard";
import { PathHeader } from "./PathHeader";
import { VersionSwitch } from "./VersionSwitch";
import { PathOffer } from "./PathOffer";
import { PathReveal } from "./PathReveal";
import { PathActivating, PathPaidSignIn, PathUnlocked } from "./PathUnlocked";
import { HOLD_ATTRIBUTE, HOLD_WAIT_MS, holdsStage, UPGRADED_FLAG } from "./path-hold";
import { PracticeCard, ReviewMissesCard } from "./PracticeCard";
import { RehearsalIntro, RehearsalResumeCard } from "./RehearsalIntro";
import { RehearsalPlayer } from "./RehearsalPlayer";
import { RehearsalResult } from "./RehearsalResult";
import { clearRun, readRun, writeRun, type RehearsalRun } from "./rehearsal-run";
import { GoalStep } from "./GoalStep";
import { nextUpLead, nextUpTitle, SaveAsk } from "./SaveAsk";
import { usePathProgress } from "./usePathProgress";
import { mayTakeExam, readExamMark, writeExamMark } from "./local-path";
import { pathUnlockedKey } from "./storage-key";
import { takeOwedStartEvent } from "./path-start";

// The lab players are big and only Pro reaches a lab: load them when one opens.
// A simulation, a topology and a threat hunt each have a large player of their
// own, which this one fetches when it first shows such a lab. So that the two
// are fetched side by side and not one after the other, the page starts the
// large player's fetch itself (`preloadLab`): when a lab's row is hovered or
// takes the focus, and as a lab is about to open.
const PbqPlayer = dynamic(() => import("@/components/workspace/PbqPlayer").then((m) => m.PbqPlayer), {
  ssr: false,
  loading: () => (
    <p role="status" className="flex min-h-60 items-center justify-center gap-2 text-small text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      The lab is loading.
    </p>
  ),
});

interface Play {
  stop: PathStop;
  reps: Rep[];
  i: number;
  results: (boolean | null)[];
  /** Bank answers to record against the account at the end of the stop. */
  bank: Map<string, number>;
  checkpoint: CheckpointAnswer[];
  /** Objective statuses before the stop, to say what it changed. */
  before: Map<string, ObjectiveStatus>;
  /** "misses": a review round of their misses alone. */
  focus?: "misses";
  /**
   * The step continues from answers given earlier (before a reload, or on
   * another page): how many of its questions had been answered, and the
   * question it continues at.
   */
  resumed?: { answered: number; at: number };
  /**
   * Whether the question in hand takes the keyboard's focus as it arrives:
   * true for every question that follows something the person did on this
   * page, false for the one that the page loads with.
   */
  takeFocus: boolean;
}

/** A step at its first question, with nothing answered. */
const newPlay = (
  stop: PathStop,
  reps: Rep[],
  before: Map<string, ObjectiveStatus>,
  takeFocus: boolean,
  focus?: "misses"
): Play => ({
  stop,
  reps,
  i: 0,
  results: reps.map(() => null),
  bank: new Map(),
  checkpoint: [],
  before,
  focus,
  takeFocus,
});

/** The first question at or after `from` that has no answer yet, or -1 when every one has. */
const openFrom = (results: readonly (boolean | null)[], from: number) =>
  results.findIndex((r, i) => i >= from && r === null);

type View =
  | { kind: "play" }
  | { kind: "home" }
  /** Signed out on a device that holds an account's path: sign back in first. */
  | { kind: "welcome" }
  | { kind: "loading"; label?: string }
  | {
      kind: "end";
      stop: PathStop;
      correct: number;
      total: number;
      focus?: "misses";
    }
  /** `then`: the step that the questions were asked before, or null when the exam date is being changed from the home screen. */
  | { kind: "goal"; step: "exam" | "minutes"; then: number | null }
  | { kind: "intro"; index: number }
  | { kind: "reveal" }
  | {
      kind: "lab";
      scenario: PbqScenario;
      /** The stop it closes, when it's a domain's lab; null for the rest of the library. */
      stop: PathStop | null;
      /** Opened as the next stop on the path, or from the lab library. */
      from: "path" | "library";
      graded: boolean;
    }
  | { kind: "labs" }
  | { kind: "unlocked" }
  | { kind: "rehearsal-intro"; asStop: boolean }
  | { kind: "rehearsal" }
  | { kind: "rehearsal-result" }
  | { kind: "error"; message: string; retry: () => void };

const domainOf = (objective: string) =>
  objective.includes(".") ? `${objective.split(".")[0]}.0` : objective;

const domainLabel = (number: string | null) => (number ?? "").replace(/\.0$/, "");

/**
 * What a row of the outline offers to do once it is opened. `kind` names it
 * for analytics. Most are done on this page; what is free on one of the exam's
 * public pages is a link to that page.
 */
type TileAction =
  | { label: string; kind: "start" | "replay" | "lab" | "rehearsal" | "offer" | "save"; run: () => void }
  | { label: string; kind: "free_exam" | "free_labs"; href: string };

/** An opened row of the outline: where it stands, and the one thing to do with it. */
interface TileInfo {
  /** For analytics: done, next, later, locked, free, open, anonymous, none. */
  state: string;
  /** Names the card to a screen reader; the row above it already shows it. */
  title: string;
  /** Where the learner stands on it, in a sentence or two. */
  line?: string;
  action?: TileAction;
}

/** The kinds of action that start or continue study: the only ones drawn with the arrow. */
const STUDY_ACTIONS: ReadonlySet<TileAction["kind"]> = new Set(["start", "replay", "lab", "rehearsal"]);

/** What a step is called above its questions. A round of review has one name everywhere: "Review". */
function stopLabel(stop: PathStop, total: number): string {
  switch (stop.kind) {
    case "warmup":
      return "Introductory questions";
    case "checkpoint":
      return "Readiness checkpoint";
    case "review":
      return "Review";
    case "lab":
      return "Hands-on lab";
    case "rehearsal":
      return "Practice exam";
    default:
      return `Step ${stop.index + 1} of ${total}: ${stop.title}`;
  }
}

/** "March 3": the page is in English, so its dates are too, whatever the browser's own language. */
const fmtDay = (at: number) => new Date(at).toLocaleDateString("en-US", { month: "long", day: "numeric" });

/** "1 is complete", "3 are to review": one part of the sentence that says what a step changed. */
const standingClause = (n: number, words: string) => `${n} ${n === 1 ? "is" : "are"} ${words}`;

/** "a", "a and b", "a, b and c". */
const inWords = (parts: string[]) =>
  parts.length <= 1 ? (parts[0] ?? "") : `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;

/**
 * What a step changed in the outline, in the outline's own words: "This step
 * marked 6 objectives: 1 is complete and 5 are to review. " (with the space
 * that the next sentence follows). Empty when the step changed nothing.
 */
function changeSentence(subject: string, counts: { complete: number; started: number; review: number }): string {
  const words = [
    ["complete", counts.complete],
    ["started", counts.started],
    ["to review", counts.review],
  ] as const;
  const changed = words.filter(([, n]) => n > 0);
  const marked = counts.complete + counts.started + counts.review;
  if (marked === 0) return "";
  if (marked === 1) return `${subject} marked 1 objective: it is ${changed[0][0]}. `;
  return `${subject} marked ${marked} objectives: ${inWords(changed.map(([word, n]) => standingClause(n, word)))}. `;
}

/**
 * Marks the history entry that the page adds when a learner opens a step, a
 * lab or a practice exam, so that the browser's Back returns to the home
 * screen of the study path.
 */
const OPENED_ENTRY = "cbPathOpened";
const isOpenedEntry = (state: unknown): boolean =>
  typeof state === "object" && state !== null && (state as Record<string, unknown>)[OPENED_ENTRY] === true;

/** The screens that move the focus themselves: a question (RepCard) and the practice exam's own screens. */
const SELF_FOCUSING: ReadonlySet<View["kind"]> = new Set(["play", "rehearsal-intro", "rehearsal", "rehearsal-result"]);

/** What the server is sent to build a step. */
interface StopInput {
  cert: PathCert;
  index: number;
  seen: string[];
  missed: string[];
  run: number;
  focus?: "misses";
}

/** Ask the server to build a step of the study path. */
const requestStop = (input: StopInput) => api(getPathStop, input);
type BuiltStop = Awaited<ReturnType<typeof requestStop>>;

/**
 * Names a request for a step by what it asks for. A request made ahead of time
 * is used only when the step is then asked for in the same way: the same step,
 * the same run of it, and nothing answered in between.
 */
const stopKey = (input: StopInput) =>
  `${input.index}:${input.run}:${input.seen.length}:${input.missed.join(",")}`;

/** The code of an error from the API, or null for any other failure. */
const codeOf = (err: unknown): ApiErrorCode | null => (err instanceof ApiError ? err.code : null);

/** What the page says when a request fails for a reason that the server did not put into a sentence. */
const STEP_NOT_LOADED = "Your next step could not be loaded. Please try again.";
const LAB_NOT_OPENED = "The lab could not be opened. Please try again.";
const EXAM_NOT_PREPARED = "Your practice exam could not be prepared. Please try again.";
const REVIEW_NOT_LOADED = "The questions for review could not be loaded. Please try again.";

/** Back from paying, how long "Payment received" waits before saying it's slow. */
const SLOW_AFTER_MS = 20_000;
/** And how long it keeps asking the account on its own. */
const STOP_ASKING_AFTER_MS = 120_000;

/** Take the flag that the return from paying carries off the address. */
function dropUpgradedFlag() {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("upgraded")) return;
  url.searchParams.delete("upgraded");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

/** True the first time this device shows Pro opening this exam's path. */
function firstUnlock(cert: string): boolean {
  try {
    if (localStorage.getItem(pathUnlockedKey(cert))) return false;
    localStorage.setItem(pathUnlockedKey(cert), String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * The study path for one exam. One screen at a time, and one clear thing to
 * do on each: answer a step's questions, read what the step changed in the
 * course outline, continue. Between steps it saves the progress to an account,
 * asks one planning question at a time, runs the readiness checkpoint and
 * makes the one offer.
 */
export function PathApp({
  cert,
  structure,
  plan,
  warmup,
  questionCount,
  free,
}: {
  cert: PathCert;
  structure: PathStructure;
  plan: PathPlan;
  /** The introductory questions, built on the server, so that a first visit starts at once. */
  warmup: { stop: PathStop; reps: Rep[] };
  questionCount: number;
  /**
   * What this exam gives away on its public pages: one practice exam, and for
   * most exams some of its labs. The outline says so and leads there, and only
   * the rest is described as included with Pro.
   */
  free: FreeOnPublicPages;
}) {
  const p = usePathProgress(cert);
  const total = plan.stops.length;

  // Whether the person has done anything on this page yet. A screen or a
  // question that arrives after that takes the keyboard's focus, so that it is
  // read; what the page shows as it loads never does.
  const acted = useRef(false);
  useEffect(() => {
    const mark = () => {
      acted.current = true;
    };
    const events = ["pointerdown", "keydown", "click"] as const;
    events.forEach((name) => document.addEventListener(name, mark, true));
    return () => events.forEach((name) => document.removeEventListener(name, mark, true));
  }, []);

  // Before first paint, as the page's inline script does on a full load: a
  // learner who's been here, or is back from paying, waits for their own
  // screen instead of the first visit's warm-up. Arriving from inside the app
  // never runs that script, so the path checks again here, and starts the
  // clock that lets the held stage say that it is loading.
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.toggleAttribute(HOLD_ATTRIBUTE.returning, holdsStage(cert, window.location.search));
    // The page's scripts are running: it is not "late" from here on.
    html.setAttribute(HOLD_ATTRIBUTE.live, "");
    html.removeAttribute(HOLD_ATTRIBUTE.late);
    const wait = window.setTimeout(() => html.setAttribute(HOLD_ATTRIBUTE.wait, ""), HOLD_WAIT_MS);
    return () => {
      window.clearTimeout(wait);
      // The next study path opened from inside the app starts its own clock.
      html.removeAttribute(HOLD_ATTRIBUTE.wait);
    };
  }, [cert]);

  // While a returning learner's stage is held, its hidden first-visit question
  // can be neither focused, pressed nor read (the style rule hides it as well).
  const stageBody = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const held = !p.ready && document.documentElement.hasAttribute(HOLD_ATTRIBUTE.returning);
    stageBody.current?.toggleAttribute("inert", held);
  }, [p.ready, cert]);

  // Back from paying: Stripe's success link adds ?upgraded=1. For someone who
  // is signed in, the flag comes off the address as soon as the page knows who
  // they are (below), so a reload is an ordinary visit. A buyer who returns
  // signed out keeps it: they are asked to sign in, and signing in brings them
  // back to this address, flag and all, to the wait for their confirmation.
  const [landing, setLanding] = useState<{ done: boolean } | null>(null);
  useLayoutEffect(() => {
    // The address is only readable once mounted; before paint, so the
    // introductory questions do not flash.
    if (UPGRADED_FLAG.test(window.location.search)) setLanding({ done: false });
  }, []);

  const freshPlay = useCallback(
    (stop: PathStop, reps: Rep[], before: Map<string, ObjectiveStatus>, focus?: "misses"): Play =>
      // A step that opens after the person has done something on the page
      // takes the focus at its first question; the one a page loads with does not.
      newPlay(stop, reps, before, acted.current, focus),
    []
  );

  const [view, setViewState] = useState<View>({ kind: "play" });
  // Counts every screen the page moves to. A request notes the count as it is
  // made. If the count has moved on when the answer arrives, the learner has
  // gone elsewhere meanwhile (the exam's name in the header, the browser's
  // Back), and the answer no longer decides what they see.
  const moves = useRef(0);
  const setView = useCallback((next: View | ((current: View) => View)) => {
    moves.current++;
    setViewState(next);
  }, []);
  // "Now" for what's due for review, fixed for the visit: due-ness moves in days.
  const [visitAt] = useState(() => Date.now());
  const [play, setPlayState] = useState<Play>(() => newPlay(warmup.stop, warmup.reps, new Map(), false));
  // Handlers read the play through a ref, so a timer-driven "next" or an
  // answer-then-advance in one tick always sees the current rep.
  const playRef = useRef(play);
  const setPlay = useCallback((next: Play) => {
    playRef.current = next;
    setPlayState(next);
  }, []);

  // First paint is the warm-up (fast for first-time visitors and crawlers);
  // once the page knows who is here and what they have done, it decides where
  // they belong (the effect below `onNext`). This is the arrival, as the
  // progress hook counts them, that has been decided for.
  const arrived = useRef(0);
  // Whether the first-unlock check has been made (the effect after that one).
  // The effects run in the order they are written: the arrival's decision,
  // then a practice exam brought in from a public page, then the unlock.
  const unlockChecked = useRef(false);

  // The map tile that's open on the home screen, if any.
  const [tile, setTile] = useState<MapTile | null>(null);

  const statuses = useMemo(() => objectiveStatuses(p.progress.items), [p.progress.items]);
  const next = nextStopIndex(plan, p.progress);
  const nextStop = stopAt(plan, structure, next);
  const remaining = total - stopsDone(plan, p.progress);
  const pro = p.access === "pro";
  // The server refused a request this visit because the account is not Pro on
  // this exam. That settles what an unreached account left open.
  const [walled, setWalled] = useState(false);
  // What Pro opens is shown as closed, and Pro is offered, only when the page
  // knows that the account does not have it. While a signed-in learner's
  // account has not been reached (p.access is "unknown") nothing is locked and
  // nothing is offered: a member must never be asked to buy what they have.
  // The way on asks the server, which decides each request.
  const shut = !pro && (p.access !== "unknown" || walled);
  // Back from paying and Pro not confirmed yet: "Payment received" holds the
  // screen, never the offer they just paid for.
  const awaitingPro = landing !== null && !landing.done;

  // The steps that are finished, and where each objective stands by the
  // outline's own rule (ExamMap): "complete" only once the objective's own step
  // is done with nothing left to review. The sentences on this page count on
  // the same basis as the rows under them.
  const doneStops = useMemo(() => doneStopIds(p.progress), [p.progress]);
  const objectiveCodes = useMemo(
    () => structure.domains.flatMap((d) => d.objectives.map((o) => o.code)),
    [structure.domains]
  );
  const standingOf = useCallback(
    (code: string, done: ReadonlySet<string> = doneStops, from: ReadonlyMap<string, ObjectiveStatus> = statuses) =>
      objectiveStanding(from.get(code) ?? "new", done.has(code)),
    [doneStops, statuses]
  );
  const objectivesStarted = objectiveCodes.filter((code) => standingOf(code) !== "new").length;

  // The labs that are free for everyone on the exam's public page of labs.
  const freeLabIds = useMemo(() => new Set(free.labsHref ? free.labIds : []), [free.labsHref, free.labIds]);

  // Each domain's lab in the outline: completed, open to do (Pro), free on the
  // exam's public page, or included with Pro.
  const labs = useMemo(() => {
    const out = new Map<string, LabState>();
    for (const s of plan.stops) {
      if (s.kind !== "lab" || !s.domain) continue;
      const lab = structure.domains.find((d) => d.number === s.domain)?.lab;
      const closed: LabState = lab && freeLabIds.has(lab.id) ? "free" : "locked";
      out.set(s.domain, isStopDone(p.progress, s.id) ? "done" : shut ? closed : "open");
    }
    return out;
  }, [plan.stops, structure.domains, p.progress, shut, freeLabIds]);
  const labMinutes = (stop: PathStop | null) =>
    stop?.kind === "lab" ? (structure.domains.find((d) => d.number === stop.domain)?.lab?.minutes ?? null) : null;

  // The exam's whole lab library. A lab's latest result is its own record, or
  // for a domain's lab played before the library existed, its stop's.
  const library = useMemo(() => structure.library ?? [], [structure.library]);
  const labStopOf = useCallback(
    (labId: string) => {
      const domain = structure.domains.find((d) => d.lab?.id === labId);
      return domain ? (plan.stops.find((s) => s.kind === "lab" && s.domain === domain.number) ?? null) : null;
    },
    [structure.domains, plan.stops]
  );
  const labResults = useMemo(() => {
    const out = new Map<string, StopRecord>();
    for (const lab of library) {
      const stop = labStopOf(lab.id);
      const record = p.progress.labs[lab.id] ?? (stop ? p.progress.stops[stop.id] : undefined);
      if (record && record.n > 0) out.set(lab.id, record);
    }
    return out;
  }, [library, labStopOf, p.progress.labs, p.progress.stops]);
  // What a review round would bring back: misses, and misses got right once a few days ago.
  const toReview = useMemo(
    () => reviewIds(p.progress.items, visitAt, Number.POSITIVE_INFINITY).length,
    [p.progress.items, visitAt]
  );

  /** The next lab in the library not played yet, after this one (or from the start). */
  const nextLabAfter = (labId: string) => {
    const at = library.findIndex((l) => l.id === labId);
    const after = [...library.slice(at + 1), ...library.slice(0, Math.max(0, at))];
    return after.find((l) => !labResults.has(l.id)) ?? null;
  };

  // The practice exam: the study path's last step, and for Pro, there at any
  // time. Without Pro one practice exam is free, on the exam's public page.
  const rehearsalStop = useMemo(() => plan.stops.find((s) => s.kind === "rehearsal") ?? null, [plan.stops]);
  const reading = latestReading(p.progress);
  const lastRehearsal = p.progress.rehearsals.at(-1) ?? null;
  const mapRehearsal: MapRehearsal | undefined = rehearsalStop
    ? {
        state: isStopDone(p.progress, rehearsalStop.id) ? "done" : shut ? "free" : "open",
        questions: REHEARSAL_FORMATS.full.questions,
        minutes: REHEARSAL_FORMATS.full.minutes,
        score: lastRehearsal?.score,
      }
    : undefined;

  // This device's rehearsal for this account: one in progress, or the last one scored.
  const [run, setRunState] = useState<RehearsalRun | null>(null);
  useEffect(() => {
    setRunState(p.ready && p.userId ? readRun(cert, p.userId) : null);
  }, [p.ready, p.userId, cert]);
  const saveRun = useCallback(
    (next: RehearsalRun) => {
      setRunState(next);
      writeRun(cert, next);
    },
    [cert]
  );
  const runInProgress = run && !run.done ? run : null;

  // Pro bought before the path asked for their exam (from /pricing, say) leaves
  // the account with no exam: Pro opens nothing, and the dashboard sends them
  // back to the picker. Claim this one. The server only lets an account with no
  // exam yet take it, so a member who has one still gets the offer to add it.
  const claimed = useRef(false);
  // The hook's functions keep their identity from one render to the next.
  const { ready, signedIn, proPlan, refreshAccess, arrival, record, finish, finishLab, retire, peek } = p;
  // Back from paying with nobody signed in: the buyer is asked to sign in.
  const paidSignedOut = awaitingPro && ready && !signedIn;
  // Names the screen that is showing, so that the page can tell when it changes.
  const screenKey = awaitingPro
    ? paidSignedOut
      ? "paid-sign-in"
      : "activating"
    : view.kind === "goal"
      ? `goal:${view.step}`
      : view.kind === "lab"
        ? `lab:${view.scenario.id}`
        : view.kind;
  useEffect(() => {
    if (!ready || !signedIn || !proPlan || pro || claimed.current) return;
    claimed.current = true;
    void (async () => {
      try {
        const { enrolled } = await api(enrollInPath, { cert, examDate: null });
        if (enrolled) await refreshAccess();
      } catch {
        /* nothing changes; the goal question claims it too */
      }
    })();
  }, [ready, signedIn, proPlan, pro, cert, refreshAccess]);

  // Back from paying. Signed out, the page asks the buyer to sign in (the
  // screen is chosen below) and the flag stays on the address. Signed in, the
  // flag comes off, and the moment Pro is confirmed the page opens with what
  // it opened, straight from "Payment received" before any other screen paints.
  const waitedSince = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!awaitingPro || !ready || !signedIn) return;
    dropUpgradedFlag();
    if (!pro) return;
    setLanding({ done: true });
    // This decides what opens: the arrival's own decision and the unlock check stand down.
    arrived.current = arrival;
    unlockChecked.current = true;
    track("path_upgrade_landed", {
      cert,
      waited_ms: waitedSince.current === null ? 0 : Date.now() - waitedSince.current,
    });
    const first = firstUnlock(cert);
    if (first) track("path_unlock_viewed", { cert });
    setView(first ? { kind: "unlocked" } : { kind: "home" });
  }, [awaitingPro, ready, signedIn, pro, cert, arrival, setView]);

  // Until then, ask the account again while the activation webhook lands:
  // every 2 seconds, every 5 once it's slow, on its own for 2 minutes.
  const [slow, setSlow] = useState(false);
  const askingForPro = awaitingPro && ready && signedIn && !pro;
  useEffect(() => {
    if (!askingForPro) return;
    const since = (waitedSince.current ??= Date.now());
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const ask = async () => {
      await refreshAccess().catch(() => {});
      if (stopped) return;
      const waited = Date.now() - since;
      if (waited >= SLOW_AFTER_MS) setSlow(true);
      if (waited < STOP_ASKING_AFTER_MS) timer = setTimeout(ask, waited < SLOW_AFTER_MS ? 2000 : 5000);
    };
    timer = setTimeout(ask, 2000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [askingForPro, refreshAccess]);

  /**
   * Start fetching the player for a lab of this exam before the lab is opened
   * (see `PbqPlayer` above). The exam's list of labs says what kind each one
   * is; a drill needs no fetch, and a lab that the list does not hold is left
   * to be fetched when it opens.
   */
  const preloadLabById = useCallback(
    (labId: string) => {
      const type = library.find((l) => l.id === labId)?.type;
      if (type) preloadLab(type);
    },
    [library]
  );

  const openLab = useCallback(
    (stop: PathStop, scenario: PbqScenario) => {
      // Beside the lab's own screen, which is fetched as it is first shown.
      preloadLab(scenario.type);
      track("path_lab_started", { cert, stop: stop.id, scenario: scenario.id, from: "path" });
      setView({ kind: "lab", stop, scenario, from: "path", graded: false });
      window.scrollTo({ top: 0 });
    },
    [cert, setView]
  );

  // `finishStop`, `onAnswer` and `onNext` are what a question calls. They are
  // made once: they use the progress hook's own functions, which never change,
  // and read its state as it is at that moment (`peek`). The card that shows a
  // question is therefore not handed new functions each time this page renders.
  const finishStop = useCallback(() => {
    const cur = playRef.current;
    const signedInNow = peek().userId !== null;
    const correct = cur.results.filter((r) => r === true).length;
    const totalReps = cur.reps.length;
    track("path_stop_completed", {
      cert,
      stop: cur.stop.id,
      index: cur.stop.index,
      kind: cur.stop.kind,
      correct,
      total: totalReps,
      signed_in: signedInNow,
      ...(cur.focus ? { focus: cur.focus } : {}),
    });
    if (signedInNow && cur.bank.size > 0) {
      const answers = [...cur.bank].map(([questionId, selectedIndex]) => ({ questionId, selectedIndex }));
      void api(recordPathAnswers, { cert, answers }).catch(() => {});
    }
    if (cur.stop.kind === "checkpoint") {
      const result = scoreCheckpoint(cur.checkpoint, structure.domains, Date.now());
      finish(cur.stop.id, correct, totalReps, result);
      track("path_checkpoint_completed", { cert, score: result.score });
      setView({ kind: "reveal" });
    } else {
      finish(cur.stop.id, correct, totalReps);
      setView({ kind: "end", stop: cur.stop, correct, total: totalReps, focus: cur.focus });
    }
    window.scrollTo({ top: 0 });
  }, [cert, finish, peek, structure.domains, setView]);

  /**
   * A play of a step that continues from the answers its questions already
   * have: given before a reload, or on another page (the home page's sample
   * questions are among the introductory questions).
   */
  const resumedPlay = useCallback(
    (stop: PathStop, reps: Rep[], progress: PathProgress): Play => {
      const results = answersSoFar(
        progress,
        reps.map((r) => r.id)
      );
      const answered = results.filter((r) => r !== null).length;
      if (answered === 0) return freshPlay(stop, reps, objectiveStatuses(progress.items));
      // What the step changes is measured from the path as it was without the step's own answers.
      const own = new Set(reps.map((r) => r.id));
      const others = Object.fromEntries(Object.entries(progress.items).filter(([id]) => !own.has(id)));
      const at = Math.max(0, openFrom(results, 0));
      return { ...freshPlay(stop, reps, objectiveStatuses(others)), i: at, results, resumed: { answered, at } };
    },
    [freshPlay]
  );

  /**
   * Show the introductory questions that came with the page, from the first
   * one that has no answer. When every one has an answer already, only the
   * step is left to count, and its result is shown.
   */
  const resumeWarmup = useCallback(
    (progress: PathProgress) => {
      const next = resumedPlay(warmup.stop, warmup.reps, progress);
      setPlay(next);
      if (openFrom(next.results, 0) < 0) finishStop();
      else setView({ kind: "play" });
    },
    [warmup, resumedPlay, setPlay, finishStop, setView]
  );

  // A step that was asked for ahead of time, while the end of the step before
  // it was being read, so that Continue has nothing to wait for.
  const ahead = useRef<{ key: string; request: Promise<BuiltStop>; built: BuiltStop | null } | null>(null);

  /** What the server is sent to build a step, as every request for one sends it. */
  const stopInput = useCallback(
    (index: number, stop: PathStop, progress: PathProgress): StopInput => ({
      cert,
      index,
      seen: seenIds(progress.items),
      missed: missedIds(progress.items),
      run: progress.stops[stop.id]?.n ?? 0,
    }),
    [cert]
  );

  /**
   * A step's questions: at once when the request made ahead of time has been
   * answered, otherwise as a request to wait for (that one, if it was for the
   * same step, or a new one).
   */
  const fetchStop = useCallback(
    (index: number, stop: PathStop, progress: PathProgress): { built: BuiltStop } | { request: Promise<BuiltStop> } => {
      const input = stopInput(index, stop, progress);
      const waiting = ahead.current?.key === stopKey(input) ? ahead.current : null;
      ahead.current = null;
      if (waiting?.built) return { built: waiting.built };
      return { request: waiting ? waiting.request : requestStop(input) };
    },
    [stopInput]
  );

  const startStop = useCallback(
    async (index: number, opts?: { skipIntro?: boolean }) => {
      const stop = stopAt(plan, structure, index);
      if (!stop) return;
      // An account keeps the map; without one, the introductory questions are
      // the whole visit. They came with the page, so they need no request, and
      // they go on from the first one that has no answer.
      if (!p.signedIn) {
        if (index === 0) resumeWarmup(p.progress);
        else setView({ kind: "home" });
        return;
      }
      // While the account has not been reached, the server decides (see `shut`).
      if (index > plan.freeThrough && shut) {
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
      if (stop.kind === "rehearsal") {
        setView(runInProgress ? { kind: "rehearsal" } : { kind: "rehearsal-intro", asStop: true });
        window.scrollTo({ top: 0 });
        return;
      }

      // A lab is about to open: its player is fetched while the server is asked for the lab.
      if (stop.kind === "lab") {
        const lab = structure.domains.find((d) => d.number === stop.domain)?.lab;
        if (lab) preloadLabById(lab.id);
      }

      const got = fetchStop(index, stop, p.progress);
      // The loading line is shown only when there is something to wait for.
      if (!("built" in got)) setView({ kind: "loading" });
      const asked = moves.current;
      try {
        const built = "built" in got ? got.built : await got.request;
        // True whatever the learner is looking at by now.
        retire(built.retired);
        // The learner has gone elsewhere meanwhile: the answer is not theirs to be shown.
        if (moves.current !== asked) return;
        if (built.lab) {
          openLab(built.stop, built.lab);
          return;
        }
        if (built.reps.length === 0) {
          finish(built.stop.id, 0, 0);
          setView({ kind: "home" });
          return;
        }
        if (built.stop.kind === "warmup") {
          // The introductory questions go on from any that are answered already
          // (on the home page, or before signing in).
          const resumed = resumedPlay(built.stop, built.reps, p.progress);
          setPlay(resumed);
          if (openFrom(resumed.results, 0) < 0) {
            finishStop();
            return;
          }
        } else {
          setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(p.progress.items)));
        }
        setView({ kind: "play" });
        window.scrollTo({ top: 0 });
      } catch (err) {
        const code = codeOf(err);
        if (code === "quota_exceeded") {
          // The server has answered: this account does not have Pro on this exam.
          setWalled(true);
          await refreshAccess();
        }
        if (moves.current !== asked) return;
        if (code === "unauthorized") {
          setView({ kind: "home" });
        } else if (code === "quota_exceeded") {
          setView({ kind: "reveal" });
        } else {
          setView({
            kind: "error",
            message: userMessage(err, STEP_NOT_LOADED),
            retry: () => startStop(index, { skipIntro: true }),
          });
        }
      }
    },
    [
      plan,
      structure,
      p.signedIn,
      p.progress,
      shut,
      freshPlay,
      setPlay,
      setView,
      openLab,
      preloadLabById,
      runInProgress,
      resumedPlay,
      resumeWarmup,
      finishStop,
      fetchStop,
      retire,
      finish,
      refreshAccess,
    ]
  );

  /**
   * A lab counts when it's graded, so it's done even if they leave from the
   * result. Grading it again (a retry) records the new score. A domain's lab
   * finishes its stop wherever it was opened: from the library, it needn't be
   * played again on the path.
   */
  const onLabGraded = useCallback(
    (
      lab: { scenario: PbqScenario; stop: PathStop | null; from: "path" | "library" },
      result: PbqGradeResult,
      first: boolean
    ) => {
      const total = Math.max(0, Math.round(result.totalItems));
      const correct = Math.min(total, Math.max(0, Math.round(result.correctItems)));
      const { scenario, stop, from } = lab;
      const stopWasDone = stop ? isStopDone(p.progress, stop.id) : true;
      finishLab(scenario.id, correct, total, stop?.id ?? null);
      if (first) {
        track("path_lab_completed", { cert, scenario: scenario.id, from, correct, total });
        if (stop && (from === "path" || !stopWasDone)) {
          track("path_stop_completed", {
            cert,
            stop: stop.id,
            index: stop.index,
            kind: stop.kind,
            correct,
            total,
            signed_in: p.signedIn,
          });
        }
      }
      setView((v) => (v.kind === "lab" && v.scenario.id === scenario.id ? { ...v, graded: true } : v));
    },
    [cert, p.progress, p.signedIn, finishLab, setView]
  );

  /** Open any lab from the library, in the path's own lab stage. */
  async function openLibraryLab(info: PathLabInfo) {
    // Its player is fetched while the server is asked for the lab.
    preloadLab(info.type);
    setView({ kind: "loading", label: "The lab is opening." });
    const asked = moves.current;
    try {
      const { lab } = await api(getPathLab, { cert, id: info.id });
      if (moves.current !== asked) return;
      const stop = labStopOf(info.id);
      track("path_lab_started", { cert, stop: stop?.id ?? "library", scenario: info.id, from: "library" });
      setView({ kind: "lab", stop, scenario: lab, from: "library", graded: false });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = codeOf(err);
      const refused = code === "unauthorized" || code === "quota_exceeded";
      if (refused) {
        if (code === "quota_exceeded") setWalled(true);
        await refreshAccess();
      }
      if (moves.current !== asked) return;
      if (refused) {
        setView({ kind: "home" });
      } else {
        setView({
          kind: "error",
          message: userMessage(err, LAB_NOT_OPENED),
          retry: () => void openLibraryLab(info),
        });
      }
    }
  }

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const cur = playRef.current;
      const rep = cur.reps[cur.i];
      if (!rep || cur.results[cur.i] !== null) return;
      // `path_started` counts a first answer on this page. The home page's
      // sample questions begin the device's copy of the study path, so a
      // visitor who answered one there arrives with a copy that has started:
      // the home page leaves a mark for that copy, and the event is recorded
      // once here (path-start.ts). The mark is taken first, whatever the copy
      // holds, so that it never outlives the answer it was left for.
      const owed = takeOwedStartEvent(cert);
      if (!hasStarted(peek().progress) || owed) track("path_started", { cert });
      record(rep.id, answer.correct);
      const results = [...cur.results];
      results[cur.i] = answer.correct;
      const bank = new Map(cur.bank);
      const qid = questionIdOf(rep.id);
      if (qid && answer.picked >= 0) {
        // Record against the bank's own option order, not the shuffled display.
        bank.set(qid, rep.type === "choice" && rep.order ? (rep.order[answer.picked] ?? answer.picked) : answer.picked);
      }
      const checkpoint =
        cur.stop.kind === "checkpoint"
          ? [...cur.checkpoint, { domain: domainOf(rep.objective), correct: answer.correct }]
          : cur.checkpoint;
      setPlay({ ...cur, results, bank, checkpoint });
    },
    [cert, record, peek, setPlay]
  );

  const onNext = useCallback(() => {
    const cur = playRef.current;
    // The next question without an answer: a step that continues from earlier
    // answers passes over the questions that already have one. It follows a
    // press of Continue, so it takes the focus.
    const to = openFrom(cur.results, cur.i + 1);
    if (to >= 0) setPlay({ ...cur, i: to, takeFocus: true });
    else finishStop();
  }, [finishStop, setPlay]);

  // While the end of a step is read, the next step is asked for, so that
  // Continue has nothing to wait for. Only a step of questions that this
  // learner may open is asked for: a lab and a practice exam open through
  // their own screens.
  useEffect(() => {
    if (view.kind !== "end" || !signedIn) return;
    const stop = stopAt(plan, structure, next);
    if (!stop || stop.kind === "lab" || stop.kind === "rehearsal") return;
    if (next > plan.freeThrough && !pro) return;
    const input = stopInput(next, stop, p.progress);
    const key = stopKey(input);
    if (ahead.current?.key === key) return;
    const request = requestStop(input);
    const entry: { key: string; request: Promise<BuiltStop>; built: BuiltStop | null } = { key, request, built: null };
    ahead.current = entry;
    request.then(
      (built) => {
        entry.built = built;
      },
      () => {
        // The failure is met again, and said, when the step is asked for.
      }
    );
  }, [view.kind, signedIn, pro, next, plan, structure, p.progress, stopInput]);

  // The browser's Back. A learner who opens a step, a lab, the list of labs or
  // a practice exam gets one history entry for it, so that Back returns to the
  // home screen of the study path instead of leaving it. It is added only in
  // answer to something the person did, and only for someone with an account:
  // without one the introductory questions are the whole visit, and there is
  // no home screen to return to.
  const opened = useRef(false);
  const atHome =
    awaitingPro || view.kind === "home" || view.kind === "welcome" || view.kind === "unlocked";
  useEffect(() => {
    if (!ready) return;
    if (atHome) {
      // Back on the home screen through one of the page's own controls: the
      // entry that was added is given back, so Back from here leaves the page.
      if (opened.current) {
        opened.current = false;
        window.history.back();
      }
      return;
    }
    if (signedIn && acted.current && !opened.current) {
      opened.current = true;
      window.history.pushState({ [OPENED_ENTRY]: true }, "");
    }
  }, [screenKey, atHome, ready, signedIn]);

  // Whether an entry left by an earlier visit has been looked for.
  const staleEntryChecked = useRef(false);
  useEffect(() => {
    // A reload, or a return from another page, onto the entry that an earlier
    // visit added: this visit starts from the home screen, so the entry is
    // given back.
    if (!staleEntryChecked.current) {
      staleEntryChecked.current = true;
      if (isOpenedEntry(window.history.state)) window.history.back();
    }
    function onPop(event: PopStateEvent) {
      if (isOpenedEntry(event.state)) {
        // Forward, onto the entry of a screen that this page no longer holds.
        if (!opened.current) window.history.back();
        return;
      }
      if (!opened.current) return;
      opened.current = false;
      setView({ kind: "home" });
      window.scrollTo({ top: 0 });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setView]);

  // A screen that replaces another in answer to something the person did takes
  // the keyboard's focus at its heading, so that a screen reader reads the new
  // screen and the Tab key starts from its top. The wait after a payment ends
  // by itself, and hands the focus on in the same way. A question takes the
  // focus itself (RepCard), as do the practice exam's screens; a loading line
  // is a status and is read without the focus.
  const shownScreen = useRef(screenKey);
  useEffect(() => {
    const from = shownScreen.current;
    if (from === screenKey) return;
    shownScreen.current = screenKey;
    if (!acted.current && from !== "activating") return;
    window.scrollTo({ top: 0 });
    if (SELF_FOCUSING.has(view.kind) || view.kind === "loading" || awaitingPro) return;
    stageBody.current?.querySelector<HTMLElement>("[data-screen-title], h1")?.focus({ preventScroll: true });
  }, [screenKey, view.kind, awaitingPro]);

  // The learner asks for the account again with a "Try again" (the notice's
  // above the screen, or the offer's in place of its plans). When the account
  // then answers, the button that was pressed has gone: the notice goes, and
  // the offer shows its plans or gives way to the way on. The focus, which the
  // button held, would be left on nothing, so it moves to the title of the
  // screen, as it does when a screen changes. An offer that is still there has
  // already taken it for its own title (PathOffer), and anything else that has
  // taken the focus meanwhile keeps it.
  const askedAgain = useRef(false);
  const askAgain = useCallback(() => {
    askedAgain.current = true;
    return refreshAccess();
  }, [refreshAccess]);
  const { unreached } = p;
  useEffect(() => {
    if (unreached || !askedAgain.current) return;
    askedAgain.current = false;
    if (document.activeElement && document.activeElement !== document.body) return;
    stageBody.current?.querySelector<HTMLElement>("[data-screen-title], h1")?.focus({ preventScroll: true });
  }, [unreached]);

  // Where the learner belongs, decided each time the page learns who is here
  // or what their account holds: when it opens, when a slow sign-in service
  // answers at last, and when an account that could not be reached is reached.
  // Only someone who has not acted yet is moved: an answer given on the screen
  // keeps them where they are, and it is kept (the progress hook merges it).
  const welcomed = useRef(false);
  useEffect(() => {
    if (!p.ready || arrived.current === p.arrival) return;
    arrived.current = p.arrival;
    const cur = playRef.current;
    const answeredHere = cur.results.filter((r) => r !== null).length > (cur.resumed?.answered ?? 0);
    const undecided =
      view.kind === "welcome" || (view.kind === "play" && cur.stop.id === warmup.stop.id && !answeredHere);
    if (!undecided) return;

    // Signed out beside an account's path: offer that account before a blank one.
    if (!p.signedIn && p.held && hasStarted(p.held)) {
      setView({ kind: "welcome" });
      if (!welcomed.current) track("path_welcome_back_viewed", { cert });
      welcomed.current = true;
      return;
    }
    if (p.signedIn) {
      // An account's own screen is its home, once it has anything on it.
      setView(hasStarted(p.progress) ? { kind: "home" } : { kind: "play" });
      return;
    }
    // Nobody is signed in. A visitor who has finished the introductory
    // questions is asked to save them; one who left part-way (a reload, a tab
    // the phone discarded) carries on from the first question without an answer.
    if (isStopDone(p.progress, warmup.stop.id)) setView({ kind: "home" });
    else resumeWarmup(p.progress);
  }, [p.ready, p.arrival, p.progress, p.signedIn, p.held, cert, view.kind, warmup.stop.id, resumeWarmup, setView]);

  // A practice exam this device finished on the exam's public page counts on
  // the path: its misses come back, and with no checkpoint yet it becomes the
  // checkpoint, so its reveal and the offer come straight away. It waits until
  // the account has been reached: an exam must not stand in for a checkpoint
  // that the account already holds.
  const examChecked = useRef(false);
  useEffect(() => {
    if (!p.ready || !p.userId || p.unreached || examChecked.current) return;
    examChecked.current = true;
    const url = new URL(window.location.href);
    if (url.searchParams.has("from")) {
      url.searchParams.delete("from");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
    const run = readRun(`${cert}-practice-test`, "public");
    // An exam whose score was shown to another account is never read here.
    const exam = run ? examToImport(run, Date.now(), p.userId) : null;
    if (!run || !exam) return;
    // A public page keeps an exam for the device, not for a person. On a shared
    // computer it goes only to the account that it can be shown to belong to;
    // otherwise it is set aside, and it stays set aside.
    const mark = readExamMark(cert);
    if (!mayTakeExam(p.userId, { at: exam.result.at, claimedBy: run.claimedBy ?? null }, { foreign: p.foreign, mark })) {
      if (!run.claimedBy && mark?.at !== exam.result.at) writeExamMark(cert, { at: exam.result.at, by: null });
      return;
    }
    const asCheckpoint = p.importExam(exam.answers, exam.result);
    writeExamMark(cert, { at: exam.result.at, by: p.userId });
    if (!asCheckpoint) return;
    // The bank answers go to the account too, as a stop's do.
    const answers = run.reps.flatMap((rep, i) => {
      const pick = run.picks[i];
      const qid = questionIdOf(rep.id);
      if (!qid || pick === null) return [];
      return [{ questionId: qid, selectedIndex: rep.type === "choice" && rep.order ? (rep.order[pick] ?? pick) : pick }];
    });
    if (answers.length > 0) void api(recordPathAnswers, { cert, answers }).catch(() => {});
    track("path_checkpoint_completed", { cert, score: exam.result.score, source: "practice_exam" });
    setView({ kind: "reveal" });
    window.scrollTo({ top: 0 });
  }, [p, cert, setView]);

  // The first time Pro covers this exam on this device, open with what it
  // opened: in place of their map, or of a stop not yet answered (the first
  // paint's warm-up, which a started path is about to leave for the map).
  // Mid-stop it waits until they're back on the map.
  useEffect(() => {
    if (!p.ready || !p.signedIn || !pro || unlockChecked.current || awaitingPro) return;
    const untouched = view.kind === "play" && playRef.current.results.every((r) => r === null);
    if (view.kind !== "home" && !untouched) return;
    unlockChecked.current = true;
    if (!firstUnlock(cert)) return;
    track("path_unlock_viewed", { cert });
    setView({ kind: "unlocked" });
  }, [p.ready, p.signedIn, pro, cert, view.kind, awaitingPro, setView]);

  // What the step that has just ended changed in the outline: the objectives
  // whose standing is not what it was before the step, counted by where they
  // stand now. The sentence above the outline says so; no row is tinted for it.
  const endChange = useMemo(() => {
    if (view.kind !== "end") return null;
    // Finishing the step is part of the step: before it, the step was not
    // done, unless this was a second run of it.
    const doneBefore = new Set(doneStops);
    if ((p.progress.stops[view.stop.id]?.n ?? 0) <= 1) doneBefore.delete(view.stop.id);
    const counts = { complete: 0, started: 0, review: 0 };
    for (const code of objectiveCodes) {
      const now = standingOf(code);
      if (now === "new" || now === standingOf(code, doneBefore, play.before)) continue;
      counts[now]++;
    }
    return counts;
  }, [view, doneStops, p.progress.stops, objectiveCodes, standingOf, play.before]);

  // An exam version with a last day CompTIA has announced (SY0-701): a date
  // after it can't be this version, so the goal question points to the newer one.
  const newer = newerVersion(cert);
  const lastDay = LAST_EXAM_DAY[cert];
  const retiring =
    newer && lastDay
      ? { lastDay, code: EXAM_CODES[cert], newer: { code: EXAM_CODES[newer], href: `/path/${newer}` } }
      : undefined;

  /**
   * Keep the answer to the exam date question. The answer is saved with the
   * progress, so the page moves on at once; the request that makes this the
   * account's exam is sent beside it and is not waited for.
   */
  function saveGoalExam(examDate: string | null, target: string | null) {
    // A change of date keeps the daily study time that was given before.
    p.setGoal({ examDate, target, minutes: p.progress.goal?.minutes ?? null });
    track("path_goal_set", { cert, step: "exam", value: examDate ? "booked" : (target ?? "unknown") });
    // Make this their exam (with its date) so that reminders and Pro line up.
    void api(enrollInPath, { cert, examDate }).then(
      ({ enrolled }) => {
        // A Pro member who has just claimed their first exam can now open all of it.
        if (enrolled && p.proPlan && !pro) void refreshAccess();
      },
      () => {
        // The study path does not depend on it: the goal is saved with the progress.
      }
    );
  }

  /** The exam's date as the learner gave it, for the home screen: booked, or the date they aim for. */
  const goal = p.progress.goal;
  const examDay = goal?.examDate ?? goal?.target ?? null;

  // The save ask is for a visitor who has finished the introductory questions.
  // One who has only begun them is given the questions, never an account wall.
  const anonymousDone = !p.signedIn && isStopDone(p.progress, plan.stops[0].id);
  // The offer stands on the home screen once the next step is one that Pro
  // opens and the checkpoint has given its result. It is made only to an
  // account that is known not to have Pro.
  const offerOnHome = p.signedIn && next > plan.freeThrough && shut && p.progress.checkpoint !== null;

  // Under the outline, for someone without Pro: what is free, and what Pro adds.
  // Where the exam has the usual number of free labs the sentence is the
  // outline's own (MapLegend); an exam with no public page of labs, or with
  // fewer labs, is given a sentence that is true of it.
  const freeNote = !shut ? null : labs.size > 0 && freeLabIds.size === FREE_LAB_COUNT ? (
    <MapLegend labs="locked" />
  ) : (
    <p className="text-small text-muted-foreground">
      {labs.size === 0
        ? "One practice exam is free. Further practice exams are included with Pro."
        : freeLabIds.size > 0
          ? `One practice exam and ${freeLabIds.size} ${freeLabIds.size === 1 ? "lab" : "labs"} are free. Further labs and practice exams are included with Pro.`
          : "One practice exam is free. Hands-on labs and further practice exams are included with Pro."}
    </p>
  );

  // ─── Screens ──────────────────────────────────────────────────────────────

  let screen: React.ReactNode;
  // Whether the screen that is showing offers to try again itself. The screen
  // of a step that could not be loaded does. So does the offer (under the
  // checkpoint's result, or on the home screen) while the account has not been
  // reached: it says so in place of its plans, and offers to try again there.
  // The notice above the screen then leaves its own button out, so that the
  // page shows one way to try again and not two (PathNotices).
  let screenRetries = false;

  if (awaitingPro) {
    screen = paidSignedOut ? (
      <PathPaidSignIn
        cert={cert}
        onContinue={() => {
          // Someone who will sign in later, or who did not pay: the visit goes on as any other.
          dropUpgradedFlag();
          setLanding({ done: true });
        }}
      />
    ) : (
      <PathActivating examName={structure.examName} slow={slow} onCheck={() => void refreshAccess()} />
    );
  } else if (view.kind === "welcome") {
    screen = (
      <WelcomeBack
        cert={cert}
        examName={structure.examName}
        stopsDone={p.held ? stopsDone(plan, p.held) : 0}
        onPlay={() => {
          track("path_welcome_back_played", { cert });
          // Guest work kept from before: once it has finished the introductory
          // questions it carries on from home, where it can be saved. Until
          // then the questions go on from the first one without an answer.
          if (isStopDone(p.progress, warmup.stop.id)) setView({ kind: "home" });
          else resumeWarmup(p.progress);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else if (view.kind === "play") {
    const rep = play.reps[play.i];
    // A learn step is one objective, named in the heading; other steps mix
    // objectives, so each question says which one it belongs to.
    const objective =
      rep && play.stop.kind !== "learn"
        ? structure.domains.flatMap((d) => d.objectives).find((o) => o.code === rep.objective)
        : undefined;
    screen = (
      // One screen and one thing on it: the question. Where the step sits is
      // said in a line above it; the course outline waits on the path's home.
      <div className="grid gap-4">
        <div className="grid gap-2.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            {/* The screen's title. The question under it is the next heading. */}
            <h1 className="min-w-0 text-body font-semibold">
              {play.focus === "misses" ? "Review" : stopLabel(play.stop, total)}
            </h1>
            {/* This line and the objective's line below are each given a new
                element when their words change. A browser that translates the
                page replaces the text of a line it has translated, and React
                can then no longer change that text; a new element is always
                drawn with the right words. */}
            <p key={play.i} className="shrink-0 text-small tabular-nums text-muted-foreground">
              Question {play.i + 1} of {play.reps.length}
            </p>
          </div>
          <StopProgress results={play.results} current={play.i} />
        </div>
        <div className="glass grid grid-cols-[minmax(0,1fr)] gap-4 rounded-lg p-5 sm:p-8">
          {/* One line above the question: the objective that it belongs to. */}
          {objective && (
            <p key={objective.code} className="text-small text-muted-foreground">
              Objective {objective.code}: {objective.title}.
            </p>
          )}
          {rep && (
            <RepCard
              key={`${play.stop.id}-${play.i}-${rep.id}`}
              rep={rep}
              onAnswer={onAnswer}
              onNext={onNext}
              takeFocus={play.takeFocus}
              // A step that continues from earlier answers says so above its first question.
              preface={
                play.resumed && play.i === play.resumed.at
                  ? `You answered ${play.resumed.answered} of the ${play.reps.length} introductory questions earlier. The questions continue from here.`
                  : undefined
              }
            />
          )}
        </div>
      </div>
    );
  } else if (view.kind === "loading") {
    screen = (
      // The question card's own frame, so that only its contents change when the step arrives.
      <div
        role="status"
        className="glass grid min-h-80 place-items-center rounded-lg p-5 text-small text-muted-foreground sm:p-8"
      >
        {/* The sentence is this screen's title for as long as the wait lasts. */}
        <h1 className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {view.label ?? "Your next step is being prepared."}
        </h1>
      </div>
    );
  } else if (view.kind === "error") {
    screenRetries = true;
    screen = (
      <div className="glass grid min-h-80 place-content-center justify-items-center gap-4 rounded-lg p-5 text-center sm:p-8">
        {/* The screen's title: what went wrong, in a sentence. It takes the focus
            when it replaces the loading line, so that it is read. */}
        <h1 data-screen-title tabIndex={-1} className="cb-measure-xs text-small">
          {view.message}
        </h1>
        <Button
          onClick={() => {
            // The one "Try again" on this screen. While the account has not
            // been reached either, it is asked again as well: both most often
            // fail for the one reason, and come back together.
            if (p.unreached) void refreshAccess();
            view.retry();
          }}
        >
          <RotateCcw aria-hidden />
          Try again
        </Button>
      </div>
    );
  } else if (view.kind === "rehearsal-intro") {
    screen = (
      <RehearsalIntro
        structure={structure}
        stopNumber={view.asStop && rehearsalStop ? rehearsalStop.index + 1 : null}
        reading={reading}
        onStart={(size) => void startRehearsal(size, view.asStop)}
        onBack={() => {
          setView({ kind: "home" });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else if (view.kind === "rehearsal" && runInProgress) {
    screen = (
      <RehearsalPlayer
        key={runInProgress.startedAt}
        run={runInProgress}
        examCode={structure.examCode}
        // The line that names the exam is this screen's title.
        titleAs="h1"
        onChange={saveRun}
        onFinish={finishRehearsal}
        onLeave={() => {
          setView({ kind: "home" });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else if (view.kind === "rehearsal-result" && run?.done) {
    // Wrong and blank alike: both counted against the score.
    const missedHere = run.reps.filter((rep, i) => run.picks[i] !== rep.answer).map((rep) => rep.id);
    screen = (
      // The result is this screen's title.
      <RehearsalResult run={{ ...run, done: run.done }} structure={structure} headlineAs="h1">
        {missedHere.length > 0 && (
          <ReviewMissesCard count={missedHere.length} onReview={() => void startReview("rehearsal", missedHere)} />
        )}
        <ContinueCard stop={nextStop} total={total} minutes={labMinutes(nextStop)} onContinue={() => startStop(next)} />
      </RehearsalResult>
    );
  } else if (view.kind === "lab") {
    const { stop, scenario, graded, from } = view;
    const minutes = library.find((l) => l.id === scenario.id)?.minutes ?? labMinutes(stop);
    const fromLibrary = from === "library";
    const nextLab = fromLibrary && graded ? nextLabAfter(scenario.id) : null;
    const leave = () => {
      setView(fromLibrary ? { kind: "labs" } : { kind: "home" });
      window.scrollTo({ top: 0 });
    };
    screen = (
      <div className="path-rise grid gap-5">
        {/* The screen's title. The lab's own name is the heading under it, in the player. */}
        <h1 tabIndex={-1} className="text-body font-semibold">
          Hands-on lab for domain {domainLabel(scenario.domain_number)}
          {minutes ? (
            <span className="font-normal text-muted-foreground">. It takes about {minutes} minutes.</span>
          ) : null}
        </h1>
        {/* min-w-0: a lab's tab row doesn't wrap, and would widen a phone's page. */}
        <div className="glass min-w-0 rounded-lg p-4 sm:p-6">
          <PbqPlayer
            key={scenario.id}
            scenario={scenario}
            backLabel={fromLibrary ? "Return to the labs" : "Return to the study path"}
            onGraded={(result) => onLabGraded(view, result, !graded)}
            onBack={leave}
          />
        </div>
        {graded &&
          (fromLibrary ? (
            nextLab && <NextLabCard lab={nextLab} onOpen={() => void openLibraryLab(nextLab)} />
          ) : (
            <ContinueCard stop={nextStop} total={total} minutes={labMinutes(nextStop)} onContinue={() => startStop(next)} />
          ))}
      </div>
    );
  } else if (view.kind === "labs") {
    screen = (
      <LabLibrary
        structure={structure}
        results={labResults}
        onOpen={(lab) => void openLibraryLab(lab)}
        onBack={() => {
          setView({ kind: "home" });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else if (view.kind === "unlocked") {
    const lab = plan.stops.find((s) => s.kind === "lab" && !isStopDone(p.progress, s.id));
    screen = (
      <PathUnlocked
        structure={structure}
        plan={plan}
        progress={p.progress}
        statuses={statuses}
        doneStops={doneStops}
        labs={labs}
        rehearsal={mapRehearsal}
        labsLeft={library.length > 0 ? library.length - labResults.size : undefined}
        firstLab={
          lab && lab.index !== next
            ? { title: lab.title, minutes: labMinutes(lab), onOpen: () => startStop(lab.index) }
            : null
        }
      >
        <ContinueCard stop={nextStop} total={total} minutes={labMinutes(nextStop)} onContinue={() => startStop(next)} />
      </PathUnlocked>
    );
  } else if (view.kind === "goal") {
    const { then } = view;
    const toHome = () => {
      setView({ kind: "home" });
      window.scrollTo({ top: 0 });
    };
    screen = (
      <div className="glass rounded-lg p-5 sm:p-8">
        <GoalStep
          step={view.step}
          examName={structure.examName}
          retiring={retiring}
          // Asked before a step, the next question follows at once. Opened from
          // the home screen to change the date, it returns there.
          onExam={(examDate, target) => {
            saveGoalExam(examDate, target);
            if (then === null) toHome();
            else setView({ kind: "goal", step: "minutes", then });
          }}
          onMinutes={(minutes) => {
            p.setGoal({
              examDate: p.progress.goal?.examDate ?? null,
              target: p.progress.goal?.target ?? null,
              minutes,
            });
            track("path_goal_set", { cert, step: "minutes", value: String(minutes) });
            if (then === null) toHome();
            else void startStopAfterGoal(then);
          }}
          onCancel={then === null ? toHome : undefined}
        />
      </div>
    );
  } else if (view.kind === "intro") {
    screen = (
      <div className="glass path-rise grid gap-5 rounded-lg p-5 sm:p-8">
        <div className="grid gap-2">
          <p className="cb-label text-muted-foreground">Step {view.index + 1}</p>
          <h1 tabIndex={-1} className="cb-section">
            The readiness checkpoint
          </h1>
        </div>
        <p className="cb-measure text-body text-muted-foreground">
          The checkpoint has {CHECKPOINT_SIZE} exam-style questions drawn from all {structure.domains.length} domains,
          weighted as they are in the real {structure.examCode} exam. Some questions cover material that you have not
          studied yet. This is intended, because the checkpoint shows where you stand across the whole exam.
        </p>
        <Button
          size="lg"
          className="w-full sm:w-auto sm:justify-self-start"
          onClick={() => startStop(view.index, { skipIntro: true })}
        >
          Start the checkpoint
          <ArrowRight aria-hidden />
        </Button>
      </div>
    );
  } else if (view.kind === "reveal") {
    const result = p.progress.checkpoint;
    // The offer stands under the result; without a result this is the home
    // screen, which draws the offer by its own rule.
    screenRetries = (result ? shut : offerOnHome) && !p.certId;
    screen = result ? (
      <PathReveal
        result={result}
        structure={structure}
        goal={p.progress.goal}
        remainingStops={remaining}
        studied={plan.stops.filter((s) => s.kind === "learn" && isStopDone(p.progress, s.id)).length}
        fromExam={checkpointFromExam(p.progress)}
      >
        {/* The offer is made only to an account that is known not to have Pro. */}
        {!shut ? (
          <ContinueCard stop={nextStop} total={total} minutes={labMinutes(nextStop)} onContinue={() => startStop(next)} />
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
              labCount={library.length}
              // The server has refused a step, but the account itself may still
              // be out of reach: the offer then asks for it again from here.
              onRetry={askAgain}
            />
            <button
              type="button"
              onClick={() => {
                setView({ kind: "home" });
                window.scrollTo({ top: 0 });
              }}
              className="cb-link cb-tap justify-self-center text-small"
            >
              Return to the study path
            </button>
          </>
        )}
      </PathReveal>
    ) : (
      renderHome()
    );
  } else if (view.kind === "end") {
    const missed = view.total - view.correct;
    const reviewed = view.focus === "misses";
    // What ended: a review, the introductory questions or a numbered step.
    const ended =
      view.stop.kind === "review" || reviewed
        ? { done: "You have completed this review.", subject: "This review" }
        : view.stop.kind === "warmup"
          ? { done: "You have completed the introductory questions.", subject: "These questions" }
          : { done: `You have completed step ${view.stop.index + 1}.`, subject: "This step" };
    screen = (
      <div className="path-rise grid gap-6">
        <div className="grid min-w-0 gap-6">
          <div className="grid gap-2.5">
            <p className="cb-label text-muted-foreground">{ended.done}</p>
            {/* The screen's title: the result. It takes the focus as the screen arrives. */}
            <h1 tabIndex={-1} className="cb-section">
              You answered {view.correct} of {view.total} questions correctly.
            </h1>
            <p className="text-body text-muted-foreground">
              {reviewed
                ? `${
                    toReview > 0
                      ? `${toReview} more ${toReview === 1 ? "question remains" : "questions remain"} to review.`
                      : "There is nothing left to review today."
                  } Questions that you answered correctly will be asked once more in a few days.`
                : missed === 0
                  ? "No questions need to be repeated."
                  : `${missed} ${missed === 1 ? "question" : "questions"} will be repeated in your next step.`}
            </p>
          </div>

          {/* The way on comes before the outline, which is long on a phone. */}
          {p.signedIn ? (
            <ContinueCard
              stop={nextStop}
              total={total}
              minutes={labMinutes(nextStop)}
              onContinue={() => startStop(next)}
              locked={next > plan.freeThrough && shut}
            />
          ) : (
            <SaveCard cert={cert} next={nextStop} onSaved={onSaved} />
          )}
          {reviewed && toReview > 0 && (
            <Button variant="outline" size="lg" className="justify-self-start" onClick={() => void startReview("end")}>
              <RotateCcw aria-hidden />
              Review {Math.min(toReview, PRACTICE_SIZE)} more questions
            </Button>
          )}
        </div>

        <div className="glass grid gap-6 rounded-lg p-5 sm:p-8">
          <div className="grid gap-1.5">
            <h2 className="cb-statement">{structure.examName} objectives</h2>
            {/* What this step changed in the outline below, in the outline's own
                words, and then the running count on the same basis. */}
            <p className="text-small text-muted-foreground">
              {endChange && changeSentence(ended.subject, endChange)}
              In all, you have started {objectivesStarted} of {objectiveCodes.length} objectives.
            </p>
          </div>
          <ExamMap
            structure={structure}
            statuses={statuses}
            doneStops={doneStops}
            current={nextStop ? new Set(nextStop.objectives.length > 3 ? [] : nextStop.objectives) : undefined}
            labs={labs}
            rehearsal={mapRehearsal}
          />
          {freeNote}
        </div>
      </div>
    );
  } else {
    screenRetries = offerOnHome && !p.certId;
    screen = renderHome();
  }

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <PathHeader
        cert={cert}
        examName={structure.examName}
        version={examVersions(cert).length ? EXAM_CODES[cert] : undefined}
        signedIn={p.signedIn}
        email={p.email}
        ready={p.ready}
        onHome={() => {
          setView({ kind: "home" });
          window.scrollTo({ top: 0 });
        }}
      />
      {/* One column for every screen, as wide as the bar above it: the page
          does not change width when a step loads, opens or ends. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-3xl flex-1 px-4 pb-20 pt-6 outline-none sm:px-6 sm:pt-10"
      >
        {/*
          The stage. A first visit sees the introductory questions at once. A
          returning learner's stage is held until the page knows where they
          are: its body is hidden, and the style rules beside
          `html[data-path-returning]` in globals.css show the two sentences
          below when their time comes (path-hold.ts). They are in the server's
          HTML, so they appear when the page's scripts are slow or never arrive.
        */}
        <div className="path-stage" data-ready={p.ready ? "true" : "false"}>
          {!p.ready && (
            // A status, so that it is announced. Its sentence is the title of
            // the held stage: while it is shown, nothing else is on the screen.
            // (On a first visit it is never shown, and the question's own title stands.)
            <div className="path-wait mb-6" role="status">
              <h1 className="text-body text-muted-foreground">Your study path is loading.</h1>
            </div>
          )}
          {/* Always in the page, and empty until there is something to say, so
              that a sentence arriving in it is announced. */}
          <PathNotices
            unreached={p.ready && p.signedIn && p.unreached}
            saveFailed={p.ready && p.signedIn ? p.saveFailed : null}
            storageRefused={p.ready && !p.signedIn && !p.deviceSaves}
            retryOnScreen={screenRetries}
            onRetry={askAgain}
          />
          <div ref={stageBody} className="path-stage-body">
            {screen}
          </div>
          {!p.ready && (
            <p className="path-late mt-6 text-body" role="alert">
              Your study path could not be loaded. Please check your connection and{" "}
              <a href="" className="cb-link">
                reload the page
              </a>
              .
            </p>
          )}
        </div>
      </main>
    </div>
  );

  async function startStopAfterGoal(index: number) {
    // Goal answers just landed in state; start the stop they were waiting on.
    const stop = stopAt(plan, structure, index);
    if (stop?.kind === "checkpoint") setView({ kind: "intro", index });
    else if (stop?.kind === "rehearsal") setView({ kind: "rehearsal-intro", asStop: true });
    else await startStopDirect(index);
  }

  /** Draw a rehearsal and start it, the clock with it. */
  async function startRehearsal(size: RehearsalSize, asStop: boolean) {
    const owner = p.userId;
    if (!owner) return;
    setView({ kind: "loading", label: "Your practice exam is being prepared." });
    const asked = moves.current;
    try {
      const drawn = await api(getPathRehearsal, {
        cert,
        size,
        seen: seenIds(p.progress.items),
        run: p.progress.rehearsals.length,
      });
      // The learner has gone elsewhere meanwhile: no exam is started, and no clock with it.
      if (moves.current !== asked) return;
      const reps = drawn.reps.filter((r): r is ChoiceRep => r.type === "choice");
      saveRun({
        v: 1,
        owner,
        size,
        asStop,
        reps,
        picks: reps.map(() => null),
        flagged: [],
        i: 0,
        spentMs: 0,
        limitMs: drawn.minutes * 60_000,
        startedAt: Date.now(),
        done: null,
      });
      track("path_rehearsal_started", { cert, size, from: asStop ? "stop" : "home" });
      setView({ kind: "rehearsal" });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = codeOf(err);
      if (code === "quota_exceeded") {
        setWalled(true);
        await refreshAccess();
      }
      if (moves.current !== asked) return;
      if (code === "unauthorized") {
        setView({ kind: "home" });
      } else if (code === "quota_exceeded") {
        setView({ kind: "reveal" });
      } else {
        setView({
          kind: "error",
          message: userMessage(err, EXAM_NOT_PREPARED),
          retry: () => void startRehearsal(size, asStop),
        });
      }
    }
  }

  /**
   * Score a rehearsal and keep it: every answer counts toward the map and the
   * account like a stop's, misses come back later, and the result stays on the
   * device to look back over. Finished once every other stop is done, it's the
   * path's last stop done too.
   */
  function finishRehearsal(cur: RehearsalRun, timedOut: boolean) {
    const at = Date.now();
    const before = latestReading(p.progress);
    const answers = cur.reps.map((rep, i) => ({ domain: domainOf(rep.objective), correct: cur.picks[i] === rep.answer }));
    const answered = cur.picks.filter((pick) => pick !== null).length;
    const correct = answers.filter((a) => a.correct).length;
    const seconds = Math.round(cur.spentMs / 1000);
    const result = scoreRehearsal(answers, structure.domains, { size: cur.size, answered, seconds, at });
    const lastStop = rehearsalStop && nextStopIndex(plan, p.progress) === rehearsalStop.index ? rehearsalStop : null;

    p.finishRehearsal(
      cur.reps.flatMap((rep, i) => (cur.picks[i] === null ? [] : [{ repId: rep.id, correct: cur.picks[i] === rep.answer }])),
      result,
      lastStop ? { id: lastStop.id, correct, total: cur.reps.length } : null
    );
    // Record against the bank's own option order, not the shuffled display.
    const bank = cur.reps.flatMap((rep, i) => {
      const picked = cur.picks[i];
      const questionId = questionIdOf(rep.id);
      return picked === null || !questionId ? [] : [{ questionId, selectedIndex: rep.order?.[picked] ?? picked }];
    });
    if (bank.length > 0) void api(recordPathAnswers, { cert, answers: bank.slice(0, 120) }).catch(() => {});

    saveRun({ ...cur, done: { result, before, timedOut } });
    track("path_rehearsal_completed", {
      cert,
      size: cur.size,
      score: result.score,
      answered,
      total: cur.reps.length,
      minutes: Math.round(seconds / 60),
      timed_out: timedOut,
    });
    if (lastStop) {
      track("path_stop_completed", {
        cert,
        stop: lastStop.id,
        index: lastStop.index,
        kind: lastStop.kind,
        correct,
        total: cur.reps.length,
        signed_in: true,
      });
    }
    setView({ kind: "rehearsal-result" });
    window.scrollTo({ top: 0 });
  }

  /**
   * A review round: their misses alone, a practice round's worth, oldest first
   * (`first` ahead of the rest: a rehearsal's own misses, say). It plays like a
   * stop, and a right answer turns its objective back to covered on the map.
   */
  async function startReview(from: "home" | "rehearsal" | "end", first: readonly string[] = []) {
    const due = reviewIds(p.progress.items, Date.now());
    const missed = [...new Set([...first, ...due])].slice(0, MAX_MISSED_SENT);
    if (missed.length === 0) return;
    setView({ kind: "loading", label: "The questions for review are being collected." });
    const asked = moves.current;
    try {
      const built = await requestStop({
        cert,
        index: total,
        seen: seenIds(p.progress.items),
        missed,
        run: p.progress.stops.review?.n ?? 0,
        focus: "misses",
      });
      retire(built.retired);
      if (moves.current !== asked) return;
      if (built.reps.length === 0) {
        setView({ kind: "home" });
        return;
      }
      track("path_review_started", { cert, from, reps: built.reps.length });
      setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(p.progress.items), "misses"));
      setView({ kind: "play" });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = codeOf(err);
      if (code === "quota_exceeded") {
        setWalled(true);
        await refreshAccess();
      }
      if (moves.current !== asked) return;
      if (code === "unauthorized") {
        setView({ kind: "home" });
      } else if (code === "quota_exceeded") {
        setView({ kind: "reveal" });
      } else {
        setView({
          kind: "error",
          message: userMessage(err, REVIEW_NOT_LOADED),
          retry: () => void startReview(from, first),
        });
      }
    }
  }

  /** Throw away a rehearsal in progress. */
  function discardRehearsal() {
    clearRun(cert);
    setRunState(null);
  }

  /**
   * Fetch and play a step without the checks that come between steps, for the
   * moments when this render's state is a step behind: right after the progress
   * has been saved to a new account, or right after a planning question has
   * been answered. It reads the progress as it is at that moment.
   */
  async function startStopDirect(index: number) {
    const stop = stopAt(plan, structure, index);
    if (!stop) return;
    const got = fetchStop(index, stop, peek().progress);
    if (!("built" in got)) setView({ kind: "loading" });
    const asked = moves.current;
    try {
      const built = "built" in got ? got.built : await got.request;
      retire(built.retired);
      if (moves.current !== asked) return;
      if (built.lab) {
        openLab(built.stop, built.lab);
        return;
      }
      setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(peek().progress.items)));
      setView({ kind: "play" });
      window.scrollTo({ top: 0 });
    } catch (err) {
      const code = codeOf(err);
      if (code === "quota_exceeded") {
        setWalled(true);
        await refreshAccess();
      }
      if (moves.current !== asked) return;
      if (code === "unauthorized") {
        setView({ kind: "home" });
      } else if (code === "quota_exceeded") {
        setView({ kind: "reveal" });
      } else {
        setView({
          kind: "error",
          message: userMessage(err, STEP_NOT_LOADED),
          retry: () => startStop(index, { skipIntro: true }),
        });
      }
    }
  }

  /**
   * They just signed up or signed in on the save card: play the step it named.
   * An account that is further along goes to its home screen, where the way on
   * is current, and so does a checkpoint, which has its planning questions and
   * its introduction first.
   */
  async function onSaved(uid: string, email: string | undefined, method: "email_signup" | "email_login") {
    const merged = await p.linkAccount(uid, email, method);
    const to = nextStopIndex(plan, merged);
    if (to === next && to < plan.freeThrough) await startStopDirect(to);
    else setView({ kind: "home" });
  }

  /**
   * Bring a card on the home screen into view (the offer, the save card) and
   * move the keyboard's focus to it: to the email field of the save card, so
   * that typing can begin, and otherwise to the card itself, so that it is read.
   */
  function reveal(id: string) {
    const card = document.getElementById(id);
    if (!card) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    card.scrollIntoView?.({ behavior: still ? "auto" : "smooth", block: "start" });
    (card.querySelector<HTMLElement>('input[type="email"]') ?? card).focus({ preventScroll: true });
  }

  /**
   * What an opened row of the outline says and offers: an objective's step to
   * start or repeat, what is still ahead, what is free on one of the exam's
   * public pages, or what Pro includes. Repeating a step is included with Pro
   * (the owner's decision of November 16, 2026): a free learner sees their
   * score and, once past the checkpoint, the way to the offer.
   *
   * A row offers only what its action really opens. "Save my progress" is
   * offered on the row of a step that a free account opens, and never under a
   * row that an account does not open.
   */
  function tileInfo(key: MapTile): TileInfo | null {
    const result = p.progress.checkpoint;
    // The offer is on the home screen once the next step is one that Pro
    // opens; before that it is under the checkpoint's result.
    const toOffer = (): TileAction | undefined =>
      p.signedIn && result && shut
        ? {
            label: "See what Pro includes",
            kind: "offer",
            run: () => {
              if (offerOnHome) reveal("path-offer");
              else setView({ kind: "reveal" });
            },
          }
        : undefined;

    // `shut`, not `!pro`: while the account has not been reached, nothing here
    // says "included with Pro", and what is pressed asks the server.
    if (key === REHEARSAL_TILE) {
      const title = "Practice exam";
      const format = `The practice exam has ${REHEARSAL_FORMATS.full.questions} questions and a time limit of ${REHEARSAL_FORMATS.full.minutes} minutes.`;
      if (shut) {
        // One practice exam is free for everyone, on the exam's public page.
        return {
          state: "free",
          title,
          line: `${format} One practice exam is free, and it opens on its own page. Further practice exams are included with Pro.`,
          action: { label: "Open the free practice exam", kind: "free_exam", href: free.examHref },
        };
      }
      return {
        state: lastRehearsal ? "done" : "open",
        title,
        line: lastRehearsal
          ? `Your last result was ${lastRehearsal.score}% on ${fmtDay(lastRehearsal.at)}.`
          : `${format} Your result is compared with the readiness target.`,
        action: {
          label: lastRehearsal ? "Take it again" : "Start",
          kind: "rehearsal",
          run: () => {
            setView({ kind: "rehearsal-intro", asStop: false });
            window.scrollTo({ top: 0 });
          },
        },
      };
    }

    if (key.startsWith("lab:")) {
      const domain = structure.domains.find((d) => labTileKey(d.number) === key);
      const lab = domain?.lab;
      if (!domain || !lab) return null;
      const info = library.find((l) => l.id === lab.id);
      const record = labResults.get(lab.id);
      if (shut || !info) {
        const what = "This lab works like the exam's performance-based questions and is graded with partial credit.";
        // Free for everyone on the exam's public page of labs: the row leads there.
        if (shut && free.labsHref && freeLabIds.has(lab.id)) {
          return {
            state: "free",
            title: lab.title,
            line: `${what} It is free, and it opens on the page of free ${structure.examName} labs.`,
            action: { label: "Open the free labs", kind: "free_labs", href: free.labsHref },
          };
        }
        return { state: "locked", title: lab.title, line: `${what} It is included with Pro.`, action: toOffer() };
      }
      return {
        state: record ? "done" : "open",
        title: lab.title,
        line: record
          ? `You scored ${record.c} of ${record.t} on ${fmtDay(record.at)}.`
          : `This lab takes about ${lab.minutes} minutes and is graded with partial credit.`,
        action: { label: record ? "Repeat the lab" : "Open the lab", kind: "lab", run: () => void openLibraryLab(info) },
      };
    }

    // An objective, and the step that teaches it.
    const objective = structure.domains.flatMap((d) => d.objectives).find((o) => o.code === key);
    if (!objective) return null;
    const status = statuses.get(key) ?? "new";
    const base = { title: objective.title };
    const index = plan.stops.findIndex((s) => s.kind === "learn" && s.objectives.includes(key));
    if (!p.signedIn) {
      // A free account opens the first study step and the readiness checkpoint.
      // Only the row of a step that it opens offers to save the progress.
      if (index >= 0 && index <= plan.freeThrough) {
        return {
          ...base,
          state: "anonymous",
          line: "A free account saves your progress and opens your first study step and the readiness checkpoint.",
          action: anonymousDone
            ? { label: "Save my progress", kind: "save", run: () => reveal("path-save") }
            : undefined,
        };
      }
      return {
        ...base,
        state: "anonymous",
        line: "This objective is taught later in the study path. The steps after the readiness checkpoint are included with Pro.",
      };
    }
    if (index < 0) return { ...base, state: "none" };
    const record = p.progress.stops[plan.stops[index].id];
    const locked = index > plan.freeThrough && shut;
    if (record && record.n > 0) {
      const ran = `You answered ${record.c} of ${record.t} questions correctly on ${fmtDay(record.at)}.`;
      if (shut) {
        return { ...base, state: "done", line: `${ran} Repeating a completed step is included with Pro.`, action: toOffer() };
      }
      // The account has not been reached: the result is shown, and nothing is offered or sold.
      if (!pro) return { ...base, state: "done", line: ran };
      return {
        ...base,
        state: "done",
        line: `${ran}${status === "missed" ? " The questions you missed will return in your next steps." : ""}`,
        action: { label: "Repeat this step", kind: "replay", run: () => void startStop(index) },
      };
    }
    // Past the free steps, even the next one is opened by Pro.
    if (locked) {
      return {
        ...base,
        state: "locked",
        line: result
          ? "This objective is included with Pro."
          : "This objective is included with Pro, which is offered after your readiness checkpoint.",
        action: toOffer(),
      };
    }
    if (index === next) {
      return {
        ...base,
        state: "next",
        line: "This objective is taught in your next step.",
        action: { label: "Start", kind: "start", run: () => void startStop(index) },
      };
    }
    const stepsAway = index - next;
    return {
      ...base,
      state: "later",
      line:
        stepsAway === 1
          ? "This objective is taught in the step after your next one."
          : `This objective is taught ${stepsAway} steps from now.`,
    };
  }

  function pickTile(key: MapTile | null) {
    setTile(key);
    if (key) track("path_map_tile_opened", { cert, tile: key, state: tileInfo(key)?.state ?? "none" });
  }

  function renderTileDetail(key: MapTile) {
    const info = tileInfo(key);
    if (!info) return null;
    const action = info.action;
    // As tall as a thumb needs on a phone, where it also takes the row's width.
    const size = "h-11 w-full shrink-0 sm:h-10 sm:w-auto";
    return (
      <div
        role="region"
        aria-label={info.title}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-md bg-surface px-4 py-3"
      >
        {info.line && <p className="min-w-0 flex-1 basis-64 text-small">{info.line}</p>}
        {action &&
          ("href" in action ? (
            // What is free is on one of the exam's public pages: a link, which leaves the study path.
            <Button asChild className={size}>
              <Link href={action.href} onClick={() => track("path_map_action", { cert, tile: key, action: action.kind })}>
                {action.label}
              </Link>
            </Button>
          ) : (
            <Button
              className={size}
              onClick={() => {
                track("path_map_action", { cert, tile: key, action: action.kind });
                setTile(null);
                action.run();
              }}
            >
              {action.label}
              {/* The arrow means one thing: this starts or continues study. */}
              {STUDY_ACTIONS.has(action.kind) && <ArrowRight aria-hidden />}
            </Button>
          ))}
      </div>
    );
  }

  function renderHome() {
    return (
      <div className="path-rise grid gap-6">
        <div className="grid min-w-0 gap-6">
          <div className="grid gap-3">
            <p className="cb-label text-muted-foreground">{structure.examCode}</p>
            {/* The screen's title. It takes the focus when the learner returns here from a step. */}
            <h1 tabIndex={-1} className="cb-section">
              Your {structure.examName} study path
            </h1>
            {/* How far along: the bar draws it, and the sentence under it says it. */}
            <div className="mt-1 grid gap-2.5">
              <ProgressBar value={(Math.min(next, total) / Math.max(1, total)) * 100} size="lg" still />
              <p className="text-small text-muted-foreground">
                You have completed {Math.min(next, total)} of {total} steps and started {objectivesStarted} of{" "}
                {objectiveCodes.length} objectives.
                {reading && (
                  <>
                    {" "}
                    Your last {reading.source === "rehearsal" ? "practice exam" : "checkpoint"} result was {reading.score}%.
                  </>
                )}
              </p>
              {/* The exam date sets the pace of the study path, and it can be changed here at any time. */}
              {p.signedIn && examDay && (
                <p className="text-small text-muted-foreground">
                  {goal?.examDate ? "Your exam is booked for" : "You plan to take the exam by"} {longDate(examDay)}.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setView({ kind: "goal", step: "exam", then: null });
                      window.scrollTo({ top: 0 });
                    }}
                    className="cb-link cb-tap"
                  >
                    Change my exam date
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* A practice exam left part-way comes first: its clock is waiting. */}
          {pro && runInProgress && (
            <RehearsalResumeCard
              run={runInProgress}
              onResume={() => {
                setView({ kind: "rehearsal" });
                window.scrollTo({ top: 0 });
              }}
              onDiscard={discardRehearsal}
            />
          )}

          {anonymousDone ? (
            <div id="path-save" tabIndex={-1} className="scroll-mt-24">
              <SaveCard cert={cert} next={nextStop} onSaved={onSaved} />
            </div>
          ) : offerOnHome ? (
            // It takes the focus when a row of the outline leads here, so that it is read.
            <div id="path-offer" tabIndex={-1} className="scroll-mt-24">
              <PathOffer
                cert={cert}
                certId={p.certId}
                examName={structure.examName}
                remainingStops={remaining}
                questionCount={questionCount}
                proPlan={p.proPlan}
                examDate={p.progress.goal?.examDate ?? null}
                context="home"
                labCount={library.length}
                onRetry={askAgain}
              />
            </div>
          ) : (
            <ContinueCard stop={nextStop} total={total} minutes={labMinutes(nextStop)} onContinue={() => startStop(next)} />
          )}

          {/* What a Pro member can practice whenever they like, under the way
              on: the whole exam (unless it is already next), every lab, and the
              questions they have to review. */}
          {pro && (
            <PracticeCard
              rows={[
                ...(!runInProgress && nextStop?.kind !== "rehearsal"
                  ? [
                      {
                        key: "rehearsal",
                        Icon: Timer,
                        title: "Practice exam",
                        detail: lastRehearsal ? (
                          <>
                            Your last result was {lastRehearsal.score}% on {fmtDay(lastRehearsal.at)}.
                            {run?.done && (
                              <>
                                {" "}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setView({ kind: "rehearsal-result" });
                                    window.scrollTo({ top: 0 });
                                  }}
                                  className="cb-link cb-tap"
                                >
                                  Review its answers
                                </button>
                                .
                              </>
                            )}
                          </>
                        ) : (
                          `It has ${REHEARSAL_FORMATS.full.questions} questions and a limit of ${REHEARSAL_FORMATS.full.minutes} minutes.`
                        ),
                        action: "Start",
                        onAction: () => {
                          setView({ kind: "rehearsal-intro", asStop: false });
                          window.scrollTo({ top: 0 });
                        },
                      },
                    ]
                  : []),
                ...(library.length > 0
                  ? [
                      {
                        key: "labs",
                        Icon: FlaskConical,
                        title: "Hands-on labs",
                        detail: `There are ${library.length} labs.${
                          labResults.size > 0
                            ? ` You have completed ${labResults.size}.`
                            : " They work like the exam's performance-based questions."
                        }`,
                        action: "Open",
                        onAction: () => {
                          track("path_labs_viewed", { cert });
                          setView({ kind: "labs" });
                          window.scrollTo({ top: 0 });
                        },
                      },
                    ]
                  : []),
                ...(toReview > 0
                  ? [
                      {
                        key: "review",
                        Icon: RotateCcw,
                        title: "Questions to review",
                        detail: `You have ${toReview} ${toReview === 1 ? "question" : "questions"} to review, ${Math.min(toReview, PRACTICE_SIZE)} at a time.`,
                        action: "Review",
                        onAction: () => void startReview("home"),
                      },
                    ]
                  : []),
              ]}
            />
          )}
        </div>

        <div className="glass grid gap-6 rounded-lg p-5 sm:p-8">
          <div className="grid gap-1.5">
            <h2 className="cb-statement">Exam objectives</h2>
            <p className="text-small text-muted-foreground">Choose an objective to see where you stand on it.</p>
          </div>
          <ExamMap
            structure={structure}
            statuses={statuses}
            doneStops={doneStops}
            current={nextStop && nextStop.objectives.length <= 3 ? new Set(nextStop.objectives) : undefined}
            labs={labs}
            rehearsal={mapRehearsal}
            selected={tile}
            onSelect={pickTile}
            // Only where a lab's row leads to the lab on this page: for an
            // account without Pro the row leads to a public page or to the offer.
            onLabIntent={shut ? undefined : preloadLabById}
            detail={tile ? renderTileDetail(tile) : null}
          />
          {freeNote}
        </div>

        {/* The save card carries its own. */}
        {!anonymousDone && (
          <p className="text-small text-muted-foreground">
            If you are studying for a different exam, you can{" "}
            <Link href="/start?pick=1" className="cb-link">
              choose another exam
            </Link>
            .
          </p>
        )}
        {!anonymousDone && <VersionSwitch cert={cert} />}
        {/* What the study path does not hold yet stays reachable, and is not advertised. */}
        {pro && (
          <p className="-mt-3 text-small text-muted-foreground">
            Your study sets and full spaced repetition are in your{" "}
            <Link href="/dashboard" className="cb-link">
              study tools
            </Link>
            .
          </p>
        )}
      </div>
    );
  }
}

/** The way on: the next step, named, and the one button that opens it. */
export function ContinueCard({
  stop,
  total,
  onContinue,
  locked,
  minutes,
}: {
  stop: PathStop | null;
  total: number;
  onContinue: () => void;
  /** The next step is one that Pro opens, and this account is known not to have Pro: the button leads to the offer. */
  locked?: boolean;
  /** A lab's rough length, shown with it. */
  minutes?: number | null;
}) {
  if (!stop) return null;
  const label =
    stop.kind === "review"
      ? "Review"
      : stop.kind === "checkpoint"
        ? "Readiness checkpoint"
        : stop.kind === "warmup"
          ? "Introductory questions"
          : stop.title;
  const kicker =
    stop.kind === "review"
      ? "You have completed the study path. Your next step is a review."
      : stop.kind === "lab"
        ? `Your next step is a hands-on lab${minutes ? ` of about ${minutes} minutes` : ""}.`
        : stop.kind === "rehearsal"
          ? "Your last step is a full-length timed practice exam."
          : `Your next step is step ${stop.index + 1} of ${total}.`;
  return (
    // No coloured rule on its edge: a rule there marks a notice, and this is the way on.
    <div className="glass flex flex-wrap items-center justify-between gap-5 rounded-lg p-5 sm:p-8">
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-small text-muted-foreground">{kicker}</p>
        <h2 className="cb-statement mt-1.5">{label}</h2>
      </div>
      <Button size="lg" className="w-full sm:w-auto" onClick={onContinue}>
        {/* The same words as the outline's rows use for the same action. */}
        {locked ? "See what Pro includes" : "Continue"}
        {!locked && <ArrowRight aria-hidden />}
      </Button>
    </div>
  );
}

/**
 * What the page says when the learner's work is not where it should be: one
 * quiet sentence for each case, above whatever screen is showing. In each
 * case nothing has been lost, and the page is already trying again by itself.
 * The region is always there, so a sentence that arrives in it is announced.
 */
function PathNotices({
  unreached,
  saveFailed,
  storageRefused,
  retryOnScreen,
  onRetry,
}: {
  /** Signed in, and the account has not answered. */
  unreached: boolean;
  /**
   * The screen below offers to try again itself: the offer does while it has
   * no account to sell to, and so does the screen of a step that could not be
   * loaded. The sentence here stays and its button is left out, so that the
   * page shows one way to try again, not two.
   */
  retryOnScreen: boolean;
  /** The error code of the latest save to the account, when it failed. */
  saveFailed: ApiErrorCode | null;
  /** Nobody is signed in, and the browser refuses to keep the progress. */
  storageRefused: boolean;
  /** Ask the account again. */
  onRetry: () => Promise<void>;
}) {
  const [asking, setAsking] = useState(false);
  async function retry() {
    setAsking(true);
    try {
      await onRetry();
    } finally {
      setAsking(false);
    }
  }
  return (
    <div role="status">
      {(unreached || saveFailed || storageRefused) && (
        <div className="mb-6 grid gap-2 text-small leading-relaxed text-muted-foreground">
          {unreached && (
            <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="min-w-0 flex-1 basis-64">
                Your account could not be reached. The progress saved on this device is shown.
              </span>
              {!retryOnScreen && (
                <Button variant="outline" size="sm" loading={asking} onClick={() => void retry()}>
                  Try again
                </Button>
              )}
            </p>
          )}
          {saveFailed && (
            <p>
              {saveFailed === "internal"
                ? "Your latest answers are kept on this device and will be saved to your account when the connection returns."
                : "Your latest answers could not be saved to your account. They are kept on this device, and the page will try again."}
            </p>
          )}
          {storageRefused && <p>This browser is not saving your progress. Create a free account to keep it.</p>}
        </div>
      )}
    </div>
  );
}

function SaveCard({
  cert,
  next,
  onSaved,
}: {
  cert: PathCert;
  /** The step that an account opens: it is named, because it is the reason to make one. */
  next: PathStop | null;
  onSaved: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => Promise<void>;
}) {
  return (
    <div className="glass grid gap-4 rounded-lg p-5 sm:p-8">
      <SaveAsk
        cert={cert}
        surface="path"
        title={nextUpTitle(next) ?? "Save your progress to continue"}
        // Under the screen's title, and before the outline's own heading.
        titleAs="h2"
        onSaved={onSaved}
      >
        {/* What a free account opens, in the pricing page's own words. */}
        {nextUpLead(next)}A free account saves your progress and opens your first study step and the readiness
        checkpoint.
      </SaveAsk>
      <p className="text-small text-muted-foreground">
        If you are studying for a different exam, you can{" "}
        <Link href="/start?pick=1" className="cb-link">
          choose another exam
        </Link>
        .
      </p>
    </div>
  );
}
