"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PbqUpsell } from "@/components/workspace/pbq-upsell";
import type {
  PbqScenario,
  PbqGradeResult,
  OrderingScenario,
  MatchingScenario,
  CategorizationScenario,
  SimZonePlacementField,
} from "@/data/pbq/types";
import { gradeScenario } from "@/core/pbq/grade";
import { seedFromString, shuffleSeeded } from "@/core/pbq/shuffle";
import { SimulationPlayer } from "@/components/workspace/SimulationPlayer";
import { TopologyPlayer } from "@/components/workspace/TopologyPlayer";
import { ThreatHuntPlayer } from "@/components/workspace/ThreatHuntPlayer";
import { MatchMove, SimMove } from "@/components/workspace/SimMoves";
import { LabHeader, LabResult, PairList, useKeepInView, useLabTurn } from "@/components/workspace/LabKit";
import type { PbqHostProps } from "@/components/workspace/pbq-host";
import { cn } from "@/lib/utils";

// Re-exported so existing importers of PbqPlayer keep resolving the type.
export type { PbqUpsell } from "@/components/workspace/pbq-upsell";

type OneMoveLab = OrderingScenario | MatchingScenario | CategorizationScenario;

/** What "7 of 9" counts, by lab. */
const UNIT: Record<OneMoveLab["type"], string> = {
  ordering: "in the right place",
  matching: "matched right",
  categorization: "sorted right",
};

/** A sorting lab is the sort move: each item, one at a time, into its bin. */
function sortField(s: CategorizationScenario): SimZonePlacementField {
  return {
    type: "zone-placement",
    id: s.id,
    label: s.description,
    items: s.items.map((i) => i.text),
    zones: s.categories,
    correctZones: s.items.map((i) => i.category),
  };
}

/**
 * Any PBQ lab. Simulations, topologies and threat hunts have players of their
 * own; the rest are one move each, played the way the simulations' moves are:
 * an ordering is tapped into place, a matching lab pairs one item at a time,
 * a sorting lab drops one item at a time into its bin. Every lab ends on the
 * same score screen.
 */
export function PbqPlayer({
  scenario,
  onBack,
  upsell,
  onGraded,
  backLabel,
}: {
  scenario: PbqScenario;
  onBack: () => void;
  /** Optional CTA rendered after grading. */
  upsell?: PbqUpsell;
} & PbqHostProps) {
  const { root, keyboard } = useLabTurn();
  const [run, setRun] = useState(0);
  const [graded, setGraded] = useState<{ result: PbqGradeResult; answer: number[] } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  // A move's final answer, graded when the player moves on from its last mark.
  const pending = useRef<number[] | null>(null);

  const handleSubmit = useCallback(
    (answer: number[]) => {
      const result = gradeScenario(scenario, answer);
      setGraded({ result, answer });
      onGraded?.(result);
    },
    [scenario, onGraded]
  );

  const finish = useCallback(() => {
    if (pending.current) handleSubmit(pending.current);
  }, [handleSubmit]);

  const started = useCallback(() => setHasInteracted(true), []);

  const handleRetry = useCallback(() => {
    pending.current = null;
    setGraded(null);
    setHasInteracted(false);
    setRun((r) => r + 1);
  }, []);

  const handleBack = useCallback(() => {
    if (hasInteracted && !graded) setShowBackConfirm(true);
    else onBack();
  }, [hasInteracted, graded, onBack]);

  // The score from its top, and a replay from the start.
  useKeepInView(`${run}:${Boolean(graded)}`, () => root.current);

  const host = { onGraded, backLabel };
  if (scenario.type === "simulation") {
    return <SimulationPlayer scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
  }
  if (scenario.type === "topology") {
    return <TopologyPlayer scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
  }
  if (scenario.type === "threat-hunt") {
    return <ThreatHuntPlayer scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
  }

  return (
    <div ref={root} className="flex min-w-0 scroll-mt-24 flex-col gap-4 sm:gap-5">
      <ConfirmDialog
        open={showBackConfirm}
        title="Leave this lab?"
        message="Your answers so far won't be kept."
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={onBack}
        onCancel={() => setShowBackConfirm(false)}
      />
      <LabHeader
        title={scenario.title}
        subtitle={`${scenario.domain_number} ${scenario.domain_title}`}
        onBack={handleBack}
        backLabel={backLabel}
      />

      {graded ? (
        <LabResult
          result={graded.result}
          unit={UNIT[scenario.type]}
          missCount={graded.result.totalItems - graded.result.correctItems}
          misses={<Misses scenario={scenario} answer={graded.answer} />}
          explanation={scenario.explanation}
          upsell={upsell}
          backLabel={backLabel}
          onRetry={handleRetry}
          onBack={onBack}
        />
      ) : scenario.type === "ordering" ? (
        <div className="grid gap-4">
          <p className="text-balance text-[17px] font-medium leading-relaxed">{scenario.description}</p>
          <OrderingPlayer key={run} scenario={scenario} onSubmit={handleSubmit} onInteract={started} />
        </div>
      ) : scenario.type === "matching" ? (
        <MatchMove
          key={run}
          prompt={scenario.description}
          left={scenario.left}
          right={scenario.right}
          correctMap={scenario.correct_map}
          seed={scenario.id}
          keyboard={keyboard}
          takeFocus={run > 0}
          onStep={started}
          onAnswer={(map) => {
            pending.current = map;
          }}
          onNext={finish}
        />
      ) : (
        <SimMove
          key={run}
          field={sortField(scenario)}
          keyboard={keyboard}
          takeFocus={run > 0}
          onStep={started}
          onAnswer={(answer) => {
            if (answer.type === "zone-placement") pending.current = answer.placements;
          }}
          onNext={finish}
        />
      )}
    </div>
  );
}

