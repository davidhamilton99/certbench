"use client";

import { useMemo } from "react";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import { RecallPlayer } from "@/components/recall/RecallPlayer";
import { useDrillRounds } from "./useDrillRounds";
import { EXAMS, ExamBridge, RoundBar, RoundComplete, RoundStatus } from "./DrillRound";

/**
 * Public acronym drill for the free tool page, played in rounds: round 1 is
 * free, a free account keeps going with rounds built from the visitor's
 * misses. Wraps the shared RecallPlayer, which this drives item by item.
 */
export function AcronymDrill({ deck }: { deck: ResolvedDeck }) {
  // One tile per acronym (the deck's cue column), with its first expansion.
  const items = useMemo(() => {
    const byId = new Map<string, string>();
    for (const row of deck.rows) {
      const id = row[deck.config.ask.key];
      if (id && !byId.has(id)) byId.set(id, row[deck.config.answer.key] ?? "");
    }
    return [...byId].map(([id, name]) => ({ id, name }));
  }, [deck]);
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const rounds = useDrillRounds({ tool: "acronyms", ids });

  if (!rounds.ready) {
    return (
      <div className="grid min-h-72 place-items-center rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
      </div>
    );
  }

  if (rounds.complete) {
    const tiles = items.map((i) => ({
      id: i.id,
      label: i.id,
      name: i.name,
      status: itemStatus(rounds.progress.items[i.id]),
    }));
    return (
      <RoundComplete
        rounds={rounds}
        noun={["acronym", "acronyms"]}
        tiles={tiles}
        variant="dots"
        extra={
          <ExamBridge
            tool="acronyms"
            title="Acronyms are the part anyone can max out."
            exams={[EXAMS.securityPlus]}
          >
            The exam is decided by the scenarios and PBQs most people
            underestimate. See where you stand on them in about 3 minutes.
          </ExamBridge>
        }
      />
    );
  }

  return (
    <div className="grid gap-3">
      <RoundBar rounds={rounds} />
      <RecallPlayer
        decks={[deck]}
        deckKey={deck.config.tableId}
        nextItem={rounds.nextItem}
        beforeAdvance={rounds.advance}
        status={<RoundStatus rounds={rounds} />}
        nextLabel={rounds.answered >= rounds.size ? "See your round" : undefined}
        onAnswer={(_tableId, itemId, ok) => rounds.record(itemId, ok)}
      />
    </div>
  );
}
