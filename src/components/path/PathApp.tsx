"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, FlaskConical, Loader2, RotateCcw, Timer } from "lucide-react";
import { api } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { enrollInPath, getPathLab, getPathRehearsal, getPathStop, recordPathAnswers } from "@/contracts/path";
import { ApiError } from "@/contracts/common";
import { PRACTICE_SIZE, stopAt } from "@/core/path/plan";
import {
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
import { EXAM_CODES, examVersions, LAST_EXAM_DAY, newerVersion } from "@/core/path/versions";
import { scoreCheckpoint, type CheckpointAnswer } from "@/core/path/checkpoint";
import { latestReading, REHEARSAL_FORMATS, scoreRehearsal } from "@/core/path/rehearsal";
import type {
  ChoiceRep,
  ObjectiveStatus,
  PathCert,
  PathLabInfo,
  PathPlan,
  PathStop,
  PathStructure,
  RehearsalSize,
  Rep,
  StopRecord,
} from "@/core/path/types";
import type { PbqGradeResult, PbqScenario } from "@/data/pbq/types";
import { Button } from "@/components/ui/button";
import { ExamMap, labTileKey, MapLegend, REHEARSAL_TILE, type LabState, type MapRehearsal, type MapTile } from "./ExamMap";
import { WelcomeBack } from "./WelcomeBack";
import { LabLibrary, NextLabCard } from "./LabLibrary";
import { RepCard, StopProgress, type RepAnswer } from "./RepCard";
import { PathHeader } from "./PathHeader";
import { VersionSwitch } from "./VersionSwitch";
import { PathOffer } from "./PathOffer";
import { PathReveal } from "./PathReveal";
import { PathActivating, PathUnlocked } from "./PathUnlocked";
import { holdsStage, UPGRADED_FLAG } from "./path-hold";
import { PracticeCard, ReviewMissesCard } from "./PracticeCard";
import { RehearsalIntro, RehearsalResumeCard } from "./RehearsalIntro";
import { RehearsalPlayer } from "./RehearsalPlayer";
import { RehearsalResult } from "./RehearsalResult";
import { clearRun, readRun, writeRun, type RehearsalRun } from "./rehearsal-run";
import { GoalStep } from "./GoalStep";
import { nextUpLead, nextUpTitle, SaveAsk } from "./SaveAsk";
import { usePathProgress } from "./usePathProgress";
import { pathUnlockedKey } from "./storage-key";
import { cn } from "@/lib/utils";

// The lab players are big and only Pro reaches a lab: load them when one opens.
const PbqPlayer = dynamic(() => import("@/components/workspace/PbqPlayer").then((m) => m.PbqPlayer), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-60 place-items-center text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" />
    </div>
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
  /** Objective statuses before the stop, to animate what it changed. */
  before: Map<string, ObjectiveStatus>;
  /** "misses": a review round of their misses alone. */
  focus?: "misses";
}

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
      fresh: Set<string>;
      focus?: "misses";
    }
  | { kind: "goal"; step: "exam" | "minutes"; then: number }
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

/** What a map tile's card offers to do. `kind` names it for analytics. */
interface TileAction {
  label: string;
  kind: "start" | "replay" | "lab" | "rehearsal" | "offer" | "save";
  run: () => void;
}

/** A tapped map tile's card: where it stands, and the one thing to do with it. */
interface TileInfo {
  /** For analytics: done, next, later, locked, open, anonymous, none. */
  state: string;
  kicker: string;
  title: string;
  line?: string;
  action?: TileAction;
}

function stopLabel(stop: PathStop, total: number): string {
  switch (stop.kind) {
    case "warmup":
      return "Warm-up";
    case "checkpoint":
      return "Readiness checkpoint";
    case "review":
      return "Keep practicing";
    case "lab":
      return "Hands-on lab";
    case "rehearsal":
      return "Exam rehearsal";
    default:
      return `Stop ${stop.index + 1} of ${total}`;
  }
}

