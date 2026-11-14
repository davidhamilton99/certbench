"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, LayoutGrid, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clock } from "@/core/path/rehearsal";
import type { RehearsalRun } from "./rehearsal-run";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];
/** How often a running clock is saved to the device (answers save as they're given). */
const CLOCK_SAVE_MS = 10_000;
/** The clock turns amber with ten minutes left, red with one. */
const WARN_MS = 10 * 60_000;
const URGENT_MS = 60_000;
/** Longest gap one tick may count: a sleeping laptop doesn't eat the clock. */
const MAX_TICK_MS = 5_000;

type Panel = "question" | "grid" | "finish";

/**
 * An exam rehearsal in progress. One question at a time with no answers until
 * the end, as on the exam: flag anything to come back to, jump about from the
 * grid, finish when ready or when the clock runs out. The clock runs only while
 * the rehearsal is on screen, so leaving pauses it. Every change goes up
 * (`onChange`) to be kept on the device.
 *
 * Keyboard: 1–4 or A–D to answer, ← → to move, F to flag.
 *
 * The free practice tests on public pages run on it too, under their own name
 * (`label`, `noun`).
 */
export function RehearsalPlayer({
  run,
  examCode,
  label = "Exam rehearsal",
  noun = "rehearsal",
  onChange,
  onFinish,
  onLeave,
}: {
  run: RehearsalRun;
  examCode: string;
  /** What this sitting is called above the question. */
  label?: string;
  /** The same in a word, for "Finish the …". */
  noun?: string;
  onChange: (run: RehearsalRun) => void;
  onFinish: (run: RehearsalRun, timedOut: boolean) => void;
  /** Back to the map, the clock paused. */
  onLeave: () => void;
}) {
  const [state, setState] = useState(run);
  const ref = useRef(state);
  const [panel, setPanel] = useState<Panel>("question");
  const [announce, setAnnounce] = useState("");
  const finished = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  // The latest handlers, for the clock's interval and its cleanup to call.
  const changeRef = useRef(onChange);
  const finishRef = useRef(onFinish);
  useEffect(() => {
    changeRef.current = onChange;
    finishRef.current = onFinish;
  });

  const commit = useCallback((next: RehearsalRun, save = true) => {
    ref.current = next;
    setState(next);
    if (save) changeRef.current(next);
  }, []);

  const finish = useCallback((timedOut: boolean) => {
    if (finished.current) return;
    finished.current = true;
    finishRef.current(ref.current, timedOut);
  }, []);

  // The clock: counts only while the page is visible, saves every few seconds,
  // and ends the rehearsal when it runs out.
  useEffect(() => {
    let last = Date.now();
    let unsaved = 0;
    const warned = new Set<number>();
    const tick = () => {
      const now = Date.now();
      const visible = document.visibilityState === "visible";
      const delta = visible ? Math.min(now - last, MAX_TICK_MS) : 0;
      last = now;
      if (delta <= 0 || finished.current) return;
      const cur = ref.current;
      const spentMs = Math.min(cur.limitMs, cur.spentMs + delta);
      unsaved += delta;
      const save = unsaved >= CLOCK_SAVE_MS || spentMs >= cur.limitMs;
      if (save) unsaved = 0;
      commit({ ...cur, spentMs }, save);
      const left = cur.limitMs - spentMs;
      for (const mark of [WARN_MS, URGENT_MS]) {
        if (left <= mark && cur.limitMs - cur.spentMs > mark && !warned.has(mark)) {
          warned.add(mark);
          setAnnounce(mark === WARN_MS ? "Ten minutes left." : "One minute left.");
        }
      }
      if (spentMs >= cur.limitMs) finish(true);
    };
    const id = window.setInterval(tick, 1000);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        tick();
        changeRef.current(ref.current);
      } else {
        last = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    // Back from a break with no time left: it's over.
    if (ref.current.spentMs >= ref.current.limitMs) finish(true);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      // Leaving: keep the clock where it stopped.
      if (!finished.current) changeRef.current(ref.current);
    };
  }, [commit, finish]);

  const total = state.reps.length;
  const answered = state.picks.filter((p) => p !== null).length;
  const left = state.limitMs - state.spentMs;
  const rep = state.reps[state.i];
  const picked = state.picks[state.i];
  const isFlagged = state.flagged.includes(state.i);
  const unanswered = total - answered;
  const firstUnanswered = state.picks.findIndex((p) => p === null);
  const flaggedCount = state.flagged.length;

  /**
   * Change what the card shows, keeping its top (the clock) in view: after a
   * long question or the grid it can sit above the fold, or under the page's
   * sticky header, which the root's scroll margin clears.
   */
  const show = useCallback((next: Panel) => {
    setPanel(next);
    const root = rootRef.current;
    if (!root) return;
    const margin = Number.parseFloat(window.getComputedStyle(root).scrollMarginTop) || 0;
    if (root.getBoundingClientRect().top < margin) root.scrollIntoView({ block: "start" });
  }, []);

  const go = useCallback(
    (i: number) => {
      const cur = ref.current;
      if (i < 0 || i >= cur.reps.length) return;
      commit({ ...cur, i });
      show("question");
    },
    [commit, show]
  );

  const pick = useCallback(
    (option: number) => {
      const cur = ref.current;
      const current = cur.reps[cur.i];
      if (!current || option < 0 || option >= current.options.length || cur.picks[cur.i] === option) return;
      const picks = [...cur.picks];
      picks[cur.i] = option;
      commit({ ...cur, picks });
    },
    [commit]
  );

  const toggleFlag = useCallback(() => {
    const cur = ref.current;
    const flagged = cur.flagged.includes(cur.i)
      ? cur.flagged.filter((n) => n !== cur.i)
      : [...cur.flagged, cur.i].sort((a, b) => a - b);
    commit({ ...cur, flagged });
  }, [commit]);

  useEffect(() => {
    if (panel !== "question") return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const cur = ref.current;
      const options = cur.reps[cur.i]?.options.length ?? 0;
      const digit = Number(e.key);
      const letter = LETTERS.indexOf(e.key.toUpperCase());
      if (Number.isInteger(digit) && digit >= 1 && digit <= options) {
        e.preventDefault();
        pick(digit - 1);
      } else if (letter >= 0 && letter < options && e.key.length === 1 && e.key.toUpperCase() !== "F") {
        e.preventDefault();
        pick(letter);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (cur.i < cur.reps.length - 1) go(cur.i + 1);
        else show("finish");
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(cur.i - 1);
      } else if (e.key.toUpperCase() === "F") {
        e.preventDefault();
        toggleFlag();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panel, pick, go, show, toggleFlag]);

  return (
    <div ref={rootRef} className="glass grid scroll-mt-20 gap-6 rounded-3xl p-5 sm:p-8">
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {label} · {examCode}
          </p>
          <span
            role="timer"
            aria-label={`${clock(left)} left`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-sm font-medium tabular-nums transition-colors",
              left <= URGENT_MS
                ? "bg-destructive/15 text-destructive"
                : left <= WARN_MS
                  ? "bg-warning/20 text-foreground"
                  : "bg-muted text-foreground"
            )}
          >
            <Timer className="size-3.5" aria-hidden />
            {clock(left)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {answered} of {total} answered
          </span>
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      {panel === "question" && rep && (
        <div key={state.i} className="path-rise grid gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Question {state.i + 1}
            </span>
            <button
              type="button"
              aria-pressed={isFlagged}
              onClick={toggleFlag}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                isFlagged
                  ? "border-warning bg-warning/15 text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              )}
            >
              <Flag className={cn("size-3.5", isFlagged && "fill-warning text-warning")} aria-hidden />
              {isFlagged ? "Flagged" : "Flag for review"}
            </button>
          </div>

          <h2 className="text-balance text-[17px] font-medium leading-relaxed sm:text-lg">{rep.prompt}</h2>

          <div role="radiogroup" aria-label="Answers" className="grid gap-2.5">
            {rep.options.map((option, k) => {
              const chosen = picked === k;
              return (
                <button
                  key={`${k}-${option}`}
                  type="button"
                  role="radio"
                  aria-checked={chosen}
                  onClick={() => pick(k)}
                  className={cn(
                    "flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.99]",
                    chosen
                      ? "border-primary bg-primary/10"
                      : "hover:border-primary/60 hover:bg-primary/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] transition-colors",
                      chosen ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
                    )}
                    aria-hidden
                  >
                    {LETTERS[k]}
                  </span>
                  <span className="min-w-0 text-[15px] leading-snug [overflow-wrap:anywhere]">{option}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => go(state.i - 1)} disabled={state.i === 0}>
              <ArrowLeft />
              Back
            </Button>
            <Button variant="outline" onClick={() => show("grid")} aria-label="All questions">
              <LayoutGrid />
              <span className="font-mono tabular-nums">
                {state.i + 1} / {total}
              </span>
            </Button>
            {state.i < total - 1 ? (
              <Button onClick={() => go(state.i + 1)}>
                Next
                <ArrowRight />
              </Button>
            ) : (
              <Button onClick={() => show("finish")}>
                Finish
                <ArrowRight />
              </Button>
            )}
          </div>
        </div>
      )}

      {panel === "grid" && (
        <div className="path-rise grid gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h2 className="font-display text-xl font-semibold tracking-tight">All questions</h2>
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              {answered} answered · {flaggedCount} flagged · {unanswered} to go
            </p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
            {state.reps.map((r, k) => {
              const done = state.picks[k] !== null;
              const flag = state.flagged.includes(k);
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => go(k)}
                    aria-label={`Question ${k + 1}: ${done ? "answered" : "not answered"}${flag ? ", flagged" : ""}${k === state.i ? ", current" : ""}`}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-center rounded-md font-mono text-xs font-semibold tabular-nums transition-colors",
                      done
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "bg-muted/50 text-muted-foreground ring-1 ring-inset ring-border hover:text-foreground",
                      k === state.i && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    {k + 1}
                    {flag && <span className="absolute right-1 top-1 size-1.5 rounded-full bg-warning" aria-hidden />}
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-primary/30" /> Answered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-2.5 rounded-[3px] bg-muted ring-1 ring-inset ring-border" /> Not answered
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="size-1.5 rounded-full bg-warning" /> Flagged
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => show("question")}>
              <ArrowLeft />
              Question {state.i + 1}
            </Button>
            <Button onClick={() => show("finish")}>
              Finish the {noun}
              <ArrowRight />
            </Button>
          </div>
          <LeaveNote onLeave={onLeave} />
        </div>
      )}

      {panel === "finish" && (
        <div className="path-rise grid justify-items-center gap-4 py-2 text-center">
          <h2 className="text-balance font-display text-2xl font-semibold tracking-tight">
            {unanswered > 0
              ? `${unanswered} ${unanswered === 1 ? "question" : "questions"} still unanswered`
              : "Every question answered"}
          </h2>
          <p className="max-w-sm text-balance text-muted-foreground">
            {unanswered > 0
              ? `On the exam a blank counts as wrong, and here it does too. You have ${clock(left)} left.`
              : flaggedCount > 0
                ? `${flaggedCount} flagged to look at again. You have ${clock(left)} left.`
                : `You have ${clock(left)} left. Ready for your score?`}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="lg" className="h-12 px-6 text-base" onClick={() => finish(false)}>
              See my score
              <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-6 text-base"
              onClick={() =>
                unanswered > 0 ? go(firstUnanswered) : flaggedCount > 0 ? go(state.flagged[0]) : show("question")
              }
            >
              {unanswered > 0 ? "Answer them" : flaggedCount > 0 ? "Check the flagged" : "Keep checking"}
            </Button>
          </div>
          <LeaveNote onLeave={onLeave} />
        </div>
      )}
    </div>
  );
}

function LeaveNote({ onLeave }: { onLeave: () => void }) {
  return (
    <p className="text-center text-xs text-muted-foreground">
      <button type="button" onClick={onLeave} className="underline underline-offset-4 hover:text-foreground">
        Leave for now
      </button>
      : the clock stops and your answers are kept.
    </p>
  );
}
