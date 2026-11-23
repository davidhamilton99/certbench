"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { ArrowLeft, ArrowRight, Flag, LayoutGrid, Timer } from "lucide-react";
import { AnswerOption, OPTION_LETTERS } from "@/components/quiz/AnswerOption";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { clock } from "@/core/path/rehearsal";
import type { RehearsalRun } from "./rehearsal-run";
import { cn } from "@/lib/utils";

/** How often a running clock is saved to the device (answers save as they're given). */
const CLOCK_SAVE_MS = 10_000;
/** The clock turns amber with ten minutes left, red with one. */
const WARN_MS = 10 * 60_000;
const URGENT_MS = 60_000;
/** Longest gap one tick may count: a sleeping laptop doesn't eat the clock. */
const MAX_TICK_MS = 5_000;
/** The flag control keeps one name; whether it is set is its pressed state. */
const FLAG_LABEL = "Flag for review";
/** The letter that flags a question, so it never answers one. */
const FLAG_KEY = "F";

type Panel = "question" | "grid" | "finish";

/**
 * A practice exam in progress. One question at a time with no answers until
 * the end, as on the exam: flag anything to come back to, jump about from the
 * grid, finish when ready or when the clock runs out. The clock runs only while
 * the exam is on screen, so leaving pauses it. Every change goes up
 * (`onChange`) to be kept on the device.
 *
 * It is mounted in answer to a press ("Start", "Resume"), so it takes the
 * keyboard's focus as it arrives: the question is read by a screen reader and
 * the keys below work with no click. Each change of question or panel puts the
 * focus on the new heading. The row of Back, the position and Next is not part
 * of the question, so it stays where it is from one question to the next.
 *
 * Keyboard. The keys act only while the focus is inside the player, never from
 * elsewhere on the page. 1 to 4 or A to D choose an answer and F flags the
 * question. The answers are a radio group: one Tab stop, and the arrow keys
 * move between the answers while one of them has the focus. Anywhere else in
 * the player, the left and right arrows change the question.
 *
 * The free practice exams on public pages run on it too, under their own name
 * (`label`, `noun`).
 */