/** What a one-move lab's misses should have been. */
function Misses({ scenario, answer }: { scenario: OneMoveLab; answer: number[] }) {
  switch (scenario.type) {
    case "ordering":
      // The right order, each place marked by whether it was put there.
      return (
        <ol className="mt-1 grid gap-1.5">
          {scenario.correct_order.map((item, i) => {
            const ok = answer[i] === item;
            return (
              <li key={i} className="flex items-baseline gap-2.5">
                <span className="w-5 shrink-0 text-right font-mono text-xs text-muted-foreground">{i + 1}.</span>
                <span className={cn("min-w-0 flex-1", ok ? "text-foreground" : "font-medium text-success")}>
                  {scenario.items[item]}
                </span>
                {ok ? (
                  <Check className="size-3.5 shrink-0 translate-y-0.5 text-success" strokeWidth={3} aria-label="placed right" />
                ) : (
                  <X className="size-3.5 shrink-0 translate-y-0.5 text-destructive" strokeWidth={3} aria-label="was out of place" />
                )}
              </li>
            );
          })}
        </ol>
      );
    case "matching":
      return (
        <PairList
          pairs={scenario.left
            .map((l, i) => [l, scenario.right[scenario.correct_map[i]]] as const)
            .filter((_, i) => answer[i] !== scenario.correct_map[i])}
        />
      );
    case "categorization":
      return (
        <PairList
          pairs={scenario.items
            .map((it) => [it.text, scenario.categories[it.category]] as const)
            .filter((_, i) => answer[i] !== scenario.items[i].category)}
        />
      );
  }
}

/* ------------------------------------------------------------------ */
/*  Ordering Player                                                    */
/* ------------------------------------------------------------------ */

/**
 * Tap the items in order: each tap fills the next numbered row, and tapping a
 * placed row sends it back. A placed item leaves its outline in the pool, so
 * the remaining choices never shift under a finger. (Sorting seven items with
 * up/down arrows took a dozen clicks, and replays showed people giving up.)
 */
function OrderingPlayer({
  scenario,
  onSubmit,
  onInteract,
}: {
  scenario: OrderingScenario;
  onSubmit: (answer: number[]) => void;
  onInteract: () => void;
}) {
  // The pool is shuffled — deterministic per scenario so SSR and client agree.
  const pool = useMemo(
    () => shuffleSeeded(scenario.items.length, seedFromString(scenario.id + ":order")),
    [scenario.id, scenario.items.length]
  );
  const [placed, setPlaced] = useState<number[]>([]);
  const chips = useRef(new Map<number, HTMLButtonElement>());
  const total = scenario.items.length;
  const done = placed.length === total;

  const place = (itemIdx: number) => {
    if (placed.includes(itemIdx)) return;
    const next = [...placed, itemIdx];
    setPlaced(next);
    onInteract();
    // Keep keyboard focus in the pool, on the next choice still to place.
    const from = pool.indexOf(itemIdx);
    const following = [...pool.slice(from + 1), ...pool.slice(0, from)].find((i) => !next.includes(i));
    if (following !== undefined) requestAnimationFrame(() => chips.current.get(following)?.focus());
  };

  const takeBack = (itemIdx: number) => setPlaced(placed.filter((i) => i !== itemIdx));

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-muted-foreground">
        {done
          ? "All placed. Tap a row to take it back out, or check your order."
          : "Tap them in order, first to last."}
      </p>

      <ol className="flex flex-col gap-1.5" aria-label="Your order">
        {Array.from({ length: total }, (_, pos) => {
          const itemIdx = placed[pos];
          if (itemIdx === undefined) {
            const isNext = pos === placed.length;
            return (
              <li
                key={`slot-${pos}`}
                className={`flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 ${
                  isNext ? "border-primary/60 bg-primary/5" : "border-border"
                }`}
              >
                <span className="text-[13px] font-mono text-muted-foreground tabular-nums w-6">
                  {pos + 1}.
                </span>
                {isNext && (
                  <span className="text-[13px] text-muted-foreground">
                    {pos === 0 ? "Tap the first one below" : "Tap the next one below"}
                  </span>
                )}
              </li>
            );
          }
          return (
            <li key={`item-${itemIdx}`}>
              <button
                type="button"
                onClick={() => takeBack(itemIdx)}
                aria-label={`${pos + 1}. ${scenario.items[itemIdx]}. Tap to take it back out.`}
                className="group flex w-full items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:border-foreground/30"
              >
                <span className="text-[13px] font-mono text-muted-foreground tabular-nums w-6">
                  {pos + 1}.
                </span>
                <span className="flex-1 text-[14px] text-foreground">{scenario.items[itemIdx]}</span>
                <svg
                  className="w-4 h-4 text-muted-foreground group-hover:text-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Choices to place">
        {pool.map((itemIdx) =>
          placed.includes(itemIdx) ? (
            <span
              key={itemIdx}
              aria-hidden
              className="select-none rounded-lg border border-dashed border-border px-3 py-2 text-[14px] text-transparent"
            >
              {scenario.items[itemIdx]}
            </span>
          ) : (
            <button
              key={itemIdx}
              type="button"
              ref={(el) => {
                if (el) chips.current.set(itemIdx, el);
                else chips.current.delete(itemIdx);
              }}
              onClick={() => place(itemIdx)}
              className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-[14px] text-foreground transition-colors hover:border-primary hover:bg-primary/10"
            >
              {scenario.items[itemIdx]}
            </button>
          )
        )}
      </div>

      <Button onClick={() => onSubmit(placed)} disabled={!done}>
        Check my order
      </Button>
    </div>
  );
}
