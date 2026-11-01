"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  PbqUpsellCard,
  type PbqUpsell,
} from "@/components/workspace/pbq-upsell";
import type {
  PbqScenario,
  PbqGradeResult,
  OrderingScenario,
  MatchingScenario,
  CategorizationScenario,
} from "@/data/pbq/types";
import { gradeScenario } from "@/core/pbq/grade";
import { SimulationPlayer } from "@/components/workspace/SimulationPlayer";
import { TopologyPlayer } from "@/components/workspace/TopologyPlayer";
import { ThreatHuntPlayer } from "@/components/workspace/ThreatHuntPlayer";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Deterministic string → 32-bit seed (FNV-1a), so a scenario shuffles the same every time. */
function seedFromString(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — a small, fast, deterministic PRNG. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle, seeded deterministically and guaranteed to differ from
 * the identity order. Deterministic on purpose: the same seed yields the same
 * order on the server and the client, so a shuffled list hydrates without a
 * mismatch. (A Math.random() shuffle differs between SSR and hydration, which
 * makes React throw away the server markup and re-render — a visible flash.)
 */
function shuffleSeeded(length: number, seed: number): number[] {
  const rand = mulberry32(seed);
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // If the shuffle happened to produce the identity (correct) order, swap the first two.
  const isIdentity = indices.every((v, i) => v === i);
  if (isIdentity && indices.length > 1) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }
  return indices;
}

/* ------------------------------------------------------------------ */
/*  Main Player                                                        */
/* ------------------------------------------------------------------ */

// Re-exported so existing importers of PbqPlayer keep resolving the type.
export type { PbqUpsell } from "@/components/workspace/pbq-upsell";