export function RehearsalPlayer({
  run,
  examCode,
  label = "Practice exam",
  noun = "practice exam",
  titleAs: Title = "p",
  heading: Heading = "h2",
  scoreNeedsAccount = false,
  onChange,
  onFinish,
  onLeave,
  keyboard = true,
}: {
  run: RehearsalRun;
  examCode: string;
  /** What this sitting is called above the question. */
  label?: string;
  /** The same in running words, as in "Finish the practice exam". */
  noun?: string;
  /**
   * "h1" where the exam is a screen of its own, so that the line that names it
   * is that screen's title (the study path). A public page has its own title
   * above the exam, and the line stays a paragraph.
   */
  titleAs?: "h1" | "p";
  /** The level of the question and panel headings: "h3" under a section that already has an h2. */
  heading?: "h2" | "h3";
  /**
   * True where finishing leads to an account form before the score (a signed-out
   * visitor on a public page): the last button then says only what it does.
   */
  scoreNeedsAccount?: boolean;
  onChange: (run: RehearsalRun) => void;
  onFinish: (run: RehearsalRun, timedOut: boolean) => void;
  /** Back to where the exam was opened from, the clock paused. */
  onLeave: () => void;
  /** False where the keys must not act on this player at all. */
  keyboard?: boolean;
}) {
  const [state, setState] = useState(run);
  const ref = useRef(state);
  const [panel, setPanel] = useState<Panel>("question");
  const [announce, setAnnounce] = useState("");
  // Counts the changes of screen the person has asked for; the heading of the
  // screen that follows takes the focus.
  const [arrival, setArrival] = useState(0);
  const finished = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const promptId = useId();
  const positionId = useId();
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
  // and ends the exam when it runs out.
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
          setAnnounce(mark === WARN_MS ? "Ten minutes remain." : "One minute remains.");
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

  // The heading of whatever has just arrived takes the focus: the first
  // question as the player opens, then each question, the grid and the finish
  // panel as the person moves to them. The page is not scrolled for it; `show`
  // has already brought the top of the card into view where that was needed.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [arrival]);

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
    setArrival((n) => n + 1);
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
      if (!current || !Number.isInteger(option) || option < 0 || option >= current.options.length) return;
      if (cur.picks[cur.i] === option) return;
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

  // Keys reach this handler only from inside the player (it is on the card,
  // not on the document), so a key pressed with the focus on the page's header
  // or a link elsewhere does nothing here.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!keyboard || panel !== "question" || e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    const onAnswer = target.getAttribute("role") === "radio";
    const cur = ref.current;
    const options = cur.reps[cur.i]?.options.length ?? 0;
    const key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    const digit = /^[1-9]$/.test(key) ? Number(key) : 0;
    const letter = key === FLAG_KEY ? -1 : (OPTION_LETTERS as readonly string[]).indexOf(key);
    const choice = digit >= 1 && digit <= options ? digit - 1 : letter >= 0 && letter < options ? letter : -1;
    if (choice >= 0) {
      e.preventDefault();
      pick(choice);
      // With the focus on an answer, it follows the choice, as in any radio group.
      if (onAnswer) rootRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[choice]?.focus();
    } else if (key === FLAG_KEY) {
      e.preventDefault();
      toggleFlag();
    } else if (key === "ArrowRight" && !onAnswer) {
      // On an answer the arrows belong to the radio group, which has already acted.
      e.preventDefault();
      if (cur.i < cur.reps.length - 1) go(cur.i + 1);
      else show("finish");
    } else if (key === "ArrowLeft" && !onAnswer) {
      e.preventDefault();
      go(cur.i - 1);
    }
  }

  const lastLetter = rep ? OPTION_LETTERS[Math.min(rep.options.length, OPTION_LETTERS.indexOf(FLAG_KEY)) - 1] : "D";

  return (
    <div
      ref={rootRef}
      // Focusable by a press anywhere on the card, so the keys then act on it.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="group/exam glass grid grid-cols-[minmax(0,1fr)] gap-6 rounded-lg p-5 sm:p-8"
    >
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Title className="cb-label min-w-0 text-muted-foreground">
            {examCode} {label.toLowerCase()}
          </Title>
          <span
            role="timer"
            aria-label={`${clock(left)} left`}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-xs px-2.5 py-1 text-small font-medium tabular-nums",
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
        {/* The way out is beside the clock on every panel, with what it does. */}
        <p className="text-note text-muted-foreground sm:text-right">
          <button type="button" onClick={onLeave} className="cb-link cb-tap font-medium">
            Pause and leave
          </button>
          . The clock stops, and your answers are kept.
        </p>
        <div className="flex items-center gap-3">
          {/* Drawn where it stands: an answer is often a key press, and nothing moves on one. */}
          <ProgressBar value={total > 0 ? (answered / total) * 100 : 0} still className="min-w-0 flex-1" />
          <span className="shrink-0 text-note tabular-nums text-muted-foreground">
            {answered} of {total} answered
          </span>
        </div>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      {panel === "question" && rep && (
        <div className="grid gap-5">
          {/* Keyed by the question: the question and its answers are new each
              time. Nothing here moves as it arrives: this is met 90 times in a
              sitting, often on a key press. */}
          <div key={state.i} className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <span id={positionId} className="cb-label text-muted-foreground">
                Question {state.i + 1} of {total}
              </span>
              <button
                type="button"
                aria-pressed={isFlagged}
                onClick={toggleFlag}
                className={cn(
                  "cb-tap inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-note font-medium transition-colors duration-100",
                  isFlagged
                    ? "border-warning-ink bg-warning/15 text-foreground"
                    : "border-input text-muted-foreground hover:border-primary hover:text-foreground"
                )}
              >
                <Flag className={cn("size-3.5", isFlagged && "fill-warning-ink text-warning-ink")} aria-hidden />
                {FLAG_LABEL}
              </button>
            </div>

            <Heading
              ref={headingRef}
              id={promptId}
              // Takes the focus so that it is read; it is not a control.
              tabIndex={-1}
              aria-describedby={positionId}
              className="text-pretty text-body font-medium sm:text-lg sm:leading-relaxed"
            >
              {rep.prompt}
            </Heading>

            <RadioGroup.Root
              value={picked === null ? null : String(picked)}
              onValueChange={(value) => pick(Number(value))}
              aria-labelledby={promptId}
              className="grid gap-2.5"
            >
              {rep.options.map((option, k) => (
                <RadioGroup.Item
                  key={`${k}-${option}`}
                  value={String(k)}
                  asChild
                  // A radio is chosen with Space; Enter chooses it here as well,
                  // as it did when the answers were plain buttons.
                  onKeyDown={(e) => {
                    if (e.key === "Enter") pick(k);
                  }}
                >
                  <AnswerOption marker={OPTION_LETTERS[k] ?? String(k + 1)} state={picked === k ? "chosen" : "idle"} dense>
                    {option}
                  </AnswerOption>
                </RadioGroup.Item>
              ))}
            </RadioGroup.Root>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" onClick={() => go(state.i - 1)} disabled={state.i === 0}>
              <ArrowLeft aria-hidden />
              Back
            </Button>
            {/* On a narrow screen the position takes a row of its own, so the
                three never push the card wider than the page. */}
            <Button
              variant="outline"
              onClick={() => show("grid")}
              className="order-last basis-full sm:order-none sm:basis-auto"
            >
              <LayoutGrid aria-hidden />
              <span className="tabular-nums">
                {state.i + 1} of {total}
              </span>
              <span className="sr-only">, show all questions</span>
            </Button>
            {state.i < total - 1 ? (
              <Button onClick={() => go(state.i + 1)}>
                Next
                <ArrowRight aria-hidden />
              </Button>
            ) : (
              <Button onClick={() => show("finish")}>
                Finish
                <ArrowRight aria-hidden />
              </Button>
            )}
          </div>

          {keyboard && (
            // Said only while the keys would act: the focus is inside the
            // player, on a device that has a keyboard. Its room is kept, so
            // nothing moves when it appears.
            <p className="invisible text-note text-muted-foreground group-focus-within/exam:visible pointer-coarse:hidden">
              You can answer with the keys A to {lastLetter} and flag the question with the {FLAG_KEY} key. Away from the
              answers, the left and right arrow keys change the question.
            </p>
          )}
        </div>
      )}

      {panel === "grid" && (
        <div className="grid gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <Heading ref={headingRef} tabIndex={-1} className="cb-statement">
              All questions
            </Heading>
            <p className="text-note tabular-nums text-muted-foreground">
              {answered} answered, {flaggedCount} flagged and {unanswered} not answered.
            </p>
          </div>
          <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5">
            {state.reps.map((r, k) => {
              const done = state.picks[k] !== null;
              const flag = state.flagged.includes(k);
              const current = k === state.i;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => go(k)}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "relative flex h-10 w-full items-center justify-center rounded-md border text-note font-semibold tabular-nums transition-colors duration-100",
                      // Answered is a filled cell and not answered an outlined
                      // one: told apart by light and dark, not by hue. A
                      // contrast theme removes fills, so there the answered
                      // cell is filled with the theme's highlight colour, which
                      // it keeps.
                      done
                        ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 forced-colors:forced-color-adjust-none forced-colors:border-[Highlight] forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]"
                        : "border-input bg-card text-foreground hover:border-primary hover:bg-tint-hover"
                    )}
                  >
                    {/* The space stands outside the hidden word, so the name
                        reads "Question 1" however a browser joins the parts. */}
                    <span className="sr-only">Question</span> {k + 1}
                    <span className="sr-only">
                      : {done ? "answered" : "not answered"}
                      {flag ? ", flagged" : ""}
                    </span>
                    {flag && (
                      <span
                        aria-hidden
                        className="absolute right-1 top-1 size-2 rounded-xs bg-warning-ink ring-2 ring-background forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText] forced-colors:ring-[Canvas]"
                      />
                    )}
                    {/* The question in hand: a rule under its number, which a
                        focus ring cannot be mistaken for. */}
                    {current && <span aria-hidden className="absolute inset-x-2.5 bottom-1 h-0.5 bg-current" />}
                  </button>
                </li>
              );
            })}
          </ol>
          {/* Each swatch is drawn as its cell is under a contrast theme too, so the key still matches the grid. */}
          <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-note text-muted-foreground">
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-3 rounded-xs border border-primary bg-primary forced-colors:forced-color-adjust-none forced-colors:border-[Highlight] forced-colors:bg-[Highlight]"
              />
              Answered
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span aria-hidden className="size-3 rounded-xs border border-input bg-card" />
              Not answered
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 rounded-xs bg-warning-ink forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]"
              />
              Flagged
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="h-0.5 w-3 bg-foreground forced-colors:forced-color-adjust-none forced-colors:bg-[Highlight]"
              />
              Current question
            </li>
          </ul>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="outline" onClick={() => show("question")}>
              <ArrowLeft aria-hidden />
              Question {state.i + 1}
            </Button>
            <Button onClick={() => show("finish")}>
              Finish the {noun}
              <ArrowRight aria-hidden />
            </Button>
          </div>
        </div>
      )}

      {panel === "finish" && (
        <div className="grid gap-4 py-2">
          <Heading ref={headingRef} tabIndex={-1} className="cb-statement">
            {unanswered > 0
              ? `${unanswered} ${unanswered === 1 ? "question is" : "questions are"} still unanswered.`
              : "Every question is answered."}
          </Heading>
          <p className="cb-measure-xs text-muted-foreground">
            {unanswered > 0
              ? `An unanswered question is counted as incorrect. You have ${clock(left)} remaining.`
              : flaggedCount > 0
                ? `You have flagged ${flaggedCount} ${flaggedCount === 1 ? "question" : "questions"} to review. You have ${clock(left)} remaining.`
                : scoreNeedsAccount
                  ? `You have ${clock(left)} remaining.`
                  : `You have ${clock(left)} remaining. You can finish now to see your score.`}
          </p>
          {scoreNeedsAccount && (
            <p className="cb-measure-xs text-small text-muted-foreground">
              Your score is shown once you have a free account.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="lg" className="h-auto min-h-12 max-w-full whitespace-normal py-2.5" onClick={() => finish(false)}>
              {scoreNeedsAccount ? "Finish the exam" : "Finish and view my score"}
              <ArrowRight aria-hidden />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-auto min-h-12 max-w-full whitespace-normal py-2.5"
              onClick={() =>
                unanswered > 0 ? go(firstUnanswered) : flaggedCount > 0 ? go(state.flagged[0]) : show("question")
              }
            >
              {unanswered > 0
                ? "Answer the remaining questions"
                : flaggedCount > 0
                  ? "Review the flagged questions"
                  : "Continue reviewing"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
