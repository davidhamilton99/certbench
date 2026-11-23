"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { X } from "lucide-react";
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
/** Answers in a session before the note about the rest of the exam appears. */
const REFRAME_AFTER = 20;

/**
 * The Recall page's working part: a row of tabs to choose what to drill (every
 * deck, Mixed, and the subnetting drill), a line that counts the facts last
 * answered correctly, and, after a real session, a note that recall is one part
 * of the exam with a link to the study plan. The choice lives here; RecallPlayer is
 * remounted for each choice (through `key`), so each starts a new session.
 *
 * The tabs are real tabs: one stop for the Tab key, the arrow keys move between
 * them, and the drill is the panel they control.
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
  const [typed, setTyped] = useState(false);

  // Load saved mastery after mount (localStorage is client-only, so the server
  // and the first client render both start empty and hydration never mismatches).
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

  // A typed answer is offered only for decks with short answers.
  const activeDeck = decks.find((d) => d.config.tableId === active);
  const canType = !!activeDeck?.typeable;
  const typedMode = typed && canType;

  const tabs: { key: string; label: string }[] = [
    ...decks.map((d) => ({ key: d.config.tableId, label: d.config.label })),
    ...(canMix ? [{ key: MIXED_DECK_KEY, label: "Mixed" }] : []),
    { key: SUBNETTING_KEY, label: "Subnetting" },
  ];

  const sessionAccuracy =
    session.answered > 0
      ? Math.round((session.correct / session.answered) * 100)
      : 0;
  const showReframe = session.answered >= REFRAME_AFTER && !reframeDismissed;

  return (
    <Tabs.Root value={active} onValueChange={setActive} className="grid gap-4">
      <Tabs.List aria-label="Drill" className="flex flex-wrap gap-1.5">
        {tabs.map((tab) => (
          <Tabs.Trigger
            key={tab.key}
            value={tab.key}
            className={cn(
              "rounded-md border border-input px-3.5 py-1.5 text-small font-medium transition-colors pointer-coarse:py-2.5",
              "hover:border-primary hover:bg-tint-hover",
              "data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            )}
          >
            {tab.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {total > 0 && <RecallMastery mastered={mastered} total={total} />}

      {canType && (
        <div role="group" aria-labelledby="recall-answer-with" className="flex flex-wrap items-center gap-2">
          <span id="recall-answer-with" className="cb-label text-muted-foreground">
            Answer with
          </span>
          <div className="flex gap-1.5">
            {([
              ["A choice of answers", false],
              ["A typed answer", true],
            ] as const).map(([label, val]) => (
              <button
                key={label}
                type="button"
                aria-pressed={typed === val}
                onClick={() => setTyped(val)}
                className={cn(
                  "rounded-md border px-3 py-1 font-medium transition-colors pointer-coarse:py-2.5",
                  typed === val
                    ? "border-primary bg-tint-selected text-foreground"
                    : "border-input text-muted-foreground hover:border-primary hover:bg-tint-hover"
                )}
              >
                {/* The size is set on the words themselves: the class merger takes the
                    type scale's sizes for colours and would drop it beside one. */}
                <span className="text-note">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The drill is the tabs' panel. It holds its own controls, so the panel
          itself is not a stop for the Tab key. */}
      <Tabs.Content value={active} tabIndex={-1}>
        {active === SUBNETTING_KEY ? (
          <SubnettingDrillLazy />
        ) : (
          <RecallPlayer
            key={`${active}:${typedMode}`}
            decks={decks}
            deckKey={active}
            typed={typedMode}
            onAnswer={handleAnswer}
          />
        )}
      </Tabs.Content>

      {showReframe && (
        <div className="glass relative grid gap-3 rounded-lg p-5 sm:p-6">
          <button
            type="button"
            onClick={() => setReframeDismissed(true)}
            aria-label="Dismiss this note"
            className="cb-tap absolute right-3 top-3 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X aria-hidden className="size-4" />
          </button>
          <div className="grid gap-1.5">
            <h2 className="pr-8 text-base font-semibold">Recall is one part of the exam.</h2>
            <p className="cb-measure text-small text-muted-foreground">
              You have answered {session.answered} recall questions in this session, {sessionAccuracy}% of them
              correctly. The exam also sets scenario questions and performance-based questions. Your study plan
              shows where you stand in every domain.
            </p>
          </div>
          <Button asChild className="justify-self-start">
            <Link href={`/dashboard?cert=${certSlug}`}>See your study plan</Link>
          </Button>
        </div>
      )}
    </Tabs.Root>
  );
}
