"use client";

import { useState } from "react";
import { Network, Shuffle } from "lucide-react";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import { SubnettingDrillLazy } from "@/components/marketing/SubnettingDrillLazy";
import { RecallPlayer, MIXED_DECK_KEY } from "./RecallPlayer";
import { cn } from "@/lib/utils";

const SUBNETTING_KEY = "__subnetting__";

/**
 * The Recall hub: one row of pills to pick what to drill — every deck (one per
 * reference table), Mixed across all of them, and the Subnetting skill drill.
 * Owns the selection so there's a single control surface; RecallPlayer is
 * remounted per selection (via `key`) for a clean session. `initialDeckKey`
 * (a deck's table id) lets a "Drill this" link from Reference land on a deck.
 */
export function RecallSurface({
  decks,
  initialDeckKey,
}: {
  decks: ResolvedDeck[];
  initialDeckKey?: string;
}) {
  const validInitial =
    initialDeckKey &&
    (initialDeckKey === SUBNETTING_KEY ||
      initialDeckKey === MIXED_DECK_KEY ||
      decks.some((d) => d.config.tableId === initialDeckKey))
      ? initialDeckKey
      : decks[0]?.config.tableId ?? SUBNETTING_KEY;

  const [active, setActive] = useState<string>(validInitial);
  const canMix = decks.length > 1;

  const pills: { key: string; label: string; icon?: typeof Shuffle }[] = [
    ...decks.map((d) => ({ key: d.config.tableId, label: d.config.label })),
    ...(canMix ? [{ key: MIXED_DECK_KEY, label: "Mixed", icon: Shuffle }] : []),
    { key: SUBNETTING_KEY, label: "Subnetting", icon: Network },
  ];

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Drill">
        {pills.map((p) => (
          <button
            key={p.key}
            type="button"
            role="tab"
            aria-selected={active === p.key}
            onClick={() => setActive(p.key)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              active === p.key
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-muted-foreground/40"
            )}
          >
            {p.icon && <p.icon className="size-3.5" />}
            {p.label}
          </button>
        ))}
      </div>

      {active === SUBNETTING_KEY ? (
        <SubnettingDrillLazy showRegisterCta={false} />
      ) : (
        <RecallPlayer key={active} decks={decks} deckKey={active} />
      )}
    </div>
  );
}
