"use client";

import { useCallback, useMemo } from "react";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import { itemStatus } from "@/core/drill-rounds/drill-rounds";
import { recallToRep } from "@/lib/path/fact-reps";
import { useDrillRounds } from "./useDrillRounds";
import { DrillLoading, DrillPlayer, type Dealt } from "./DrillPlayer";
import { EXAMS, RoundComplete } from "./DrillRound";

const LABEL = "Acronyms";

/**
 * The acronym drill on the free tool page, played in rounds on the study
 * path's own question card, with its own recall questions: round 1 is free, a
 * free account continues with rounds built from the visitor's misses, and
 * every round ends on the Security+ study path.
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

  const deal = useCallback(
    (id: string | null): Dealt => {
      const item = id ?? ids[Math.floor(Math.random() * ids.length)];
      return { rep: recallToRep(deck, item, "", Math.random, false), item };
    },
    [deck, ids]
  );

  if (!rounds.ready) return <DrillLoading label={LABEL} size={rounds.size} />;

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
        label={LABEL}
        noun={["acronym", "acronyms"]}
        tiles={tiles}
        variant="dots"
        mapTitle="Your acronyms"
        lead={{
          title: "Acronyms are a small part of the exam.",
          body: "Most of the exam consists of scenarios. Your Security+ study path covers every objective in short sets of questions like this one, up to a readiness checkpoint that shows where you stand.",
          exams: [EXAMS.securityPlus],
        }}
      />
    );
  }

  return (
    <DrillPlayer
      key={rounds.roundNumber}
      rounds={rounds}
      label={`${LABEL}, round ${rounds.roundNumber}`}
      deal={deal}
    />
  );
}
