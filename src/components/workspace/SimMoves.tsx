"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { ArrowRight, Check, X } from "lucide-react";
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
import { wordCount } from "@/core/path/text";
import { cn } from "@/lib/utils";

/** How long a right answer stays up before the lab moves on by itself. */
export const MOVE_ADVANCE_MS = 1200;
/** Within a run of yes/no calls or a sort, a right one moves on quicker. */
export const STEP_ADVANCE_MS = 650;

export interface MoveProps {
  /** The field's answer, once it's final: marked by the player straight away. */
  onAnswer: (answer: SimFieldAnswer) => void;
  /** On to the next move. Called once. */
  onNext: () => void;
  /** Whether keys play this move: false while another player on the page has them. */
  keyboard: boolean;
  /** Take focus when shown (every move after a run's first), so keys and screen readers follow. */
  takeFocus: boolean;
}

/**
 * One field of a simulation lab as a move: a pick is tiles, a pick-all is a
 * yes or no on each option in turn, a placement is a sort into bins, and a
 * typed answer is a box. Each is marked the moment it's answered; right
 * answers move on by themselves and misses wait, so there's time to see why.
 * Mount one per field (key it by id): its state is the move's state.
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
/*  Pick: tiles                                                        */
/* ------------------------------------------------------------------ */

