"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { MatchMove, SimMove } from "@/components/workspace/SimMoves";
import { LabHeader, LabResult, PairList, useKeepInView, useStarted } from "@/components/workspace/LabKit";
import { LARGE_PLAYERS, type PbqHostProps } from "@/components/workspace/pbq-host";
import { domainLabel } from "@/components/path/lab-types";
import { domainName } from "@/lib/seo/objective-meta";
import { cn } from "@/lib/utils";

// Re-exported so existing importers of PbqPlayer keep resolving the type.
export type { PbqUpsell } from "@/components/workspace/pbq-upsell";

/** What stands in a large player's place for the moment it takes to arrive. */
function LabLoading() {
  return (
    <p role="status" className="grid min-h-60 place-items-center text-small text-muted-foreground">
      The lab is loading.
    </p>
  );
}

// The three large players are fetched when a lab of their kind is opened, not
// with the page: the first lab a visitor meets is usually a drill, which needs
// none of them. A page that lists labs can start the fetch early, when a lab's
// row is hovered or takes the focus (`preloadLab` in pbq-host): both go through
// the same loaders, so the early fetch is the one the lab then waits for.
const SimulationPlayer = dynamic(() => LARGE_PLAYERS.simulation().then((m) => m.SimulationPlayer), {
  loading: LabLoading,
});
const TopologyPlayer = dynamic(() => LARGE_PLAYERS.topology().then((m) => m.TopologyPlayer), {
  loading: LabLoading,
});
const ThreatHuntPlayer = dynamic(() => LARGE_PLAYERS["threat-hunt"]().then((m) => m.ThreatHuntPlayer), {
  loading: LabLoading,
});

type OneMoveScenario = OrderingScenario | MatchingScenario | CategorizationScenario;

