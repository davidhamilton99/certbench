"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Rep } from "@/core/path/types";
import { useKeyboardTurn } from "@/components/path/keyboard-turn";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import type { DrillRounds } from "./useDrillRounds";

/** One question of a drill: the card to show, and the item its answer counts for. */
export interface Dealt {
  rep: Rep;
  /** A port, an acronym, a subnetting skill: what the round records the answer against. */
  item: string;
}

/** The card's top lines: what's being drilled, how far into the round, and each answer so far. */
function CardHead({
  label,
  count,
  results,
  current,
}: {
  label: string;
  count: string;
  results: (boolean | null)[];
  current: number;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">{count}</span>
      </div>
      <StopProgress results={results} current={current} />
    </div>
  );
}

/**
 * Stands in for a drill until it can deal its first question: questions are
 * random, so they're dealt in the browser. The same card, so nothing jumps.
 */
export function DrillLoading({
  label,
  size,
  settingsRow = false,
}: {
  label: string;
  size: number;
  /** Hold the room the drill's settings row will take (pace, prefixes). */
  settingsRow?: boolean;
}) {
  return (
    <div className="glass min-w-0 rounded-3xl p-5 sm:p-8" aria-busy="true">
      <div className="grid gap-3">
        <CardHead label={label} count={`– / ${size}`} results={Array.from({ length: size }, () => null)} current={-1} />
        {settingsRow && <div className="min-h-7" />}
      </div>
      <div className="mt-6 grid min-h-56 place-items-center text-sm text-muted-foreground">Loading the drill…</div>
    </div>
  );
}

/**
 * A free drill's round, played on the path's own card: the same tiles, keys and
 * verdict as a stop on the path, with the round's answers along the top. The
 * drill decides what to ask (`deal`); the round decides when it's over, and
 * keeps every answer. Mount one per round (key it by the round number).
 */
export function DrillPlayer({
  rounds,
  label,
  deal,
  dealKey = "",
  pace = false,
  controls,
  explainMisses = false,
}: {
  rounds: DrillRounds;
  /** Eyebrow over the card, e.g. "Port numbers · round 1". */
  label: string;
  /** The next question: for the round's planned item, or any (null) where the drill picks. */
  deal: (item: string | null) => Dealt;
  /** Changes when the drill's settings change (a subnetting mode): the question on screen is dealt again. */
  dealKey?: string;
  /** Show the average time per answer, for drills played against the clock. */
  pace?: boolean;
  /** Settings shown under the progress bar, e.g. the subnetting difficulty. */
  controls?: ReactNode;
  /** After a miss, open the card's full explanation by itself (worked steps). */
  explainMisses?: boolean;
}) {
  const { record, advance, nextItem } = rounds;
  const turnId = useId();
  const root = useRef<HTMLDivElement>(null);
  const keyboard = useKeyboardTurn(turnId, root);

  // Handlers read these, not render state: a right answer moves on by timer.
  const dealRef = useRef(deal);
  const answered = useRef(false);
  const dealtAt = useRef(0);
  // `at`: where the card on screen sits in the round, from 0.
  const [card, setCard] = useState(() => ({ dealt: deal(nextItem()), n: 0, at: rounds.answered }));
  const [spent, setSpent] = useState({ ms: 0, answers: 0 });

  useEffect(() => {
    dealRef.current = deal;
  }, [deal]);

  // The first question's clock starts once it's on screen.
  useEffect(() => {
    dealtAt.current = Date.now();
  }, []);

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      if (answered.current) return;
      answered.current = true;
      record(card.dealt.item, answer.correct);
      const ms = Date.now() - dealtAt.current;
      setSpent((s) => ({ ms: s.ms + ms, answers: s.answers + 1 }));
    },
    [record, card.dealt.item]
  );

  const onNext = useCallback(() => {
    // The round's last answer hands over to its result; the drill shows it.
    if (advance()) return;
    answered.current = false;
    dealtAt.current = Date.now();
    setCard((c) => ({ dealt: dealRef.current(nextItem()), n: c.n + 1, at: c.at + 1 }));
  }, [advance, nextItem]);

  // New settings: a question not answered yet is dealt again in them; one
  // already answered has counted, so it moves on as "next" would.
  const lastKey = useRef(dealKey);
  useEffect(() => {
    if (lastKey.current === dealKey) return;
    lastKey.current = dealKey;
    if (answered.current) {
      onNext();
      return;
    }
    dealtAt.current = Date.now();
    setCard((c) => ({ dealt: dealRef.current(nextItem()), n: c.n + 1, at: c.at }));
  }, [dealKey, onNext, nextItem]);

  // A round saved before answers were kept has fewer results than answers:
  // those it kept are its latest, and the ones before show plain.
  const unknown = rounds.answered - rounds.results.length;
  const results = Array.from({ length: rounds.size }, (_, k) =>
    k >= unknown ? (rounds.results[k - unknown] ?? null) : null
  );
  const avg = spent.answers >= 3 ? Math.round(spent.ms / spent.answers / 1000) : null;
  const saved = rounds.linked && rounds.account === "saved";

  return (
    <div ref={root} className="glass min-w-0 rounded-3xl p-5 sm:p-8">
      <div className="mb-6 grid gap-3">
        <CardHead
          label={label}
          count={`${Math.min(card.at + 1, rounds.size)} / ${rounds.size}`}
          results={results}
          current={card.at}
        />
        {(pace || controls || saved) && (
          <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-2 font-mono text-xs text-muted-foreground">
            {saved ? (
              <span className="inline-flex items-center gap-1.5 text-success">
                <Check className="size-3.5" aria-hidden />
                Saved to your account
              </span>
            ) : pace ? (
              <span className="tabular-nums">{avg === null ? "Your pace shows after 3 answers" : `${avg}s an answer on average`}</span>
            ) : (
              <span />
            )}
            {controls}
          </div>
        )}
      </div>
      <RepCard
        key={card.n}
        rep={card.dealt.rep}
        onAnswer={onAnswer}
        onNext={onNext}
        promptAs="p"
        keyboard={keyboard}
        nextLabel={rounds.answered >= rounds.size ? "See my round" : undefined}
        explainMisses={explainMisses}
      />
    </div>
  );
}