function PickMove({ field, onAnswer, onNext, keyboard, takeFocus }: MoveProps & { field: SimDropdownField }) {
  const root = useRef<HTMLDivElement>(null);
  useTakeFocus(root, takeFocus);
  const order = useMemo(() => pickOrder(field), [field]);
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const ok = picked === field.correctIndex;
  const next = useOnce(onNext);
  const numbers = isNumberSet(field.options);

  function choose(option: number) {
    if (answered) return;
    setPicked(option);
    onAnswer({ type: "dropdown", selectedIndex: option });
  }

  useKeys(keyboard, (e) => {
    if (!answered) {
      const digit = Number(e.key);
      if (!Number.isInteger(digit) || digit < 1 || digit > order.length) return false;
      choose(order[digit - 1]);
      return true;
    }
    return enterTo(e, next);
  });

  return (
    <MoveFrame rootRef={root} kind="Pick one" prompt={field.label}>
      <div
        role="radiogroup"
        aria-label="Answers"
        className={cn("grid gap-2.5", isShortSet(field.options) && "grid-cols-2")}
      >
        {order.map((option, pos) => {
          const isAnswer = option === field.correctIndex;
          const isPicked = option === picked;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={answered}
              onClick={() => choose(option)}
              className={cn(
                "group flex min-h-12 w-full min-w-0 items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left transition-[border-color,background-color,opacity,transform] duration-150",
                !answered && "hover:border-primary/60 hover:bg-primary/[0.03] active:scale-[0.99]",
                answered && isAnswer && "border-success bg-success/10",
                answered && isPicked && !isAnswer && "border-destructive bg-destructive/10",
                answered && !isAnswer && !isPicked && "opacity-45"
              )}
            >
              <Mark n={pos + 1} right={answered && isAnswer} wrong={answered && isPicked && !isAnswer} />
              <span
                className={cn(
                  "min-w-0 [overflow-wrap:anywhere]",
                  numbers ? "font-mono text-lg font-medium" : "text-[15px] leading-snug"
                )}
              >
                {field.options[option]}
              </span>
            </button>
          );
        })}
      </div>
      {answered && (
        <Verdict ok={ok} onNext={next} auto={ok} ms={MOVE_ADVANCE_MS} focusButton>
          {ok ? (
            <Right />
          ) : (
            // The answer is ticked on its tile; spelling it out again would be a sentence to read.
            <>
              <Correction>Not quite.</Correction>{" "}
              <span className="text-muted-foreground">The answer is ticked.</span>
              <span className="sr-only"> It&apos;s {answerText(field)}.</span>
            </>
          )}
        </Verdict>
      )}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Pick-all: a yes or no on each option                               */
/* ------------------------------------------------------------------ */

function CallMove({ field, onAnswer, onNext, keyboard, takeFocus }: MoveProps & { field: SimSelectManyField }) {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  useTakeFocus(root, takeFocus);
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
    if (pos === order.length - 1) {
      onAnswer({ type: "select-many", selectedIndices: order.filter((_, p) => made[p] === true) });
    }
  }

  const step = useCallback(() => setPos((p) => Math.min(p + 1, order.length - 1)), [order.length]);

  // Each new card takes focus, so a screen reader reads it.
  const shown = useRef(pos);
  useEffect(() => {
    if (shown.current === pos) return;
    shown.current = pos;
    card.current?.focus({ preventScroll: true });
  }, [pos]);

  useKeys(keyboard, (e) => {
    if (!answered) {
      const k = e.key.toLowerCase();
      const yes = k === "y" || e.key === "ArrowRight";
      if (!yes && k !== "n" && e.key !== "ArrowLeft") return false;
      decide(yes);
      return true;
    }
    return enterTo(e, finished ? next : step);
  });

  return (
    <MoveFrame rootRef={root} kind="Yes or no" count={`${pos + 1} / ${order.length}`} prompt={callPrompt(field.label)} lead>
      <ItemCard cardRef={card} key={`card-${pos}`} state={answered ? (ok ? "right" : "wrong") : null}>
        {field.options[option]}
      </ItemCard>
      <div className="grid grid-cols-2 gap-2.5">
        {[false, true].map((yes) => {
          const chosen = answered && call === yes;
          const shouldBe = answered && isYes(option) === yes;
          return (
            <button
              key={String(yes)}
              type="button"
              disabled={answered}
              onClick={() => decide(yes)}
              aria-keyshortcuts={yes ? "Y" : "N"}
              className={cn(
                "flex h-14 items-center justify-center gap-2 rounded-xl border bg-card text-base font-semibold transition-[border-color,background-color,opacity,transform] duration-150",
                !answered && "hover:border-primary/60 hover:bg-primary/[0.04] active:scale-[0.98]",
                chosen && ok && "border-success bg-success/10 text-success",
                chosen && !ok && "border-destructive bg-destructive/10 text-destructive",
                !chosen && shouldBe && "border-success/70 text-success",
                !chosen && !shouldBe && answered && "opacity-45"
              )}
            >
              {yes ? <Check className="size-5" strokeWidth={3} aria-hidden /> : <X className="size-5" strokeWidth={3} aria-hidden />}
              {yes ? "Yes" : "No"}
              <kbd className="hidden rounded border border-border px-1.5 font-mono text-[10px] font-normal text-muted-foreground sm:inline">
                {yes ? "Y" : "N"}
              </kbd>
            </button>
          );
        })}
      </div>
      <Pips
        count={order.length}
        current={pos}
        result={(p) => (calls[p] === null ? null : calls[p] === isYes(order[p]))}
      />
      {answered &&
        (finished ? (
          <Verdict ok={ok} onNext={next} auto={right === order.length} ms={MOVE_ADVANCE_MS} focusButton>
            {ok ? <Right /> : <Correction>That one&apos;s a {isYes(option) ? "yes" : "no"}.</Correction>}{" "}
            <Tally n={right} of={order.length} what="called right" />
          </Verdict>
        ) : (
          <Verdict key={`step-${pos}`} ok={ok} onNext={step} auto={ok} ms={STEP_ADVANCE_MS} focusButton={!ok}>
            {ok ? <Right /> : <Correction>That one&apos;s a {isYes(option) ? "yes" : "no"}.</Correction>}
          </Verdict>
        ))}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Placement: sort each item into its bin                             */
/* ------------------------------------------------------------------ */

function SortMove({ field, onAnswer, onNext, keyboard, takeFocus }: MoveProps & { field: SimZonePlacementField }) {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  useTakeFocus(root, takeFocus);
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
    if (pos === order.length - 1) onAnswer({ type: "zone-placement", placements: made });
  }

  const step = useCallback(() => setPos((p) => Math.min(p + 1, order.length - 1)), [order.length]);

  const shown = useRef(pos);
  useEffect(() => {
    if (shown.current === pos) return;
    shown.current = pos;
    card.current?.focus({ preventScroll: true });
  }, [pos]);

  useKeys(keyboard, (e) => {
    if (!answered) {
      const digit = Number(e.key);
      if (!Number.isInteger(digit) || digit < 1 || digit > field.zones.length) return false;
      drop(digit - 1);
      return true;
    }
    return enterTo(e, finished ? next : step);
  });

  const bins = field.zones.length;
  return (
    <MoveFrame rootRef={root} kind="Sort it" count={`${pos + 1} / ${order.length}`} prompt={field.label} lead>
      <ItemCard cardRef={card} key={`card-${pos}`} state={answered ? (ok ? "right" : "wrong") : null}>
        {field.items[item]}
      </ItemCard>
      <div
        className={cn(
          "grid gap-2.5",
          bins === 2 || bins === 4 ? "grid-cols-2" : bins === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"
        )}
      >
        {field.zones.map((name, z) => {
          const count = placed.filter((p) => p === z).length;
          const isRight = answered && z === field.correctZones[item];
          const isPicked = answered && z === zone;
          return (
            <button
              key={z}
              type="button"
              disabled={answered}
              onClick={() => drop(z)}
              className={cn(
                "grid min-h-[4.5rem] min-w-0 content-between gap-2 rounded-xl border bg-card p-3 text-left transition-[border-color,background-color,opacity,transform] duration-150",
                !answered && "hover:border-primary/60 hover:bg-primary/[0.04] active:scale-[0.98]",
                isRight && "border-success bg-success/10",
                isPicked && !isRight && "border-destructive bg-destructive/10",
                answered && !isRight && !isPicked && "opacity-45"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <Mark n={z + 1} right={isRight} wrong={isPicked && !isRight} />
                <span aria-hidden className="font-mono text-xs tabular-nums text-muted-foreground">
                  {count > 0 ? `×${count}` : ""}
                </span>
              </span>
              <span className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">{name}</span>
            </button>
          );
        })}
      </div>
      <Pips
        count={order.length}
        current={pos}
        result={(p) => (placed[order[p]] === -1 ? null : placed[order[p]] === field.correctZones[order[p]])}
      />
      {answered &&
        (finished ? (
          <Verdict ok={ok} onNext={next} auto={right === order.length} ms={MOVE_ADVANCE_MS} focusButton>
            {ok ? <Right /> : <Correction>It goes in {field.zones[field.correctZones[item]]}.</Correction>}{" "}
            <Tally n={right} of={order.length} what="sorted right" />
          </Verdict>
        ) : (
          <Verdict key={`step-${pos}`} ok={ok} onNext={step} auto={ok} ms={STEP_ADVANCE_MS} focusButton={!ok}>
            {ok ? <Right /> : <Correction>It goes in {field.zones[field.correctZones[item]]}.</Correction>}
          </Verdict>
        ))}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Typed: a box                                                       */
/* ------------------------------------------------------------------ */

function TypeMove({ field, onAnswer, onNext, keyboard, takeFocus }: MoveProps & { field: SimTextInputField }) {
  const root = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const [ok, setOk] = useState<boolean | null>(null);
  const answered = ok !== null;
  const next = useOnce(onNext);
  const mode = inputModeFor(field);

  // Into the box where there's a keyboard to type with; on a phone, a tap
  // opens it, so the evidence isn't buried under the keyboard first.
  useEffect(() => {
    if (!takeFocus) return;
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    (fine ? box.current : root.current)?.focus({ preventScroll: true });
  }, [takeFocus]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (answered || !typed.trim()) return;
    const answer: SimFieldAnswer = { type: "text", value: typed };
    setOk(fieldCredit(field, answer) >= 1);
    onAnswer(answer);
  }

  useKeys(keyboard, (e) => (answered ? enterTo(e, next) : false));

  return (
    <MoveFrame rootRef={root} kind="Type it" prompt={field.label}>
      <form onSubmit={submit} className="flex gap-2.5">
        <Input
          ref={box}
          aria-label={field.label}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          inputMode={mode}
          placeholder={field.placeholder ?? (mode === "text" ? "Type it here" : "")}
          value={typed}
          readOnly={answered}
          aria-invalid={answered && !ok ? true : undefined}
          onChange={(e) => setTyped(e.target.value)}
          className={cn(
            "h-12 font-mono text-base sm:text-lg",
            mode === "text" ? "flex-1" : "max-w-64",
            answered && ok && "border-success bg-success/10",
            answered && !ok && "border-destructive bg-destructive/10"
          )}
        />
        {!answered && (
          <Button type="submit" size="lg" className="h-12 shrink-0 px-4 sm:px-6" disabled={!typed.trim()}>
            Check
          </Button>
        )}
      </form>
      {answered && (
        <Verdict ok={Boolean(ok)} onNext={next} auto={Boolean(ok)} ms={MOVE_ADVANCE_MS} focusButton>
          {ok ? (
            <Right />
          ) : (
            <Correction>
              It&apos;s <code className="font-mono">{answerText(field)}</code>.
            </Correction>
          )}
        </Verdict>
      )}
    </MoveFrame>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared pieces                                                      */
/* ------------------------------------------------------------------ */

/** The move's chip (what kind of move it is), its count, and its ask. */
function MoveFrame({
  rootRef,
  kind,
  count,
  prompt,
  lead = false,
  children,
}: {
  rootRef: RefObject<HTMLDivElement | null>;
  kind: string;
  count?: string;
  prompt: string;
  /** The ask leads into cards (a yes/no run, a sort): set smaller, the card is the thing to read. */
  lead?: boolean;
  children: ReactNode;
}) {
  const long = wordCount(prompt) > 14;
  return (
    <div ref={rootRef} tabIndex={-1} className="path-rise grid min-w-0 gap-4 outline-none sm:gap-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex w-fit items-center rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-primary">
          {kind}
        </span>
        {count && <span className="font-mono text-xs tabular-nums text-muted-foreground">{count}</span>}
      </div>
      <p
        className={cn(
          "text-balance",
          lead
            ? "text-[15px] font-medium leading-relaxed text-muted-foreground"
            : long
              ? "text-[17px] font-medium leading-relaxed sm:text-lg"
              : "font-display text-xl font-semibold leading-snug tracking-tight sm:text-2xl"
        )}
      >
        {prompt}
      </p>
      {children}
    </div>
  );
}

/** The thing being called or sorted, big, one at a time. */
function ItemCard({
  cardRef,
  state,
  children,
}: {
  cardRef: RefObject<HTMLDivElement | null>;
  state: "right" | "wrong" | null;
  children: ReactNode;
}) {
  return (
    <div
      ref={cardRef}
      tabIndex={-1}
      className={cn(
        "path-rise grid min-h-24 place-items-center rounded-2xl border-2 bg-card px-5 py-6 text-center outline-none transition-colors duration-150",
        state === null && "border-border",
        state === "right" && "border-success bg-success/[0.06]",
        state === "wrong" && "border-destructive bg-destructive/[0.05]"
      )}
    >
      <p className="text-balance text-lg font-medium leading-snug [overflow-wrap:anywhere] sm:text-xl">{children}</p>
    </div>
  );
}

/** A tile's number, turning into a tick or a cross once it's marked. */
function Mark({ n, right, wrong }: { n: number; right: boolean; wrong: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md border font-mono text-[11px] text-muted-foreground transition-colors",
        right && "path-pop border-success bg-success text-success-foreground",
        wrong && "border-destructive bg-destructive text-white"
      )}
    >
      {right ? <Check className="size-3.5" strokeWidth={3} /> : wrong ? <X className="size-3.5" strokeWidth={3} /> : n}
    </span>
  );
}

/** One pip per card in a run: the marked ones by result, the current one lit. */
function Pips({ count, current, result }: { count: number; current: number; result: (p: number) => boolean | null }) {
  return (
    <div className="flex flex-wrap justify-center gap-1.5" aria-hidden>
      {Array.from({ length: count }, (_, p) => {
        const r = result(p);
        return (
          <span
            key={p}
            className={cn(
              "size-2 rounded-full transition-colors duration-300",
              r === true && "bg-success",
              r === false && "bg-warning",
              r === null && (p === current ? "bg-primary" : "bg-muted")
            )}
          />
        );
      })}
    </div>
  );
}

function Right() {
  return <span className="font-semibold text-success">Right.</span>;
}

function Correction({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-destructive">{children}</span>;
}

function Tally({ n, of, what }: { n: number; of: number; what: string }) {
  return (
    <span className="text-muted-foreground">
      {n} of {of} {what}.
    </span>
  );
}

/**
 * The mark under a move: right or the correction, and the way on. Right
 * answers move on by themselves after `ms` (the bar drains to show it).
 */
function Verdict({
  ok,
  onNext,
  auto,
  ms,
  focusButton,
  children,
}: {
  ok: boolean;
  onNext: () => void;
  auto: boolean;
  ms: number;
  /** Put focus on the way on, so Enter or Space continues. */
  focusButton: boolean;
  children: ReactNode;
}) {
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (focusButton) button.current?.focus({ preventScroll: true });
  }, [focusButton]);

  useEffect(() => {
    if (!auto) return;
    const t = window.setTimeout(onNext, ms);
    return () => window.clearTimeout(t);
  }, [auto, ms, onNext]);

  return (
    <div
      role="status"
      className={cn("path-rise grid gap-3 rounded-xl px-4 py-3.5", ok ? "bg-success/10" : "bg-destructive/[0.07]")}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="min-w-0 flex-1 basis-56 text-[15px] leading-relaxed">{children}</p>
        <Button ref={button} size="sm" variant={ok ? "outline" : "default"} onClick={onNext} className="shrink-0">
          {ok ? "Next" : "Got it"}
          <ArrowRight />
        </Button>
      </div>
      {auto && (
        <span
          aria-hidden
          className="path-drain block h-0.5 rounded-full bg-success/60"
          style={{ "--dur": `${ms}ms` } as CSSProperties}
        />
      )}
    </div>
  );
}

/** `fn`, callable once: a timer and a click can both try to move on. */
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

/** Focus the move when it's shown, for keyboards and screen readers. Scrolling is the player's call. */
function useTakeFocus(root: RefObject<HTMLElement | null>, takeFocus: boolean) {
  useEffect(() => {
    if (takeFocus) root.current?.focus({ preventScroll: true });
  }, [root, takeFocus]);
}

/**
 * Keys for the move while it holds the page's turn. The handler returns true
 * when it used the key. Typing in a box and shortcuts with a modifier pass.
 */
function useKeys(enabled: boolean, handler: (e: KeyboardEvent) => boolean) {
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (latest.current(e)) e.preventDefault();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** Enter moves on, unless it's on a button (which clicks itself). */
function enterTo(e: KeyboardEvent, go: () => void): boolean {
  if (e.key !== "Enter" || (e.target as HTMLElement | null)?.tagName === "BUTTON") return false;
  go();
  return true;
}
