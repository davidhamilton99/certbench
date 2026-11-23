"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowRight } from "lucide-react";
import { AnswerOption, type AnswerState } from "@/components/quiz/AnswerOption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  SimDropdownField,
  SimField,
  SimFieldAnswer,
  SimSelectManyField,
  SimTextInputField,
  SimZonePlacementField,
} from "@/data/pbq/types";
import {
  answerText,
  callOrder,
  callPrompt,
  fieldCredit,
  inputModeFor,
  isNumberSet,
  isShortSet,
  pickOrder,
  sortOrder,
} from "@/core/pbq/sim-play";
import { seedFromString, shuffleSeeded } from "@/core/pbq/shuffle";
import { wordCount } from "@/core/path/text";
import { cn } from "@/lib/utils";

export interface MoveProps {
  /** The field's answer, once it's final: marked by the player straight away. */
  onAnswer: (answer: SimFieldAnswer) => void;
  /** On to the next move. Called once. */
  onNext: () => void;
  /**
   * Take the keyboard's focus on arrival. True for every move that follows
   * something the player did (the move before it, "Repeat the lab"); false for
   * the first move of a lab that is on the page as it loads.
   */
  takeFocus: boolean;
  /** Each answer given inside the move, the first included: the host knows play has started. */
  onStep?: () => void;
}

/**
 * One field of a simulation lab as a move: a pick is a set of answers, a
 * pick-all is a yes or no on each option in turn, a placement is a sort into
 * bins, and a typed answer is a box. Each is marked the moment it is answered.
 * Mount one per field (key it by id): its state is the move's state.
 *
 * A move answers the player and never the clock: after every answer, right or
 * wrong, it waits for "Continue", which takes the focus, so Enter or one tap
 * moves on.
 *
 * Keyboard. The keys printed in the answers' boxes (1 to 4, or Y and N) answer
 * the move, and they act only while the keyboard's focus is inside the move,
 * never from elsewhere on the page. A move that follows another takes the
 * focus as it arrives, so the keys carry from one move to the next with no
 * click, and a screen reader reads the new question.
 *
 * Screen readers. The answers are a group named by what is being asked. A
 * marked answer says so in words ("Correct answer: "), and the verdict is read
 * with the Continue button as the focus moves to it.
 */
export function SimMove({ field, ...props }: MoveProps & { field: SimField }) {
  switch (field.type) {
    case "dropdown":
      return <PickMove field={field} {...props} />;
    case "select-many":
      return <CallMove field={field} {...props} />;
    case "zone-placement":
      return <SortMove field={field} {...props} />;
    case "text":
      return <TypeMove field={field} {...props} />;
  }
}

/* ------------------------------------------------------------------ */
/*  Pick: one of a set of answers                                      */
/* ------------------------------------------------------------------ */

