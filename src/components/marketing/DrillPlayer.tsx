"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import type { Rep } from "@/core/path/types";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import { cn } from "@/lib/utils";
import type { DrillRounds } from "./useDrillRounds";

/** One question of a drill: the card to show, and the item its answer counts for. */
export interface Dealt {
  rep: Rep;
  /** A port, an acronym, a subnetting skill: what the round records the answer against. */
  item: string;
}

/**
 * What a drill's first question looks like, so that the card that stands in
 * while the drill loads is the same height: four answers to choose from, or a
 * field to type in.
 */
export type DrillShape = "choices" | "typed";

/**
 * The height of the question area for each shape before any question has been
 * measured: a prompt, its answers and the foot that holds the verdict. It is
 * the least the area may be, so the loading card and the first question agree.
 *
 * For four answers it is the height measured in a browser for the tallest
 * ordinary case (port numbers set in mono, and a verdict of three lines), so
 * the card is the same height before and after an answer and nothing under it
 * moves. A typed question keeps its own height: after an incorrect answer its
 * worked steps open under it, which lengthens the card once, in answer to that
 * press, and the card then stays that height for the round.
 */
const BODY_HEIGHT: Record<DrillShape, string> = {
  choices: "min-h-[31.25rem] sm:min-h-[27.5rem] lg:min-h-[26.25rem]",
  typed: "min-h-[19rem] sm:min-h-[16rem] lg:min-h-[11.5rem]",
};

/** What to do with the question, said at the foot of the card until it is answered. */
const REST_NOTE = {
  choice: "Choose an answer. It is marked at once.",
  typed: "Type your answer and press Enter. It is marked at once.",
} as const;

/** The card's top lines: what is being practiced, how far into the round, and each answer so far. */
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
        <p className="cb-label min-w-0 text-muted-foreground">{label}</p>
        <span className="shrink-0 text-small text-muted-foreground">{count}</span>
      </div>
      <StopProgress results={results} current={current} />
    </div>
  );
}

/**
 * Stands in for a drill until it can deal its first question: questions are
 * random, so they are dealt in the browser. It is the same card at the same
 * height, so the page does not move when the first question arrives.
 */
export function DrillLoading({
  label,
  size,
  settingsRow = false,
  shape = "choices",
}: {
  label: string;
  size: number;
  /** Hold the room the drill's settings row will take (pace, prefixes). */
  settingsRow?: boolean;
  shape?: DrillShape;
}) {
  return (
    <div className="glass min-w-0 rounded-lg p-5 sm:p-8" aria-busy="true">
      <div className="mb-6 grid gap-3">
        <CardHead label={label} count={`Question 1 of ${size}`} results={Array.from({ length: size }, () => null)} current={-1} />
        {settingsRow && <div className="min-h-7" />}
      </div>
      <div className={cn("grid place-items-center", BODY_HEIGHT[shape])}>
        <p role="status" className="text-small text-muted-foreground">
          The drill is loading.
        </p>
      </div>
    </div>
  );
}

/**
 * Keeps a box at least as tall as the tallest it has been. A drill's questions
 * and verdicts are not all one height: without this the card would grow for a
 * verdict and shrink for the next question, and everything under it on the
 * page would move each time. The height is forgotten when the box changes
 * width (a phone turned on its side), where it no longer means anything, and
 * with the component, which is mounted once for each round.
 */
function useSteadyHeight() {
  const ref = useRef<HTMLDivElement>(null);
  const [minHeight, setMinHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let width = el.offsetWidth;
    const observer = new ResizeObserver(() => {
      if (el.offsetWidth !== width) {
        width = el.offsetWidth;
        setMinHeight(undefined);
        return;
      }
      const height = el.offsetHeight;
      setMinHeight((kept) => (kept === undefined || height > kept ? height : kept));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, minHeight };
}

/**
 * A free drill's round, played on the study path's own question card: the same
 * answers, keys and verdict as a step of the study path, with the round's
 * answers along the top. The drill decides what to ask (`deal`); the round
 * decides when it is over, and keeps every answer. Mount one for each round
 * (key it by the round number).
 *
 * The card keeps one height through the round. The verdict has its own room at
 * the foot of the card, and the card never shrinks back for a shorter
 * question, so nothing under it moves while the round is played.
 */
export function DrillPlayer({
  rounds,
  label,
  deal,
  dealKey = "",
  pace = false,
  controls,
  explainMisses = false,
  shape = "choices",
}: {
  rounds: DrillRounds;
  /** The line over the card, for example "Port numbers, round 1". */
  label: string;
  /** The next question: for the round's planned item, or any (null) where the drill chooses. */
  deal: (item: string | null) => Dealt;
  /** Changes when the drill's settings change (a subnetting mode): the question on screen is dealt again. */
  dealKey?: string;
  /** Show the average time per answer, for drills played against the clock. */
  pace?: boolean;
  /** Settings shown under the progress bar, for example the subnetting prefixes. */
  controls?: ReactNode;
  /** After a miss, open the card's full explanation by itself (worked steps). */
  explainMisses?: boolean;
  /** What most of the drill's questions look like, which sets the least height of the card. */
  shape?: DrillShape;
}) {
  const { record, advance, nextItem } = rounds;
  // Taken apart here: the height is state, and only the ref is a ref.
  const { ref: bodyRef, minHeight } = useSteadyHeight();

  // Handlers read these, not render state: an answer and the move to the next
  // question can land in one tick.
  const dealRef = useRef(deal);
  const answered = useRef(false);
  const dealtAt = useRef(0);
  // `at`: where the card on screen sits in the round, from 0.
  const [card, setCard] = useState(() => ({ dealt: deal(nextItem()), n: 0, at: rounds.answered }));
  const [spent, setSpent] = useState({ ms: 0, answers: 0 });

  useEffect(() => {
    dealRef.current = deal;
  }, [deal]);

  // The first question's clock starts once it is on screen.
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
  // already answered has counted, so it moves on as "Continue" would.
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
  const rep = card.dealt.rep;

  return (
    <div className="glass min-w-0 rounded-lg p-5 sm:p-8">
      <div className="mb-6 grid gap-3">
        <CardHead
          label={label}
          count={`Question ${Math.min(card.at + 1, rounds.size)} of ${rounds.size}`}
          results={results}
          current={card.at}
        />
        {(pace || controls || saved) && (
          <div className="flex min-h-7 flex-wrap items-center justify-between gap-x-4 gap-y-2 text-note text-muted-foreground">
            {saved ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" aria-hidden />
                Your progress is saved to your account.
              </span>
            ) : pace ? (
              <span>{avg === null ? "Your pace is shown after three answers." : `Your average is ${avg} seconds per answer.`}</span>
            ) : (
              <span />
            )}
            {controls}
          </div>
        )}
      </div>
      {/* One cell of a grid, so the card inside fills it and its foot stays at the bottom. */}
      <div
        ref={bodyRef}
        style={minHeight === undefined ? undefined : { minHeight }}
        className={cn("grid grid-cols-[minmax(0,1fr)]", BODY_HEIGHT[shape])}
      >
        <RepCard
          key={card.n}
          rep={rep}
          onAnswer={onAnswer}
          onNext={onNext}
          promptAs="p"
          layout="sheet"
          restNote={REST_NOTE[rep.type]}
          // The first question of a page as it loads takes no focus. Every
          // question after it follows something the person did here: an
          // answer, a new setting, or starting the round.
          takeFocus={card.n > 0 || rounds.startedHere}
          nextLabel={rounds.answered >= rounds.size ? "View my result" : undefined}
          explainMisses={explainMisses}
        />
      </div>
    </div>
  );
}