export function PbqPlayer({
  scenario,
  onBack,
  upsell,
}: {
  scenario: PbqScenario;
  onBack: () => void;
  /** Optional CTA rendered after grading (ordering/matching/categorization). */
  upsell?: PbqUpsell;
}) {
  const [result, setResult] = useState<PbqGradeResult | null>(null);
  const [, setUserAnswer] = useState<number[] | null>(null);
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleSubmit = useCallback(
    (answer: number[]) => {
      setUserAnswer(answer);
      setResult(gradeScenario(scenario, answer));
    },
    [scenario]
  );

  const handleRetry = useCallback(() => {
    setResult(null);
    setUserAnswer(null);
    setHasInteracted(false);
  }, []);

  const handleBack = useCallback(() => {
    if (hasInteracted && !result) {
      setShowBackConfirm(true);
    } else {
      onBack();
    }
  }, [hasInteracted, result, onBack]);

  /* Simulation scenarios use their own self-contained player */
  if (scenario.type === "simulation") {
    return <SimulationPlayer scenario={scenario} onBack={onBack} upsell={upsell} />;
  }

  /* Topology scenarios use the topology player */
  if (scenario.type === "topology") {
    return <TopologyPlayer scenario={scenario} onBack={onBack} upsell={upsell} />;
  }

  /* Threat hunts use the log-console player */
  if (scenario.type === "threat-hunt") {
    return <ThreatHuntPlayer scenario={scenario} onBack={onBack} upsell={upsell} />;
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back confirmation */}
      <ConfirmDialog
        open={showBackConfirm}
        title="Leave scenario?"
        message="Your progress will be lost. Are you sure you want to go back?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={onBack}
        onCancel={() => setShowBackConfirm(false)}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          aria-label="Back to scenarios"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
        </button>
        <div>
          <h2 className="text-[18px] font-semibold text-foreground">
            {scenario.title}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {scenario.domain_number} {scenario.domain_title}
          </p>
        </div>
      </div>

      {/* Description */}
      <Panel padding="md">
        <p className="text-[14px] text-foreground">{scenario.description}</p>
      </Panel>

      {/* Interactive area or results */}
      {result ? (
        <ResultView
          scenario={scenario}
          result={result}
          onRetry={handleRetry}
          onBack={onBack}
          upsell={upsell}
        />
      ) : (
        <>
          {scenario.type === "ordering" && (
            <OrderingPlayer
              scenario={scenario}
              onSubmit={handleSubmit}
              onInteract={() => setHasInteracted(true)}
            />
          )}
          {scenario.type === "matching" && (
            <MatchingPlayer
              scenario={scenario}
              onSubmit={handleSubmit}
              onInteract={() => setHasInteracted(true)}
            />
          )}
          {scenario.type === "categorization" && (
            <CategorizationPlayer
              scenario={scenario}
              onSubmit={handleSubmit}
              onInteract={() => setHasInteracted(true)}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Result View                                                        */
/* ------------------------------------------------------------------ */

function ResultView({
  scenario,
  result,
  onRetry,
  onBack,
  upsell,
}: {
  scenario: PbqScenario;
  result: PbqGradeResult;
  onRetry: () => void;
  onBack: () => void;
  upsell?: PbqUpsell;
}) {
  const scoreColor =
    result.score >= 75
      ? "text-success"
      : result.score >= 40
      ? "text-warning"
      : "text-danger";

  return (
    <div className="flex flex-col gap-4">
      {/* Score */}
      <Panel padding="lg">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[40px] font-mono font-semibold tabular-nums leading-none ${scoreColor}`}
            >
              {result.score}%
            </span>
            <span className="text-[14px] text-muted-foreground">
              {result.correctItems}/{result.totalItems} correct
            </span>
          </div>
          <Badge
            variant={
              result.score >= 75
                ? "success"
                : result.score >= 40
                ? "warning"
                : "danger"
            }
          >
            {result.score >= 75
              ? "Passed"
              : result.score >= 40
              ? "Partial Credit"
              : "Needs Work"}
          </Badge>
        </div>
      </Panel>

      {/* Incorrect items */}
      {result.feedback.length > 0 && (
        <Panel padding="md">
          <h3 className="text-[14px] font-semibold text-foreground mb-2">
            Corrections
          </h3>
          <div className="flex flex-col gap-1.5">
            {result.feedback.map((fb, i) => (
              <p key={i} className="text-[13px] text-muted-foreground">
                • {fb}
              </p>
            ))}
          </div>
        </Panel>
      )}

      {/* Explanation */}
      <Panel padding="md">
        <h3 className="text-[14px] font-semibold text-foreground mb-2">
          Explanation
        </h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          {scenario.explanation}
        </p>
      </Panel>

      {/* Convert at the win — surface the value right after a success */}
      {upsell && <PbqUpsellCard upsell={upsell} />}

      {/* Actions */}
      <div className="flex gap-3">
        <Button onClick={onRetry}>
          Try Again
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Back to Scenarios
        </Button>
      </div>
    </div>
  );
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

/* ------------------------------------------------------------------ */
/*  Matching Player                                                    */
/* ------------------------------------------------------------------ */

function MatchingPlayer({
  scenario,
  onSubmit,
  onInteract,
}: {
  scenario: MatchingScenario;
  onSubmit: (answer: number[]) => void;
  onInteract: () => void;
}) {
  const [selections, setSelections] = useState<number[]>(
    () => new Array(scenario.left.length).fill(-1)
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Shuffle right column display order — deterministic per scenario so the
  // server and client render the same order (no hydration mismatch).
  const [shuffledRight] = useState<number[]>(() =>
    shuffleSeeded(scenario.right.length, seedFromString(scenario.id + ":match"))
  );

  // Track which right-side options are already used
  const usedRightIndices = new Set(selections.filter((s) => s !== -1));

  const updateSelection = (leftIdx: number, rightIdx: number) => {
    const next = [...selections];
    next[leftIdx] = rightIdx;
    setSelections(next);
    onInteract();
  };

  const allSelected = selections.every((s) => s !== -1);

  return (
    <div className="flex flex-col gap-4">
      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit answer?"
        message="Once submitted, your answer will be graded and you cannot change it."
        confirmLabel="Submit"
        cancelLabel="Review"
        onConfirm={() => {
          setShowSubmitConfirm(false);
          onSubmit(selections);
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <p className="text-[13px] text-muted-foreground">
        Select the correct match for each item on the left.
      </p>

      <div className="flex flex-col gap-2">
        {scenario.left.map((leftItem, leftIdx) => (
          <div
            key={leftIdx}
            className="bg-card border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-mono font-medium text-foreground min-w-[80px]">
                {leftItem}
              </span>
              <svg
                className="w-4 h-4 text-muted-foreground flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
              <select
                value={selections[leftIdx]}
                onChange={(e) =>
                  updateSelection(leftIdx, parseInt(e.target.value))
                }
                className="flex-1 bg-muted/40 border border-border rounded-md px-3 py-2 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value={-1}>— Select match —</option>
                {shuffledRight.map((rightIdx) => {
                  const isUsedByOther =
                    usedRightIndices.has(rightIdx) &&
                    selections[leftIdx] !== rightIdx;
                  return (
                    <option
                      key={rightIdx}
                      value={rightIdx}
                      disabled={isUsedByOther}
                    >
                      {scenario.right[rightIdx]}
                      {isUsedByOther ? " (used)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        ))}
      </div>

      <Button
       
        onClick={() => setShowSubmitConfirm(true)}
        disabled={!allSelected}
      >
        Submit Answer
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Categorization Player                                              */
/* ------------------------------------------------------------------ */

function CategorizationPlayer({
  scenario,
  onSubmit,
  onInteract,
}: {
  scenario: CategorizationScenario;
  onSubmit: (answer: number[]) => void;
  onInteract: () => void;
}) {
  const [placements, setPlacements] = useState<number[]>(
    () => new Array(scenario.items.length).fill(-1)
  );
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Shuffled item display order — deterministic per scenario so the server and
  // client render the same order (no hydration mismatch).
  const [shuffledItems] = useState<number[]>(() =>
    shuffleSeeded(scenario.items.length, seedFromString(scenario.id + ":cat"))
  );

  const placeItem = (itemIdx: number, categoryIdx: number) => {
    const next = [...placements];
    next[itemIdx] = categoryIdx;
    setPlacements(next);
    onInteract();
  };

  const allPlaced = placements.every((p) => p !== -1);

  // Dynamic grid columns based on category count
  const gridCols =
    scenario.categories.length === 2
      ? "sm:grid-cols-2"
      : scenario.categories.length === 4
      ? "sm:grid-cols-2 lg:grid-cols-4"
      : "sm:grid-cols-3";

  return (
    <div className="flex flex-col gap-4">
      <ConfirmDialog
        open={showSubmitConfirm}
        title="Submit answer?"
        message="Once submitted, your answer will be graded and you cannot change it."
        confirmLabel="Submit"
        cancelLabel="Review"
        onConfirm={() => {
          setShowSubmitConfirm(false);
          onSubmit(placements);
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <p className="text-[13px] text-muted-foreground">
        Assign each item to the correct category.
      </p>

      {/* Items with category selectors */}
      <div className="flex flex-col gap-2">
        {shuffledItems.map((itemIdx) => {
          const item = scenario.items[itemIdx];
          return (
            <div
              key={itemIdx}
              className="bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-foreground">
                  {item.text}
                </span>
                <div className="flex gap-1">
                  {scenario.categories.map((cat, catIdx) => {
                    const isSelected = placements[itemIdx] === catIdx;
                    return (
                      <button
                        key={catIdx}
                        onClick={() => placeItem(itemIdx, catIdx)}
                        className={`
                          px-2.5 py-1 rounded-md text-[12px] font-medium
                          transition-colors duration-150 whitespace-nowrap
                          ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-muted/40 border border-border-light text-muted-foreground hover:border-primary/40 hover:text-foreground"
                          }
                        `}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary of placements */}
      <div className={`grid grid-cols-1 ${gridCols} gap-2`}>
        {scenario.categories.map((cat, catIdx) => {
          const placedItems = scenario.items.filter(
            (_, i) => placements[i] === catIdx
          );
          return (
            <Panel key={catIdx} padding="sm">
              <span className="text-[12px] font-semibold text-foreground uppercase tracking-wider">
                {cat}
              </span>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {placedItems.length === 0 ? (
                  <span className="text-[12px] text-muted-foreground italic">
                    No items placed
                  </span>
                ) : (
                  placedItems.map((item, i) => (
                    <span key={i} className="text-[12px] text-muted-foreground">
                      • {item.text}
                    </span>
                  ))
                )}
              </div>
            </Panel>
          );
        })}
      </div>

      <Button
       
        onClick={() => setShowSubmitConfirm(true)}
        disabled={!allPlaced}
      >
        Submit Answer
      </Button>
    </div>
  );
}