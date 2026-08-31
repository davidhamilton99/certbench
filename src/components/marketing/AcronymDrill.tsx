"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import type { ResolvedDeck } from "@/lib/recall/recall-deck";
import { RecallPlayer } from "@/components/recall/RecallPlayer";
import { Button } from "@/components/ui/button";

/**
 * Public acronym drill for the free tool page. Wraps the shared RecallPlayer
 * and, after a real session, surfaces a perspective reframe that routes to the
 * no-account readiness check — the funnel that actually converts a grinder
 * (mirrors the port-quiz reframe).
 */
export function AcronymDrill({ deck }: { deck: ResolvedDeck }) {
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const showReframe = answered >= 15 && !dismissed;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  return (
    <div className="grid gap-4">
      <RecallPlayer
        decks={[deck]}
        deckKey={deck.config.tableId}
        onAnswer={(_tableId, _itemId, ok) => {
          setAnswered((n) => n + 1);
          if (ok) setCorrect((n) => n + 1);
        }}
      />

      {showReframe && (
        <div className="relative grid gap-3 rounded-xl border border-primary/30 bg-card p-6">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <div>
            <h3 className="pr-6 font-semibold tracking-tight">
              {answered} acronyms drilled at {accuracy}% — nice work.
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Acronyms are pure recall — the part anyone can max out. The exam is
              decided by the scenarios and PBQs most people underestimate. See
              exactly where you stand:
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button asChild>
              <Link href="/readiness-check/security-plus-sy0-701">
                Take the free readiness check
                <ArrowRight />
              </Link>
            </Button>
            <span className="text-xs text-muted-foreground">
              3 minutes, no account · or{" "}
              <Link
                href="/register"
                className="text-primary underline underline-offset-4"
              >
                start free
              </Link>{" "}
              for the full drill + 2,600 questions with spaced repetition.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