function PickMove({ field, onAnswer, onNext, onStep, takeFocus }: MoveProps & { field: SimDropdownField }) {
  const prompt = useRef<HTMLParagraphElement>(null);
  const promptId = useId();
  useTakeFocus(prompt, takeFocus);
  const order = useMemo(() => pickOrder(field), [field]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const ok = picked === field.correctIndex;
  const next = useOnce(onNext);
  const numbers = isNumberSet(field.options);

  function choose(option: number) {
    if (answered) return;
    setPicked(option);
    onStep?.();
    onAnswer({ type: "dropdown", selectedIndex: option });
  }

  function onKey(e: KeyboardEvent) {
    if (answered) return enterTo(e, next);
    const digit = Number(e.key);
    if (!Number.isInteger(digit) || digit < 1 || digit > order.length) return false;
    choose(order[digit - 1]);
    return true;
  }

  return (
    <MoveFrame
      kind="Choose one answer"
      prompt={field.label}
      promptId={promptId}
      promptRef={prompt}
      onKey={onKey}
      keysNote={answered ? undefined : `You can answer with the keys 1 to ${order.length}.`}
    >
      <div role="group" aria-labelledby={promptId} className={cn("grid gap-2.5", isShortSet(field.options) && "grid-cols-2")}>
        {order.map((option, pos) => (
          <AnswerOption
            key={option}
            marker={String(pos + 1)}
            {...markOf(answered, option === field.correctIndex, option === picked)}
            mono={numbers}
            dense={!numbers}
            disabled={answered}
            onClick={() => choose(option)}
          >
            {field.options[option]}
          </AnswerOption>
        ))}
      </div>
      {answered && (
        <Verdict onNext={next}>{ok ? <Right /> : <Wrong answer={answerText(field)} mono={numbers} />}</Verdict>
      )}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Pick-all: a yes or no on each option                               */
/* ------------------------------------------------------------------ */

function CallMove({ field, onAnswer, onNext, onStep, takeFocus }: MoveProps & { field: SimSelectManyField }) {
  const prompt = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const promptId = useId();
  const itemId = useId();
  useTakeFocus(prompt, takeFocus);
  const order = useMemo(() => callOrder(field), [field]);
  const isYes = useMemo(() => {
    const yes = new Set(field.correctIndices);
    return (option: number) => yes.has(option);
  }, [field.correctIndices]);
  const [calls, setCalls] = useState<(boolean | null)[]>(() => order.map(() => null));
  const [pos, setPos] = useState(0);
  const next = useOnce(onNext);

  const option = order[pos];
  const call = calls[pos];
  const answered = call !== null;
  const ok = answered && call === isYes(option);
  const finished = answered && pos === order.length - 1;
  const right = calls.filter((c, p) => c !== null && c === isYes(order[p])).length;

  function decide(yes: boolean) {
    if (answered) return;
    const made = calls.map((c, p) => (p === pos ? yes : c));
    setCalls(made);
    onStep?.();
    if (pos === order.length - 1) {
      onAnswer({ type: "select-many", selectedIndices: order.filter((_, p) => made[p] === true) });
    }
  }

  const step = useCallback(() => setPos((p) => Math.min(p + 1, order.length - 1)), [order.length]);
  useCardFocus(card, pos);

  function onKey(e: KeyboardEvent) {
    if (answered) return enterTo(e, finished ? next : step);
    const k = e.key.toLowerCase();
    const yes = k === "y" || e.key === "ArrowRight";
    if (!yes && k !== "n" && e.key !== "ArrowLeft") return false;
    decide(yes);
    return true;
  }

  return (
    <MoveFrame
      kind="Answer yes or no"
      count={`Item ${pos + 1} of ${order.length}`}
      prompt={callPrompt(field.label)}
      promptId={promptId}
      promptRef={prompt}
      lead
      onKey={onKey}
      keysNote={answered ? undefined : "You can answer with the keys Y and N."}
    >
      <ItemCard cardRef={card} id={itemId} key={`card-${pos}`} state={answered ? (ok ? "right" : "wrong") : null}>
        {field.options[option]}
      </ItemCard>
      <div role="group" aria-labelledby={itemId} className="grid grid-cols-2 gap-2.5">
        {[false, true].map((yes) => (
          <AnswerOption
            key={String(yes)}
            marker={yes ? "Y" : "N"}
            {...markOf(answered, isYes(option) === yes, call === yes)}
            aria-keyshortcuts={yes ? "Y" : "N"}
            disabled={answered}
            onClick={() => decide(yes)}
          >
            {yes ? "Yes" : "No"}
          </AnswerOption>
        ))}
      </div>
      <Pips
        count={order.length}
        current={pos}
        result={(p) => (calls[p] === null ? null : calls[p] === isYes(order[p]))}
      />
      {answered && (
        // Keyed by the item, so each verdict takes the focus as it arrives.
        <Verdict key={pos} onNext={finished ? next : step}>
          {ok ? <Right /> : <Wrong answer={isYes(option) ? "Yes" : "No"} />}
          {finished && <Tally n={right} of={order.length} what="answered correctly" />}
        </Verdict>
      )}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Placement: sort each item into its bin                             */
/* ------------------------------------------------------------------ */

function SortMove({ field, onAnswer, onNext, onStep, takeFocus }: MoveProps & { field: SimZonePlacementField }) {
  const prompt = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const promptId = useId();
  const itemId = useId();
  useTakeFocus(prompt, takeFocus);
  const order = useMemo(() => sortOrder(field), [field]);
  const [placed, setPlaced] = useState<number[]>(() => field.items.map(() => -1));
  const [pos, setPos] = useState(0);
  const next = useOnce(onNext);

  const item = order[pos];
  const zone = placed[item];
  const answered = zone !== -1;
  const ok = answered && zone === field.correctZones[item];
  const finished = answered && pos === order.length - 1;
  const right = field.items.filter((_, i) => placed[i] !== -1 && placed[i] === field.correctZones[i]).length;

  function drop(z: number) {
    if (answered) return;
    const made = placed.map((p, i) => (i === item ? z : p));
    setPlaced(made);
    onStep?.();
    if (pos === order.length - 1) onAnswer({ type: "zone-placement", placements: made });
  }

  const step = useCallback(() => setPos((p) => Math.min(p + 1, order.length - 1)), [order.length]);
  useCardFocus(card, pos);

  function onKey(e: KeyboardEvent) {
    if (answered) return enterTo(e, finished ? next : step);
    const digit = Number(e.key);
    if (!Number.isInteger(digit) || digit < 1 || digit > field.zones.length) return false;
    drop(digit - 1);
    return true;
  }

  const bins = field.zones.length;
  return (
    <MoveFrame
      kind="Sort the item"
      count={`Item ${pos + 1} of ${order.length}`}
      prompt={field.label}
      promptId={promptId}
      promptRef={prompt}
      lead
      onKey={onKey}
      keysNote={answered ? undefined : `You can answer with the keys 1 to ${bins}.`}
    >
      <ItemCard cardRef={card} id={itemId} key={`card-${pos}`} state={answered ? (ok ? "right" : "wrong") : null}>
        {field.items[item]}
      </ItemCard>
      <div
        role="group"
        aria-labelledby={itemId}
        className={cn(
          "grid gap-2.5",
          bins === 2 || bins === 4 ? "grid-cols-2" : bins === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        {field.zones.map((name, z) => {
          const count = placed.filter((p) => p === z).length;
          return (
            <AnswerOption
              key={z}
              marker={String(z + 1)}
              {...markOf(answered, z === field.correctZones[item], z === zone)}
              dense
              disabled={answered}
              onClick={() => drop(z)}
            >
              {name}
              {count > 0 && (
                // How many items have gone into this bin so far, right or wrong.
                <span aria-hidden className="ml-2 whitespace-nowrap text-note text-muted-foreground">
                  {count} placed
                </span>
              )}
            </AnswerOption>
          );
        })}
      </div>
      <Pips
        count={order.length}
        current={pos}
        result={(p) => (placed[order[p]] === -1 ? null : placed[order[p]] === field.correctZones[order[p]])}
      />
      {answered && (
        <Verdict key={pos} onNext={finished ? next : step}>
          {ok ? <Right /> : <Wrong answer={field.zones[field.correctZones[item]]} />}
          {finished && <Tally n={right} of={order.length} what="sorted correctly" />}
        </Verdict>
      )}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Typed: a box                                                       */
/* ------------------------------------------------------------------ */

function TypeMove({ field, onAnswer, onNext, onStep, takeFocus }: MoveProps & { field: SimTextInputField }) {
  const prompt = useRef<HTMLParagraphElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const promptId = useId();
  const [typed, setTyped] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const answered = ok !== null;
  const next = useOnce(onNext);
  const mode = inputModeFor(field);

  // Into the box where there's a keyboard to type with; on a phone the focus
  // goes to the question, and a tap opens the box, so the evidence isn't
  // buried under the keyboard first.
  useEffect(() => {
    if (!takeFocus) return;
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    (fine ? box.current : prompt.current)?.focus({ preventScroll: true });
  }, [takeFocus]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (answered || !typed.trim()) return;
    const answer: SimFieldAnswer = { type: "text", value: typed };
    setOk(fieldCredit(field, answer) >= 1);
    onStep?.();
    onAnswer(answer);
  }

  return (
    <MoveFrame
      kind="Type the answer"
      prompt={field.label}
      promptId={promptId}
      promptRef={prompt}
      onKey={(e) => (answered ? enterTo(e, next) : false)}
    >
      <form onSubmit={submit} className="flex gap-2.5">
        <Input
          ref={box}
          aria-labelledby={promptId}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode={mode}
          placeholder={field.placeholder ?? (mode === "text" ? "Type your answer" : "")}
          value={typed}
          readOnly={answered}
          aria-invalid={answered && !ok ? true : undefined}
          onChange={(e) => setTyped(e.target.value)}
          className={cn(
            "h-12 font-mono text-base sm:text-lg md:text-lg pointer-coarse:h-12",
            mode === "text" ? "flex-1" : "max-w-64",
            answered && ok && "border-success bg-success/10",
            answered && !ok && "border-destructive bg-destructive/10"
          )}
        />
        {!answered && (
          <Button type="submit" size="lg" className="h-12 shrink-0 px-4 sm:px-6" disabled={!typed.trim()}>
            Check answer
          </Button>
        )}
      </form>
      {answered && <Verdict onNext={next}>{ok ? <Right /> : <Wrong answer={answerText(field)} mono />}</Verdict>}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Matching: one item at a time, its partner from a set               */
/* ------------------------------------------------------------------ */

/**
 * A matching lab as a run of picks: each item comes up on its own and its
 * partner is chosen from the set. A partner that has been matched (or shown
 * after a miss) drops out, the way pairs leave a matching game, while every
 * partner keeps its place so nothing moves under a finger.
 */
export function MatchMove({
  prompt,
  left,
  right,
  correctMap,
  seed,
  onAnswer,
  onNext,
  onStep,
  takeFocus,
}: Omit<MoveProps, "onAnswer"> & {
  prompt: string;
  left: readonly string[];
  right: readonly string[];
  /** correctMap[leftIndex] = rightIndex. */
  correctMap: readonly number[];
  /** Seeds the order the items come up in and the partners' places. */
  seed: string;
  /** Each item's pick by its index, once every item is matched. */
  onAnswer: (map: number[]) => void;
}) {
  const promptRef = useRef<HTMLParagraphElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const promptId = useId();
  const itemId = useId();
  useTakeFocus(promptRef, takeFocus);
  const order = useMemo(() => shuffleSeeded(left.length, seedFromString(`${seed}:match-items`)), [left.length, seed]);
  const tiles = useMemo(() => shuffleSeeded(right.length, seedFromString(`${seed}:match-tiles`)), [right.length, seed]);
  const [picks, setPicks] = useState<number[]>(() => left.map(() => -1));
  const [pos, setPos] = useState(0);
  const next = useOnce(onNext);

  const item = order[pos];
  const picked = picks[item];
  const answered = picked !== -1;
  const ok = answered && picked === correctMap[item];
  const finished = answered && pos === order.length - 1;
  const matched = left.filter((_, l) => picks[l] !== -1 && picks[l] === correctMap[l]).length;
  // The partners of the items already played are out of play.
  const gone = useMemo(() => new Set(order.slice(0, pos).map((l) => correctMap[l])), [order, pos, correctMap]);

  function choose(r: number) {
    if (answered || gone.has(r)) return;
    const made = picks.map((p, l) => (l === item ? r : p));
    setPicks(made);
    onStep?.();
    if (pos === order.length - 1) onAnswer(made);
  }

  const step = useCallback(() => setPos((p) => Math.min(p + 1, order.length - 1)), [order.length]);
  useCardFocus(card, pos);

  function onKey(e: KeyboardEvent) {
    if (answered) return enterTo(e, finished ? next : step);
    const digit = Number(e.key);
    if (!Number.isInteger(digit) || digit < 1 || digit > tiles.length || gone.has(tiles[digit - 1])) return false;
    choose(tiles[digit - 1]);
    return true;
  }

  const numbers = isNumberSet(right);
  return (
    <MoveFrame
      kind="Match the item"
      count={`Item ${pos + 1} of ${order.length}`}
      prompt={prompt}
      promptId={promptId}
      promptRef={promptRef}
      lead
      onKey={onKey}
      keysNote={answered ? undefined : `You can answer with the keys 1 to ${tiles.length}.`}
    >
      <ItemCard
        cardRef={card}
        id={itemId}
        key={`card-${pos}`}
        state={answered ? (ok ? "right" : "wrong") : null}
        mono={isNumberSet(left)}
      >
        {left[item]}
      </ItemCard>
      <div role="group" aria-labelledby={itemId} className={cn("grid gap-2.5", isShortSet(right) && "grid-cols-2")}>
        {tiles.map((r, n) => {
          const out = gone.has(r);
          return (
            <AnswerOption
              key={r}
              marker={String(n + 1)}
              {...(out
                ? { state: "dimmed" as const, srPrefix: "No longer available: " }
                : markOf(answered, r === correctMap[item], r === picked))}
              mono={numbers}
              dense={!numbers}
              disabled={answered || out}
              // A partner that is out of play keeps its place, drawn as an empty slot.
              className={out ? "border-dashed" : undefined}
              onClick={() => choose(r)}
            >
              {out ? <span className="line-through">{right[r]}</span> : right[r]}
            </AnswerOption>
          );
        })}
      </div>
      <Pips
        count={order.length}
        current={pos}
        result={(p) => (picks[order[p]] === -1 ? null : picks[order[p]] === correctMap[order[p]])}
      />
      {answered && (
        <Verdict key={pos} onNext={finished ? next : step}>
          {ok ? <Right /> : <Wrong answer={right[correctMap[item]]} mono={numbers} />}
          {finished && <Tally n={matched} of={order.length} what="matched correctly" />}
        </Verdict>
      )}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

/**
 * How an answer is drawn and announced once the move is marked: the correct
 * one, the one that was chosen, and the rest.
 */
function markOf(marked: boolean, isAnswer: boolean, isPicked: boolean): { state: AnswerState; srPrefix?: string } {
  if (!marked) return { state: "idle" };
  if (isAnswer) {
    return { state: "correct", srPrefix: isPicked ? "Your answer, which is correct: " : "Correct answer: " };
  }
  if (isPicked) return { state: "incorrect", srPrefix: "Your answer, which is incorrect: " };
  return { state: "dimmed" };
}

/**
 * The frame of a move: what kind of move it is, where it stands in a run, and
 * what it asks. The frame listens for the move's keys, so they act only while
 * the keyboard's focus is inside it.
 */
function MoveFrame({
  kind,
  count,
  prompt,
  promptId,
  promptRef,
  lead = false,
  onKey,
  keysNote,
  children,
}: {
  kind: string;
  count?: string;
  prompt: string;
  promptId: string;
  promptRef: RefObject<HTMLParagraphElement | null>;
  /** The ask leads into cards (a yes or no run, a sort): set smaller, the card is the thing to read. */
  lead?: boolean;
  /** The move's keys. Returns true when it used the key. */
  onKey: (e: KeyboardEvent) => boolean;
  /** A sentence saying which keys answer, shown only while they would act. */
  keysNote?: string;
  children: ReactNode;
}) {
  const long = wordCount(prompt) > 14;

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    const target = e.target as HTMLElement;
    // Typing in a box is typing, not a shortcut.
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable) {
      return;
    }
    if (onKey(e)) e.preventDefault();
  }

  return (
    <div
      // Focusable by a press anywhere on the move, so its keys then act on it.
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="group/move grid min-w-0 gap-4 sm:gap-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="cb-label text-muted-foreground">{kind}</span>
        {count && <span className="shrink-0 text-note tabular-nums text-muted-foreground">{count}</span>}
      </div>
      <p
        id={promptId}
        // Takes the focus so that it is read; it is not a control.
        ref={promptRef}
        tabIndex={-1}
        className={
          lead
            ? "text-pretty text-small font-medium text-muted-foreground"
            : long
              ? "text-pretty text-body font-medium sm:text-lg sm:leading-relaxed"
              : "text-pretty text-xl font-semibold leading-snug sm:text-2xl"
        }
      >
        {prompt}
      </p>
      {children}
      {keysNote && (
        // Said only while the keys would act: the focus is inside the move, on
        // a device with a keyboard. Its line is kept on such a device, so
        // nothing below moves when the focus arrives.
        <p className="invisible -mt-1 text-note text-muted-foreground group-focus-within/move:visible pointer-coarse:hidden">
          {keysNote}
        </p>
      )}
    </div>
  );
}

/** The thing being called, sorted or matched, set large, one at a time. */
function ItemCard({
  cardRef,
  id,
  state,
  mono = false,
  children,
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  /** Names the group of answers under the card. */
  id: string;
  state: "right" | "wrong" | null;
  /** A code or a number (a port, a RAID level): set large in mono. */
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      ref={cardRef}
      // Takes the focus so that each new item is read; it is not a control.
      tabIndex={-1}
      className={cn(
        "grid min-h-24 place-items-center rounded-lg border bg-card px-5 py-6 text-center",
        state === null && "border-border",
        state === "right" && "border-success bg-success/10",
        state === "wrong" && "border-destructive bg-destructive/10"
      )}
    >
      <p
        id={id}
        className={cn(
          "text-balance leading-snug [overflow-wrap:anywhere]",
          mono ? "font-mono text-2xl font-semibold sm:text-3xl" : "text-lg font-medium sm:text-xl"
        )}
      >
        {children}
      </p>
    </div>
  );
}

/** One mark per item in a run: the answered ones by result, the one in hand in the page's blue. */
function Pips({ count, current, result }: { count: number; current: number; result: (p: number) => boolean | null }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
      {Array.from({ length: count }, (_, p) => {
        const r = result(p);
        return (
          <span
            key={p}
            className={cn(
              "size-2 rounded-xs",
              r === true && "bg-success",
              r === false && "bg-warning",
              r === null && (p === current ? "bg-primary" : "bg-foreground/[0.12]")
            )}
          />
        );
      })}
    </div>
  );
}

function Right() {
  return <span className="font-semibold text-success">Correct.</span>;
}

/** "Incorrect. The correct answer is X.", in the words every question on the site uses. */
function Wrong({ answer, mono = false }: { answer: string; mono?: boolean }) {
  // An answer that is itself a sentence brings its own full stop.
  const text = answer.replace(/\.$/, "");
  return (
    <span className="font-semibold text-destructive">
      Incorrect. The correct answer is {mono ? <code className="font-mono">{text}</code> : text}.
    </span>
  );
}

/** How the whole run went, said after its last item's verdict. */
function Tally({ n, of, what }: { n: number; of: number; what: string }) {
  return (
    <>
      {/* The space stands between the two sentences, not inside the second: read out, they stay two. */}{" "}
      <span className="text-muted-foreground">
        {n} of {of} {what}.
      </span>
    </>
  );
}

/**
 * The mark under a move and the way on. It waits for the player after every
 * answer, right or wrong. "Continue" takes the focus as the verdict arrives and
 * is described by it, so a screen reader reads the verdict with the button,
 * and Enter or Space moves on.
 */
function Verdict({ onNext, children }: { onNext: () => void; children: ReactNode }) {
  const foot = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const verdictId = useId();

  // The verdict is brought into view if it is not already (a small phone, a
  // page at 400%), so the button that takes the focus is never off the screen.
  useEffect(() => {
    const box = foot.current;
    if (box && typeof box.scrollIntoView === "function") {
      const at = box.getBoundingClientRect();
      if (at.top < 0 || at.bottom > window.innerHeight) {
        const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
        box.scrollIntoView({ block: "nearest", behavior: still ? "auto" : "smooth" });
      }
    }
    button.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      ref={foot}
      className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3 border-t border-border pt-4 sm:flex-nowrap"
    >
      <p id={verdictId} className="min-w-0 flex-1 basis-60 text-small leading-relaxed">
        {children}
      </p>
      <Button
        ref={button}
        onClick={onNext}
        aria-describedby={verdictId}
        className="h-11 w-full shrink-0 sm:h-10 sm:w-auto"
      >
        Continue
        <ArrowRight />
      </Button>
    </div>
  );
}

/** `fn`, callable once: a second press of Continue (or Enter held down) must not skip a move. */
function useOnce(fn: () => void): () => void {
  const done = useRef(false);
  const latest = useRef(fn);
  useEffect(() => {
    latest.current = fn;
  }, [fn]);
  return useCallback(() => {
    if (done.current) return;
    done.current = true;
    latest.current();
  }, []);
}

/** Focus the move's question when it arrives, for keyboards and screen readers. Scrolling is the player's call. */
function useTakeFocus(target: RefObject<HTMLElement | null>, takeFocus: boolean) {
  useEffect(() => {
    if (takeFocus) target.current?.focus({ preventScroll: true });
  }, [target, takeFocus]);
}

/** Each new item in a run takes the focus (never the first), so a screen reader reads it and the keys stay with the move. */
function useCardFocus(card: RefObject<HTMLElement | null>, pos: number) {
  const shown = useRef(pos);
  useEffect(() => {
    if (shown.current === pos) return;
    shown.current = pos;
    card.current?.focus({ preventScroll: true });
  }, [card, pos]);
}

/** Enter moves on, unless it is on a button (which presses itself). */
function enterTo(e: KeyboardEvent, go: () => void): boolean {
  if (e.key !== "Enter" || (e.target as HTMLElement | null)?.tagName === "BUTTON") return false;
  go();
  return true;
}
