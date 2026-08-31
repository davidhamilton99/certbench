"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Network, Shuffle, X } from "lucide-react";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import {
  applyMastery,
  masteryTotals,
  readMastery,
  writeMastery,
  type MasteryMap,
} from "@/lib/recall/mastery";
import { SubnettingDrillLazy } from "@/components/marketing/SubnettingDrillLazy";
import { Button } from "@/components/ui/button";
import { RecallPlayer, MIXED_DECK_KEY } from "./RecallPlayer";
import { RecallMastery } from "./RecallMastery";
import { cn } from "@/lib/utils";

const SUBNETTING_KEY = "__subnetting__";
/** Answers in a session before the "see your readiness" reframe appears. */
const REFRAME_AFTER = 20;

/**
 * The Recall hub: a row of pills to pick what to drill (every deck, Mixed, and
 * the Subnetting skill drill), a mastery meter that fills as you get facts
 * right, and — after a real session — a reframe that routes you from "recall
 * is handled" into the diagnostic, which is what actually converts. Selection
 * lives here so there's one control surface; RecallPlayer is remounted per
 * selection (via `key`) for a clean session.
 */
export function RecallSurface({
  decks,
  certSlug,
  initialDeckKey,
}: {
  decks: ResolvedDeck[];
  certSlug: string;
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
  const [mastery, setMastery] = useState<MasteryMap>({});
  const [session, setSession] = useState({ answered: 0, correct: 0 });
  const [reframeDismissed, setReframeDismissed] = useState(false);

  // Load saved mastery after mount (localStorage is client-only, so SSR and
  // the first client render both start empty — no hydration mismatch).
  useEffect(() => {
    setMastery(readMastery(certSlug));
  }, [certSlug]);

  const canMix = decks.length > 1;

  function handleAnswer(tableId: string, itemId: string, correct: boolean) {
    setSession((s) => ({
      answered: s.answered + 1,
      correct: s.correct + (correct ? 1 : 0),
    }));
    setMastery((prev) => {
      const next = applyMastery(prev, tableId, itemId, correct);
      writeMastery(certSlug, next);
      return next;
    });
  }

  const { mastered, total } = masteryTotals(
    decks.map((d) => ({ tableId: d.config.tableId, itemCount: d.itemCount })),
    mastery
  );

  const pills: { key: string; label: string; icon?: typeof Shuffle }[] = [
    ...decks.map((d) => ({ key: d.config.tableId, label: d.config.label })),
    ...(canMix ? [{ key: MIXED_DECK_KEY, label: "Mixed", icon: Shuffle }] : []),
    { key: SUBNETTING_KEY, label: "Subnetting", icon: Network },
  ];

  const sessionAccuracy =
    session.answered > 0
      ? Math.round((session.correct / session.answered) * 100)
      : 0;
  const showReframe = session.answered >= REFRAME_AFTER && !reframeDismissed;

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

      {total > 0 && <RecallMastery mastered={mastered} total={total} />}

      {active === SUBNETTING_KEY ? (
        <SubnettingDrillLazy showRegisterCta={false} />
      ) : (
        <RecallPlayer
          key={active}
          decks={decks}
          deckKey={active}
          onAnswer={handleAnswer}
        />
      )}

      {showReframe && (
        <div className="relative grid gap-3 rounded-xl border border-primary/30 bg-card p-6">
          <button
            type="button"
            onClick={() => setReframeDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div>
            <h3 className="pr-6 font-semibold tracking-tight">
              Recall&apos;s the easy part — and you&apos;re on it
              {session.answered > 0 ? ` (${session.answered} drilled at ${sessionAccuracy}%)` : ""}.
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              These are the facts anyone can memorize to 100%. The exam is won on
              the scenarios and PBQs — the part most people underestimate. See
              exactly where you stand across every domain:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href={`/dashboard?cert=${certSlug}`}>
                See my readiness
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