const fmtDay = (at: number) => new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** Back from paying, how long "Payment received" waits before saying it's slow. */
const SLOW_AFTER_MS = 20_000;
/** And how long it keeps asking the account on its own. */
const STOP_ASKING_AFTER_MS = 120_000;

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

  // Before first paint, as the page's inline script does on a full load: a
  // learner who's been here, or is back from paying, waits for their own
  // screen instead of the first visit's warm-up. Arriving from inside the app
  // never runs that script, so the path checks again here.
  useLayoutEffect(() => {
    document.documentElement.toggleAttribute("data-path-returning", holdsStage(cert, window.location.search));
  }, [cert]);

  // Back from paying: Stripe's success link adds ?upgraded=1. The flag comes
  // straight off the URL, so a reload is an ordinary visit.
  const [landing, setLanding] = useState<{ done: boolean } | null>(null);
  useLayoutEffect(() => {
    if (!UPGRADED_FLAG.test(window.location.search)) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("upgraded");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    // The URL is only readable once mounted; before paint, so no flash of the warm-up.
    setLanding({ done: false });
  }, []);

  const freshPlay = useCallback(
    (stop: PathStop, reps: Rep[], before: Map<string, ObjectiveStatus>, focus?: "misses"): Play => ({
      stop,
      reps,
      i: 0,
      results: reps.map(() => null),
      bank: new Map(),
      checkpoint: [],
      before,
      focus,
    }),
    []
  );

  const [view, setView] = useState<View>({ kind: "play" });
  // "Now" for what's due for review, fixed for the visit: due-ness moves in days.
  const [visitAt] = useState(() => Date.now());
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
    // Signed out beside an account's path: offer that account before a blank one.
    if (!p.signedIn && p.held && hasStarted(p.held)) {
      setView({ kind: "welcome" });
      track("path_welcome_back_viewed", { cert });
      return;
    }
    if (hasStarted(p.progress)) setView({ kind: "home" });
  }, [p.ready, p.progress, p.signedIn, p.held, cert]);

  // The map tile that's open on the home screen, if any.
  const [tile, setTile] = useState<MapTile | null>(null);

  const statuses = useMemo(() => objectiveStatuses(p.progress.items), [p.progress.items]);
  const next = nextStopIndex(plan, p.progress);
  const nextStop = stopAt(plan, structure, next);
  const remaining = total - stopsDone(plan, p.progress);
  const pro = p.access === "pro";
  // Back from paying and Pro not confirmed yet: "Payment received" holds the
  // screen, never the offer they just paid for.
  const awaitingPro = landing !== null && !landing.done;

  // Each domain's lab on the map: played, open (Pro), or a glimpse of Pro.
  const labs = useMemo(() => {
    const out = new Map<string, LabState>();
    for (const s of plan.stops) {
      if (s.kind !== "lab" || !s.domain) continue;
      out.set(s.domain, isStopDone(p.progress, s.id) ? "done" : pro ? "open" : "locked");
    }
    return out;
  }, [plan.stops, p.progress, pro]);
  const labMinutes = (stop: PathStop | null) =>
    stop?.kind === "lab" ? (structure.domains.find((d) => d.number === stop.domain)?.lab?.minutes ?? null) : null;
  const labLegend = labs.size === 0 ? undefined : pro ? "open" : "locked";

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

  // The exam rehearsal: the path's last stop, and for Pro, there any time.
  const rehearsalStop = useMemo(() => plan.stops.find((s) => s.kind === "rehearsal") ?? null, [plan.stops]);
  const reading = latestReading(p.progress);
  const lastRehearsal = p.progress.rehearsals.at(-1) ?? null;
  const mapRehearsal: MapRehearsal | undefined = rehearsalStop
    ? {
        state: isStopDone(p.progress, rehearsalStop.id) ? "done" : pro ? "open" : "locked",
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

  // The first time Pro covers this exam on this device, open with what it
  // opened: in place of their map, or of a stop not yet answered (the first
  // paint's warm-up, which a started path is about to leave for the map).
  // Mid-stop it waits until they're back on the map.
  const unlockChecked = useRef(false);
  useEffect(() => {
    if (!p.ready || !p.signedIn || !pro || unlockChecked.current || awaitingPro) return;
    const untouched = view.kind === "play" && playRef.current.results.every((r) => r === null);
    if (view.kind !== "home" && !untouched) return;
    unlockChecked.current = true;
    if (!firstUnlock(cert)) return;
    track("path_unlock_viewed", { cert });
    setView({ kind: "unlocked" });
  }, [p.ready, p.signedIn, pro, cert, view.kind, awaitingPro]);

  // Pro bought before the path asked for their exam (from /pricing, say) leaves
  // the account with no exam: Pro opens nothing, and the dashboard sends them
  // back to the picker. Claim this one. The server only lets an account with no
  // exam yet take it, so a member who has one still gets the offer to add it.
  const claimed = useRef(false);
  const { ready, signedIn, proPlan, refreshAccess } = p;
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

  // Back from paying: the moment Pro is confirmed, open with the unlock,
  // straight from "Payment received" before any other screen paints. Signed
  // out (the flag on its own), it's an ordinary visit.
  const waitedSince = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (!awaitingPro || !ready || (signedIn && !pro)) return;
    setLanding({ done: true });
    if (!signedIn) return;
    // This decides what opens: the first-visit boot and the unlock check stand down.
    booted.current = true;
    unlockChecked.current = true;
    track("path_upgrade_landed", {
      cert,
      waited_ms: waitedSince.current === null ? 0 : Date.now() - waitedSince.current,
    });
    const first = firstUnlock(cert);
    if (first) track("path_unlock_viewed", { cert });
    setView(first ? { kind: "unlocked" } : { kind: "home" });
  }, [awaitingPro, ready, signedIn, pro, cert]);

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

  const openLab = useCallback(
    (stop: PathStop, scenario: PbqScenario) => {
      track("path_lab_started", { cert, stop: stop.id, scenario: scenario.id, from: "path" });
      setView({ kind: "lab", stop, scenario, from: "path", graded: false });
      window.scrollTo({ top: 0 });
    },
    [cert]
  );

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
      if (stop.kind === "rehearsal") {
        setView(runInProgress ? { kind: "rehearsal" } : { kind: "rehearsal-intro", asStop: true });
        window.scrollTo({ top: 0 });
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
        p.retire(built.retired);
        if (built.lab) {
          openLab(built.stop, built.lab);
          return;
        }
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
            retry: () => startStop(index, { skipIntro: true }),
          });
        }
      }
    },
    [cert, plan, structure, p, pro, freshPlay, setPlay, openLab, runInProgress]
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
      p.finishLab(scenario.id, correct, total, stop?.id ?? null);
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
    [cert, p]
  );

  /** Open any lab from the library, in the path's own lab stage. */
  async function openLibraryLab(info: PathLabInfo) {
    setView({ kind: "loading", label: "Opening the lab…" });
    try {
      const { lab } = await api(getPathLab, { cert, id: info.id });
      const stop = labStopOf(info.id);
      track("path_lab_started", { cert, stop: stop?.id ?? "library", scenario: info.id, from: "library" });
      setView({ kind: "lab", stop, scenario: lab, from: "library", graded: false });
      window.scrollTo({ top: 0 });
    } catch (err) {
      if (err instanceof ApiError && (err.code === "unauthorized" || err.code === "quota_exceeded")) {
        await p.refreshAccess();
        setView({ kind: "home" });
      } else {
        setView({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Couldn't open that lab.",
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
      if (!hasStarted(p.progress)) track("path_started", { cert });
      p.record(rep.id, answer.correct);
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
      ...(cur.focus ? { focus: cur.focus } : {}),
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
      setView({ kind: "end", stop: cur.stop, correct, total: totalReps, fresh: new Set(), focus: cur.focus });
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

  // An exam version with a last day CompTIA has announced (SY0-701): a date
  // after it can't be this version, so the goal question points to the newer one.
  const newer = newerVersion(cert);
  const lastDay = LAST_EXAM_DAY[cert];
  const retiring =
    newer && lastDay
      ? { lastDay, code: EXAM_CODES[cert], newer: { code: EXAM_CODES[newer], href: `/path/${newer}` } }
      : undefined;

  async function saveGoalExam(examDate: string | null, target: string | null) {
    p.setGoal({ examDate, target, minutes: null });
    track("path_goal_set", { cert, step: "exam", value: examDate ? "booked" : (target ?? "unknown") });
    // Make this their exam (with its date) so reminders and Pro line up.
    try {
      const { enrolled } = await api(enrollInPath, { cert, examDate });
      // A Pro member who just claimed their first exam can now open all of it.
      if (enrolled && p.proPlan && !pro) void p.refreshAccess();
    } catch {
      /* the path doesn't depend on it — the goal is saved with their progress */
    }
  }

  // ─── Screens ──────────────────────────────────────────────────────────────

  let screen: React.ReactNode;

  if (awaitingPro) {
    screen = <PathActivating examName={structure.examName} slow={slow} onCheck={() => void refreshAccess()} />;
  } else if (view.kind === "welcome") {
    screen = (
      <WelcomeBack
        cert={cert}
        examName={structure.examName}
        stopsDone={p.held ? stopsDone(plan, p.held) : 0}
        onPlay={() => {
          track("path_welcome_back_played", { cert });
          // Guest work kept from before carries on from home; otherwise the warm-up.
          setView(hasStarted(p.progress) ? { kind: "home" } : { kind: "play" });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  } else if (view.kind === "play") {
    const rep = play.reps[play.i];
    // The rep just answered pops its objective on the map beside the card.
    const answered = rep && play.results[play.i] !== null ? new Set([rep.objective]) : undefined;
    screen = (
      // One screen: the stop on the left and, on wide screens, the exam's map
      // filling in beside it as each answer lands.
      <div className="glass overflow-hidden rounded-3xl lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:rounded-[2rem]">
        <div className="p-5 sm:p-8 lg:p-9">
          <div className="mb-6 grid gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {play.focus === "misses" ? "Review · your misses" : stopLabel(play.stop, total)}
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
        <aside
          aria-label={`Your ${structure.examName} map`}
          className="hidden border-l border-border/70 bg-foreground/[0.018] p-6 lg:grid lg:content-start lg:gap-4"
        >
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-semibold tracking-[-0.01em]">Your {structure.examName} map</p>
            <p className="font-mono text-xs text-muted-foreground">
              {statuses.size} of {structure.domains.reduce((s, d) => s + d.objectives.length, 0)}
            </p>
          </div>
          <ExamMap
            structure={structure}
            statuses={statuses}
            current={rep ? new Set([rep.objective]) : undefined}
            fresh={answered}
            labs={labs}
            rehearsal={mapRehearsal}
            className="gap-3.5"
          />
        </aside>
      </div>
    );
  } else if (view.kind === "loading") {
    screen = (
      <div className="glass grid min-h-80 place-items-center rounded-3xl p-8 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          {view.label ?? "Building your next stop…"}
        </span>
      </div>
    );
  } else if (view.kind === "error") {
    screen = (
      <div className="glass grid min-h-80 place-items-center gap-4 rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{view.message}</p>
        <Button onClick={view.retry}>
          <RotateCcw />
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
      <RehearsalResult run={{ ...run, done: run.done }} structure={structure}>
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
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Hands-on lab · Domain {domainLabel(scenario.domain_number)}
          {minutes ? <> · about {minutes} min</> : null}
        </p>
        {/* min-w-0: a lab's tab row doesn't wrap, and would widen a phone's page. */}
        <div className="glass min-w-0 rounded-3xl p-4 sm:p-6">
          <PbqPlayer
            key={scenario.id}
            scenario={scenario}
            backLabel={fromLibrary ? "Back to the labs" : "Back to my map"}
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
    screen = (
      <div className="glass rounded-3xl p-6 sm:p-8">
        <GoalStep
          step={view.step}
          examName={structure.examName}
          retiring={retiring}
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
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Stop {view.index + 1} · Readiness checkpoint
        </span>
        <h2 className="cb-display text-balance text-[2rem] sm:text-[2.6rem]">
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
      <PathReveal
        result={result}
        structure={structure}
        goal={p.progress.goal}
        remainingStops={remaining}
        studied={plan.stops.filter((s) => s.kind === "learn" && isStopDone(p.progress, s.id)).length}
      >
        {pro ? (
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
    const reviewed = view.focus === "misses";
    screen = (
      <div className="path-rise grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className="grid min-w-0 gap-6">
        <div className="grid gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {view.stop.kind === "review"
              ? "Review"
              : view.stop.kind === "warmup"
                ? "Warm-up"
                : `Stop ${view.stop.index + 1}`}{" "}
            complete
          </span>
          <h2 className="cb-display text-7xl sm:text-8xl">
            {view.correct}
            <span className="text-muted-foreground/60"> of {view.total}</span>
          </h2>
          <p className="text-muted-foreground">
            {reviewed
              ? `${toReview > 0 ? `${toReview} more to review.` : "Nothing left to review today."} The ones you got right come back once more in a few days, to make sure they stick.`
              : missed === 0
                ? "Every one right."
                : `${missed} to revisit. ${missed === 1 ? "It comes" : "They come"} back in your next stop.`}
          </p>
        </div>

        {/* The way on comes before the map: the map fills a phone's screen. */}
        {p.signedIn ? (
          <ContinueCard
            stop={nextStop}
            total={total}
            minutes={labMinutes(nextStop)}
            onContinue={() => startStop(next)}
            locked={next > plan.freeThrough && !pro}
          />
        ) : (
          <SaveCard cert={cert} next={nextStop} onSaved={onSaved} />
        )}
        {reviewed && toReview > 0 && (
          <Button variant="outline" size="lg" className="h-12 justify-self-center px-6" onClick={() => void startReview("end")}>
            <RotateCcw />
            Review {Math.min(toReview, PRACTICE_SIZE)} more
          </Button>
        )}

        </div>

        <div className="glass grid gap-5 rounded-[1.75rem] p-5 sm:p-6 lg:sticky lg:top-20">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold tracking-[-0.01em]">Your {structure.examName} map</h3>
            <span className="font-mono text-xs text-muted-foreground">
              {statuses.size} of {structure.domains.reduce((s, d) => s + d.objectives.length, 0)} objectives started
            </span>
          </div>
          <ExamMap
            structure={structure}
            statuses={statuses}
            fresh={endFresh}
            current={nextStop ? new Set(nextStop.objectives.length > 3 ? [] : nextStop.objectives) : undefined}
            labs={labs}
            rehearsal={mapRehearsal}
          />
          <MapLegend labs={labLegend} />
        </div>
      </div>
    );
  } else {
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
      {/* A lab's console and diagrams want more room than a question does. */}
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pb-20 pt-6 sm:px-6 sm:pt-10",
          view.kind === "lab"
            ? "max-w-3xl"
            : view.kind === "play" || view.kind === "home" || view.kind === "end"
              ? "max-w-2xl lg:max-w-5xl"
              : "max-w-2xl"
        )}
      >
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
    else if (stop?.kind === "rehearsal") setView({ kind: "rehearsal-intro", asStop: true });
    else await startStopDirect(index);
  }

  /** Draw a rehearsal and start it, the clock with it. */
  async function startRehearsal(size: RehearsalSize, asStop: boolean) {
    const owner = p.userId;
    if (!owner) return;
    setView({ kind: "loading", label: "Drawing your rehearsal…" });
    try {
      const drawn = await api(getPathRehearsal, {
        cert,
        size,
        seen: seenIds(p.progress.items),
        run: p.progress.rehearsals.length,
      });
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
      if (err instanceof ApiError && err.code === "unauthorized") {
        setView({ kind: "home" });
      } else if (err instanceof ApiError && err.code === "quota_exceeded") {
        await p.refreshAccess();
        setView({ kind: "reveal" });
      } else {
        setView({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Couldn't draw your rehearsal.",
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
    setView({ kind: "loading", label: "Gathering your misses…" });
    try {
      const built = await api(getPathStop, {
        cert,
        index: total,
        seen: seenIds(p.progress.items),
        missed,
        run: p.progress.stops.review?.n ?? 0,
        focus: "misses",
      });
      p.retire(built.retired);
      if (built.reps.length === 0) {
        setView({ kind: "home" });
        return;
      }
      track("path_review_started", { cert, from, reps: built.reps.length });
      setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(p.progress.items), "misses"));
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
          message: err instanceof ApiError ? err.message : "Couldn't gather your misses.",
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
      p.retire(built.retired);
      if (built.lab) {
        openLab(built.stop, built.lab);
        return;
      }
      setPlay(freshPlay(built.stop, built.reps, objectiveStatuses(p.progress.items)));
      setView({ kind: "play" });
    } catch {
      setView({
        kind: "error",
        message: "Couldn't load your next stop.",
        retry: () => startStop(index, { skipIntro: true }),
      });
    }
  }

  /**
   * They just signed up or logged in on the save card: play the stop it named.
   * An account that's further along goes home, where the way on is current,
   * and so does a checkpoint, which has its goal questions and intro first.
   */
  async function onSaved(uid: string, email: string | undefined, method: "email_signup" | "email_login") {
    const merged = await p.linkAccount(uid, email, method);
    const to = nextStopIndex(plan, merged);
    if (to === next && to < plan.freeThrough) await startStopDirect(to);
    else setView({ kind: "home" });
  }

  /** Bring a card on the home screen into view (the offer, the save card). */
  function reveal(id: string) {
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(id)?.scrollIntoView?.({ behavior: still ? "auto" : "smooth", block: "start" });
  }

  /**
   * What a tapped map tile says and offers: an objective's stop to start or
   * play again, what's still ahead, or what Pro opens. Playing a stop again
   * is Pro's (David, Nov 16): a free learner sees their score, and once past
   * the checkpoint, the way to the offer.
   */
  function tileInfo(key: MapTile): TileInfo | null {
    const result = p.progress.checkpoint;
    const toOffer = (): TileAction | undefined =>
      !p.signedIn
        ? { label: "Save my map", kind: "save", run: () => reveal("path-save") }
        : result && !pro
          ? { label: "See what Pro opens", kind: "offer", run: () => reveal("path-offer") }
          : undefined;

    if (key === REHEARSAL_TILE) {
      const title = `${REHEARSAL_FORMATS.full.questions} questions in ${REHEARSAL_FORMATS.full.minutes} minutes`;
      if (!pro) {
        return {
          state: "locked",
          kicker: "Exam rehearsal · with Pro",
          title,
          line: "The whole exam, timed, scored on your readiness dial.",
          action: toOffer(),
        };
      }
      return {
        state: lastRehearsal ? "done" : "open",
        kicker: "Exam rehearsal",
        title,
        line: lastRehearsal
          ? `Last one ${lastRehearsal.score}% on ${fmtDay(lastRehearsal.at)}.`
          : "Scored on your readiness dial, like the real exam.",
        action: {
          label: lastRehearsal ? "Take another" : "Start",
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
      if (!pro || !info) {
        return {
          state: "locked",
          kicker: `Hands-on lab ${domainLabel(domain.number)} · with Pro`,
          title: lab.title,
          line: "Played like the exam's PBQs, graded with partial credit.",
          action: toOffer(),
        };
      }
      return {
        state: record ? "done" : "open",
        kicker: `Hands-on lab ${domainLabel(domain.number)}`,
        title: lab.title,
        line: record
          ? `Last run ${record.c} of ${record.t} right · ${fmtDay(record.at)}.`
          : `About ${lab.minutes} minutes, graded with partial credit.`,
        action: { label: record ? "Play it again" : "Open the lab", kind: "lab", run: () => void openLibraryLab(info) },
      };
    }

    // An objective, and the learn stop that teaches it.
    const objective = structure.domains.flatMap((d) => d.objectives).find((o) => o.code === key);
    if (!objective) return null;
    const status = statuses.get(key) ?? "new";
    const kicker = `${key} · ${status === "got" ? "Covered" : status === "missed" ? "A miss to revisit" : "Not started"}`;
    const base = { kicker, title: objective.title };
    if (!p.signedIn) {
      return {
        ...base,
        state: "anonymous",
        line: "A free account saves your map and opens every stop through to your readiness checkpoint.",
        action: toOffer(),
      };
    }
    const index = plan.stops.findIndex((s) => s.kind === "learn" && s.objectives.includes(key));
    if (index < 0) return { ...base, state: "none" };
    const record = p.progress.stops[plan.stops[index].id];
    const locked = index > plan.freeThrough && !pro;
    if (record && record.n > 0) {
      const ran = `Last run ${record.c} of ${record.t} right · ${fmtDay(record.at)}.`;
      if (!pro) {
        return { ...base, state: "done", line: `${ran} Playing it again comes with Pro.`, action: toOffer() };
      }
      return {
        ...base,
        state: "done",
        line: `${ran}${status === "missed" ? " Its misses come back in your next stops." : ""}`,
        action: { label: "Play it again", kind: "replay", run: () => void startStop(index) },
      };
    }
    // Past the free stops, even the next one is Pro's to open.
    if (locked) {
      return {
        ...base,
        state: "locked",
        line: result ? "Opens with Pro." : "Opens with Pro, after your readiness checkpoint.",
        action: toOffer(),
      };
    }
    if (index === next) {
      return {
        ...base,
        state: "next",
        line: "Up next on your path.",
        action: { label: "Start", kind: "start", run: () => void startStop(index) },
      };
    }
    const ahead = index - next;
    return {
      ...base,
      state: "later",
      line: ahead === 1 ? "Comes up right after your next stop." : `Comes up in ${ahead} stops.`,
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
    return (
      <div
        role="region"
        aria-label={info.title}
        className="path-rise flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card/80 p-4"
      >
        <div className="grid min-w-0 flex-1 basis-56 gap-0.5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{info.kicker}</p>
          <p className="font-medium leading-snug">{info.title}</p>
          {info.line && <p className="text-sm text-muted-foreground">{info.line}</p>}
        </div>
        {action && (
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              track("path_map_action", { cert, tile: key, action: action.kind });
              setTile(null);
              action.run();
            }}
          >
            {action.label}
            <ArrowRight />
          </Button>
        )}
      </div>
    );
  }

  function renderHome() {
    const result = p.progress.checkpoint;
    const anonymousDone = !p.signedIn && hasStarted(p.progress);
    const lockedNext = p.signedIn && next > plan.freeThrough && !pro;
    return (
      <div className="path-rise grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8">
        <div className="grid min-w-0 gap-6">
        <div className="grid gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
            {structure.examCode}
          </span>
          <h1 className="cb-display text-balance text-[2.5rem] sm:text-6xl">Your {structure.examName} path</h1>
          {/* How far along, as a line lit up to here, then the numbers. */}
          <div className="mt-2 grid gap-2.5">
            <div className="h-[3px] overflow-hidden rounded-full bg-foreground/[0.08]" aria-hidden>
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-signal shadow-[0_0_12px_var(--primary)]"
                style={{ width: `${Math.max(1.5, (Math.min(next, total) / Math.max(1, total)) * 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {Math.min(next, total)} of {total} stops done · {statuses.size} of{" "}
              {structure.domains.reduce((s, d) => s + d.objectives.length, 0)} objectives started
              {reading && (
                <>
                  {" "}
                  · last {reading.source} {reading.score}%
                </>
              )}
            </p>
          </div>
        </div>

        {/* A rehearsal left mid-way comes first: its clock is waiting. */}
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
          <div id="path-save" className="scroll-mt-24">
            <SaveCard cert={cert} next={nextStop} onSaved={onSaved} />
          </div>
        ) : lockedNext && result ? (
          <div id="path-offer" className="scroll-mt-24">
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
            />
          </div>
        ) : (
          <ContinueCard stop={nextStop} total={total} minutes={labMinutes(nextStop)} onContinue={() => startStop(next)} />
        )}

        {/* What Pro can practise whenever they like, under the way on: the whole
            exam (unless it's already next), every lab, and their misses. */}
        {pro && (
          <PracticeCard
            rows={[
              ...(!runInProgress && nextStop?.kind !== "rehearsal"
                ? [
                    {
                      key: "rehearsal",
                      Icon: Timer,
                      title: "Exam rehearsal",
                      detail: lastRehearsal ? (
                        <>
                          Last one {lastRehearsal.score}% on {fmtDay(lastRehearsal.at)}
                          {run?.done && (
                            <>
                              {" · "}
                              <button
                                type="button"
                                onClick={() => {
                                  setView({ kind: "rehearsal-result" });
                                  window.scrollTo({ top: 0 });
                                }}
                                className="underline underline-offset-4 hover:text-foreground"
                              >
                                see its answers
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        `${REHEARSAL_FORMATS.full.questions} questions in ${REHEARSAL_FORMATS.full.minutes} minutes, scored on your dial`
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
                      detail: `${library.length} labs${labResults.size > 0 ? ` · ${labResults.size} done` : ", like the exam's PBQs"}`,
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
                      title: "Your misses",
                      detail: `${toReview} ${toReview === 1 ? "miss" : "misses"} to go over, ${Math.min(toReview, PRACTICE_SIZE)} at a time`,
                      action: "Review",
                      onAction: () => void startReview("home"),
                    },
                  ]
                : []),
            ]}
          />
        )}

        </div>

        <div className="glass grid gap-5 rounded-[1.75rem] p-5 sm:p-6 lg:sticky lg:top-20">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold tracking-[-0.01em]">Your map</h2>
            <span className="font-mono text-[11px] text-muted-foreground">Tap any tile</span>
          </div>
          <ExamMap
            structure={structure}
            statuses={statuses}
            current={nextStop && nextStop.objectives.length <= 3 ? new Set(nextStop.objectives) : undefined}
            labs={labs}
            rehearsal={mapRehearsal}
            selected={tile}
            onSelect={pickTile}
            detail={tile ? renderTileDetail(tile) : null}
          />
          <MapLegend labs={labLegend} />
        </div>

        {/* The save card carries its own. */}
        {!anonymousDone && (
          <p className="text-center text-xs text-muted-foreground lg:col-span-2">
            <Link href="/start?pick=1" className="underline underline-offset-4 hover:text-foreground">
              Studying for a different exam?
            </Link>
          </p>
        )}
        {!anonymousDone && (
          <div className="lg:col-span-2">
            <VersionSwitch cert={cert} />
          </div>
        )}
        {/* What the path doesn't hold yet stays reachable, not advertised. */}
        {pro && (
          <p className="-mt-3 text-center text-xs text-muted-foreground lg:col-span-2">
            Study sets from your notes and full spaced repetition are in your{" "}
            <Link href="/dashboard" className="underline underline-offset-4 hover:text-foreground">
              study tools
            </Link>
            .
          </p>
        )}
      </div>
    );
  }
}

function ContinueCard({
  stop,
  total,
  onContinue,
  locked,
  minutes,
}: {
  stop: PathStop | null;
  total: number;
  onContinue: () => void;
  locked?: boolean;
  /** A lab's rough length, shown with it. */
  minutes?: number | null;
}) {
  if (!stop) return null;
  const label =
    stop.kind === "review"
      ? "Keep practicing"
      : stop.kind === "checkpoint"
        ? "Readiness checkpoint"
        : stop.title;
  const kicker =
    stop.kind === "review"
      ? "Path complete · review round"
      : stop.kind === "lab"
        ? `Next · hands-on lab${minutes ? ` · about ${minutes} min` : ""}`
        : stop.kind === "rehearsal"
          ? `Last stop · the whole exam, timed`
          : `Next · stop ${stop.index + 1} of ${total}`;
  return (
    <div className="glass relative isolate flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[1.75rem] p-6 sm:p-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-0 -z-10 h-48 w-2/3 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_22%,transparent),transparent)]"
      />
      <div className="min-w-0 flex-1 basis-64">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p>
        <p className="mt-2 text-balance text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-[2rem]">{label}</p>
      </div>
      <Button size="lg" className={cn("h-12 w-full px-7 text-base sm:w-auto")} onClick={onContinue}>
        {locked ? "See what's next" : "Continue"}
        <ArrowRight />
      </Button>
    </div>
  );
}

function SaveCard({
  cert,
  next,
  onSaved,
}: {
  cert: PathCert;
  /** The stop an account opens: named, because it's the reason to make one. */
  next: PathStop | null;
  onSaved: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => Promise<void>;
}) {
  return (
    <div className="glass grid gap-4 rounded-[1.75rem] p-5 sm:p-7">
      <SaveAsk cert={cert} surface="path" title={nextUpTitle(next) ?? "Save your map to keep going"} onSaved={onSaved}>
        {nextUpLead(next)}A free account saves your map and opens every stop through to your readiness checkpoint.
      </SaveAsk>
      <p className="text-center text-xs text-muted-foreground">
        <Link href="/start?pick=1" className="underline underline-offset-4 hover:text-foreground">
          Studying for a different exam?
        </Link>
      </p>
    </div>
  );
}