/** What a one-move lab's score counts, as the sentence under the score. */
const SUMMARY: Record<OneMoveScenario["type"], (correct: number, total: number) => string> = {
  ordering: (correct, total) => `You placed ${correct} of ${total} items in the correct position.`,
  matching: (correct, total) => `You matched ${correct} of ${total} items correctly.`,
  categorization: (correct, total) => `You sorted ${correct} of ${total} items correctly.`,
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
 * own, each loaded when a lab of its kind is opened; the rest are one move
 * each, played the way the simulations' moves are: an ordering is selected
 * into place, a matching lab pairs one item at a time, a sorting lab drops one
 * item at a time into its bin. Every lab ends on the same score screen.
 */
export function PbqPlayer({
  scenario,
  onBack,
  upsell,
  ...host
}: {
  scenario: PbqScenario;
  onBack: () => void;
  /** Optional CTA rendered after grading. */
  upsell?: PbqUpsell;
} & PbqHostProps) {
  switch (scenario.type) {
    case "simulation":
      return <SimulationPlayer scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
    case "topology":
      return <TopologyPlayer scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
    case "threat-hunt":
      return <ThreatHuntPlayer scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
    default:
      return <OneMoveLab scenario={scenario} onBack={onBack} upsell={upsell} {...host} />;
  }
}

/** An ordering, matching or sorting lab: one move, then the score. */
function OneMoveLab({
  scenario,
  onBack,
  upsell,
  onGraded,
  backLabel,
  onStarted,
  takeFocus,
  confirmLeave = true,
}: {
  scenario: OneMoveScenario;
  onBack: () => void;
  upsell?: PbqUpsell;
} & PbqHostProps) {
  const root = useRef<HTMLDivElement>(null);
  const [run, setRun] = useState(0);
  const [graded, setGraded] = useState<{ result: PbqGradeResult; answer: number[] } | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  // A move's final answer, graded when the player moves on from its last mark.
  const pending = useRef<number[] | null>(null);
  const tellStarted = useStarted(onStarted);

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

  // The first thing done in the lab: leaving now asks first, and the host is told once.
  const started = useCallback(() => {
    setHasInteracted(true);
    tellStarted();
  }, [tellStarted]);

  const handleRetry = useCallback(() => {
    pending.current = null;
    setGraded(null);
    setHasInteracted(false);
    setRun((r) => r + 1);
  }, []);

  const handleBack = useCallback(() => {
    if (confirmLeave && hasInteracted && !graded) setShowBackConfirm(true);
    else onBack();
  }, [confirmLeave, hasInteracted, graded, onBack]);

  // The question closes before the lab is left: a host that keeps the lab on
  // its page would otherwise leave it open, with the focus held inside it.
  const leave = useCallback(() => {
    setShowBackConfirm(false);
    onBack();
  }, [onBack]);

  // The score from its top, and a replay from the start.
  useKeepInView(`${run}:${Boolean(graded)}`, () => root.current);

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <ConfirmDialog
        open={showBackConfirm}
        title="Do you want to leave this lab?"
        message="Your answers so far will not be kept."
        confirmLabel="Leave the lab"
        cancelLabel="Stay in the lab"
        onConfirm={leave}
        onCancel={() => setShowBackConfirm(false)}
      />
      <LabHeader
        title={scenario.title}
        subtitle={`Domain ${domainLabel(scenario.domain_number)}: ${domainName(scenario.domain_title)}`}
        onBack={handleBack}
        backLabel={backLabel}
        takeFocus={takeFocus}
      />

      {graded ? (
        <LabResult
          result={graded.result}
          summary={SUMMARY[scenario.type](graded.result.correctItems, graded.result.totalItems)}
          missCount={graded.result.totalItems - graded.result.correctItems}
          misses={<Misses scenario={scenario} answer={graded.answer} />}
          explanation={scenario.explanation}
          upsell={upsell}
          backLabel={backLabel}
          onRetry={handleRetry}
          onBack={onBack}
        />
      ) : scenario.type === "ordering" ? (
        <OrderingPlayer key={run} scenario={scenario} takeFocus={run > 0} onSubmit={handleSubmit} onInteract={started} />
      ) : scenario.type === "matching" ? (
        <MatchMove
          key={run}
          prompt={scenario.description}
          left={scenario.left}
          right={scenario.right}
          correctMap={scenario.correct_map}
          seed={scenario.id}
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
function Misses({ scenario, answer }: { scenario: OneMoveScenario; answer: number[] }) {
  switch (scenario.type) {
    case "ordering":
      // The right order, each place marked by whether it was put there.
      return (
        <ol className="mt-1 grid gap-1.5">
          {scenario.correct_order.map((item, i) => {
            const ok = answer[i] === item;
            return (
              <li key={i} className="flex items-baseline gap-2.5">
                <span className="w-5 shrink-0 text-right text-note tabular-nums text-muted-foreground">{i + 1}.</span>
                <span className={cn("min-w-0 flex-1", ok ? "text-foreground" : "font-medium text-success")}>
                  {scenario.items[item]}
                </span>
                {/* Each mark is an image with a name, so it is read as part of its row. */}
                {ok ? (
                  <Check
                    role="img"
                    aria-label="placed correctly"
                    className="size-3.5 shrink-0 translate-y-0.5 text-success"
                    strokeWidth={3}
                  />
                ) : (
                  <X
                    role="img"
                    aria-label="was in the wrong position"
                    className="size-3.5 shrink-0 translate-y-0.5 text-destructive"
                    strokeWidth={3}
                  />
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
 * Choose the items in order: each press fills the next numbered row, and a
 * press on a placed row sends it back. A placed item leaves its outline in the
 * pool, so the remaining choices never shift under a finger. (Sorting seven
 * items with up and down arrows took a dozen clicks, and replays showed people
 * giving up.)
 *
 * The keyboard's focus follows the work: to the next choice still to place,
 * to the button that checks the order once every item is placed, and back to
 * a choice when its row is removed. It never falls back to the top of the page.
 */
function OrderingPlayer({
  scenario,
  takeFocus,
  onSubmit,
  onInteract,
}: {
  scenario: OrderingScenario;
  /** Take the keyboard's focus on arrival: true when the lab is being repeated. */
  takeFocus: boolean;
  onSubmit: (answer: number[]) => void;
  onInteract: () => void;
}) {
  // The pool is shuffled the same way on the server and in the browser, by the lab's id.
  const pool = useMemo(
    () => shuffleSeeded(scenario.items.length, seedFromString(scenario.id + ":order")),
    [scenario.id, scenario.items.length]
  );
  const [placed, setPlaced] = useState<number[]>([]);
  const chips = useRef(new Map<number, HTMLButtonElement>());
  const ask = useRef<HTMLParagraphElement>(null);
  const check = useRef<HTMLButtonElement>(null);
  const hintId = useId();
  const total = scenario.items.length;
  const done = placed.length === total;

  useEffect(() => {
    if (takeFocus) ask.current?.focus({ preventScroll: true });
  }, [takeFocus]);

  const place = (itemIdx: number) => {
    if (placed.includes(itemIdx)) return;
    const next = [...placed, itemIdx];
    setPlaced(next);
    onInteract();
    // On to the next choice still to place, or to the check once none is left.
    const from = pool.indexOf(itemIdx);
    const following = [...pool.slice(from + 1), ...pool.slice(0, from)].find((i) => !next.includes(i));
    requestAnimationFrame(() => (following === undefined ? check.current : chips.current.get(following))?.focus());
  };

  const takeBack = (itemIdx: number) => {
    setPlaced(placed.filter((i) => i !== itemIdx));
    // The item is a choice again, and the focus goes back to it.
    requestAnimationFrame(() => chips.current.get(itemIdx)?.focus());
  };

  return (
    <div className="grid gap-4">
      {/* Takes the focus when the lab is repeated, so that it is read; it is not a control. */}
      <p ref={ask} tabIndex={-1} className="text-body font-medium">
        {scenario.description}
      </p>
      <p id={hintId} className="text-note text-muted-foreground">
        {done
          ? "Every item is placed. Choose a row to remove it, or check your order."
          : "Choose the items in order, from first to last."}
      </p>

      <ol className="grid gap-1.5" aria-label="Your order">
        {Array.from({ length: total }, (_, pos) => {
          const itemIdx = placed[pos];
          if (itemIdx === undefined) {
            const isNext = pos === placed.length;
            return (
              <li
                key={`slot-${pos}`}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md border border-dashed px-3.5 py-2",
                  // Under a contrast theme the tint is gone and every edge is one colour: the
                  // row the next press fills keeps its mark in the theme's highlight colour.
                  isNext ? "border-primary bg-tint-selected forced-colors:border-[color:Highlight]" : "border-border"
                )}
              >
                <span className="w-6 shrink-0 text-note tabular-nums text-muted-foreground">{pos + 1}.</span>
                {isNext && (
                  <span className="text-note text-muted-foreground">
                    {pos === 0 ? "Choose the first item below." : "Choose the next item below."}
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
                aria-label={`${pos + 1}. ${scenario.items[itemIdx]}. Choose this row to remove it.`}
                className="group flex min-h-11 w-full items-center gap-2 rounded-md border border-input bg-card px-3.5 py-2 text-left transition-[border-color,background-color] duration-100 hover:border-primary hover:bg-tint-hover active:bg-tint-press"
              >
                <span className="w-6 shrink-0 text-note tabular-nums text-muted-foreground">{pos + 1}.</span>
                <span className="min-w-0 flex-1 text-small">{scenario.items[itemIdx]}</span>
                <X aria-hidden className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Choices to place">
        {pool.map((itemIdx) =>
          placed.includes(itemIdx) ? (
            // The outline a placed choice leaves behind: the same size, nothing to read.
            <span
              key={itemIdx}
              aria-hidden
              className="inline-flex min-h-11 select-none items-center rounded-md border border-dashed border-border px-3.5 py-2 text-small text-transparent"
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
              className="inline-flex min-h-11 items-center rounded-md border border-input bg-card px-3.5 py-2 text-left text-small transition-[border-color,background-color] duration-100 hover:border-primary hover:bg-tint-hover active:bg-tint-press"
            >
              {scenario.items[itemIdx]}
            </button>
          )
        )}
      </div>

      <Button
        ref={check}
        size="lg"
        // The line above says why the button cannot be pressed yet, and what it does.
        aria-describedby={hintId}
        className="w-full sm:w-auto sm:justify-self-start"
        onClick={() => onSubmit(placed)}
        disabled={!done}
      >
        Check my order
      </Button>
    </div>
  );
}
