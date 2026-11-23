"use client";

import { useRef, useState } from "react";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import { recallToRep } from "@/lib/path/fact-reps";
import type { Rep } from "@/core/path/types";
import { RepCard } from "@/components/path/RepCard";
import { useInBrowser } from "./useInBrowser";

/** Sentinel deck key: draw each question from a random deck. */
export const MIXED_DECK_KEY = "__mixed__";
/** How often a fact that was answered incorrectly is asked again in place of a new one. */
const RESURFACE_RATE = 0.3;

/** One fact from one deck: what to ask, and where its result is recorded. */
interface Fact {
  deck: ResolvedDeck;
  itemId: string;
}

interface Turn extends Fact {
  /** The place of this question in the session, from 0. */
  n: number;
  rep: Rep;
}

interface RecallPlayerProps {
  decks: ResolvedDeck[];
  deckKey: string;
  /** Ask for a typed answer in place of a choice (for decks with short answers). */
  typed?: boolean;
  onAnswer?: (tableId: string, itemId: string, correct: boolean) => void;
}

/**
 * The Recall drill for one selection: a single deck (by its table id) or MIXED
 * across all of them. The parent owns the selection and remounts this (through
 * `key`) to start a new session, so the state here is one session's.
 *
 * Each fact is asked on the study path's own question card (RepCard), so a
 * port or an acronym looks and answers here as it does on the path: the
 * verdict in a sentence, then "Continue". Nothing moves by itself; a correct
 * answer waits for Continue as an incorrect one does. The number keys answer
 * only while the keyboard's focus is inside the card. A fact that is answered
 * incorrectly is asked again later in the session.
 *
 * The questions are drawn at random, so the session is drawn in the browser
 * only: the server's HTML, and the first pass over it in the browser, hold a
 * placeholder of the same shape, and hydration never mismatches.
 */
export function RecallPlayer(props: RecallPlayerProps) {
  if (!useInBrowser()) {
    return (
      <div className="grid gap-3">
        <p className="text-note text-muted-foreground">&nbsp;</p>
        <div role="status" className="glass grid min-h-72 content-start rounded-lg p-5 text-small text-muted-foreground sm:p-8">
          The drill is loading.
        </div>
      </div>
    );
  }
  return <RecallSession {...props} />;
}

/** A fact from the chosen deck, or for Mixed from a deck chosen at random. */
function freshFact(decks: ResolvedDeck[], deckKey: string): Fact {
  const deck =
    deckKey === MIXED_DECK_KEY
      ? decks[Math.floor(Math.random() * decks.length)]
      : (decks.find((d) => d.config.tableId === deckKey) ?? decks[0]);
  const row = deck.rows[Math.floor(Math.random() * deck.rows.length)];
  return { deck, itemId: row[deck.config.ask.key] };
}

/**
 * The question that asks a fact. A typed answer is always asked in the deck's
 * own direction (the port for a protocol), so nobody is asked to type a long
 * name. A cue with more than one row (RADIUS) gets its sentence about the
 * other correct answer from recallToRep, as it does on the study path.
 */
function turnFor(fact: Fact, n: number, typed: boolean): Turn {
  const rep = recallToRep(fact.deck, fact.itemId, "recall", Math.random, typed);
  return { n, ...fact, rep };
}

/** One session of the drill, in the browser. Its first question is drawn as it first appears. */
function RecallSession({ decks, deckKey, typed = false, onAnswer }: RecallPlayerProps) {
  // Facts answered incorrectly, to be asked again later in the session. The
  // first question cannot be one of them: none has been answered yet.
  const missed = useRef<Fact[]>([]);
  const [turn, setTurn] = useState<Turn>(() => turnFor(freshFact(decks, deckKey), 0, typed));
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  function draw(n: number): Turn {
    let fact: Fact | undefined;
    if (missed.current.length > 0 && Math.random() < RESURFACE_RATE) fact = missed.current.shift();
    return turnFor(fact ?? freshFact(decks, deckKey), n, typed);
  }

  return (
    <div className="grid gap-3">
      <p className="text-note text-muted-foreground">
        {score.answered > 0 ? (
          <>
            {score.correct} of {score.answered} correct
          </>
        ) : (
          // The line is always kept, so the card does not move after the first answer.
          <>&nbsp;</>
        )}
      </p>
      <div className="glass min-h-72 rounded-lg p-5 sm:p-8">
        <RepCard
          key={turn.n}
          rep={turn.rep}
          // The first question of a session arrives with the page or with a press
          // on a deck's tab, which keeps the focus; every later one takes it.
          takeFocus={turn.n > 0}
          onAnswer={({ correct }) => {
            setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), answered: s.answered + 1 }));
            if (!correct) missed.current.push({ deck: turn.deck, itemId: turn.itemId });
            onAnswer?.(turn.deck.config.tableId, turn.itemId, correct);
          }}
          onNext={() => setTurn(draw(turn.n + 1))}
        />
      </div>
    </div>
  );
}
