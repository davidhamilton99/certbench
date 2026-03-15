"use client";

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type {
  PbqScenario,
  PbqGradeResult,
  OrderingScenario,
  MatchingScenario,
  CategorizationScenario,
  TopologyScenario,
} from "@/data/pbq/types";
import { gradeScenario } from "@/lib/pbq/grade";
import { SimulationPlayer } from "@/components/workspace/SimulationPlayer";
import { TopologyPlayer } from "@/components/workspace/TopologyPlayer";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Fisher-Yates shuffle that guarantees the result differs from the input order. */
function shuffleGuaranteed(length: number): number[] {
  const indices = Array.from({ length }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  // If the shuffle accidentally produced the identity (correct) order, swap the first two
  const isIdentity = indices.every((v, i) => v === i);
  if (isIdentity && indices.length > 1) {
    [indices[0], indices[1]] = [indices[1], indices[0]];
  }
  return indices;
}

/* ------------------------------------------------------------------ */
/*  Main Player                                                        */
/* ------------------------------------------------------------------ */

export function PbqPlayer({
  scenario,
  onBack,
}: {
  scenario: PbqScenario;
  onBack: () => void;
}) {
  const [result, setResult] = useState<PbqGradeResult | null>(null);
  const [userAnswer, setUserAnswer] = useState<number[] | null>(null);
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
    return <SimulationPlayer scenario={scenario} onBack={onBack} />;
  }

  /* Topology scenarios use the topology player */
  if (scenario.type === "topology") {
    return <TopologyPlayer scenario={scenario} onBack={onBack} />;
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
          className="text-text-secondary hover:text-text-primary transition-colors"
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
          <h2 className="text-[18px] font-semibold text-text-primary">
            {scenario.title}
          </h2>
          <p className="text-[13px] text-text-secondary">
            {scenario.domain_number} {scenario.domain_title}
          </p>
        </div>
      </div>

      {/* Description */}
      <Card padding="md">
        <p className="text-[14px] text-text-primary">{scenario.description}</p>
      </Card>

      {/* Interactive area or results */}
      {result ? (
        <ResultView
          scenario={scenario}
          result={result}
          onRetry={handleRetry}
          onBack={onBack}
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
}: {
  scenario: PbqScenario;
  result: PbqGradeResult;
  onRetry: () => void;
  onBack: () => void;
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
      <Card padding="lg">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-3">
            <span
              className={`text-[40px] font-mono font-semibold tabular-nums leading-none ${scoreColor}`}
            >
              {result.score}%
            </span>
            <span className="text-[14px] text-text-muted">
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
      </Card>

      {/* Incorrect items */}
      {result.feedback.length > 0 && (
        <Card padding="md">
          <h3 className="text-[14px] font-semibold text-text-primary mb-2">
            Corrections
          </h3>
          <div className="flex flex-col gap-1.5">
            {result.feedback.map((fb, i) => (
              <p key={i} className="text-[13px] text-text-secondary">
                • {fb}
              </p>
            ))}
          </div>
        </Card>
      )}

      {/* Explanation */}
      <Card padding="md">
        <h3 className="text-[14px] font-semibold text-text-primary mb-2">
          Explanation
        </h3>
        <p className="text-[13px] text-text-secondary leading-relaxed">
          {scenario.explanation}
        </p>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="primary" onClick={onRetry}>
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

function OrderingPlayer({
  scenario,
  onSubmit,
  onInteract,
}: {
  scenario: OrderingScenario;
  onSubmit: (answer: number[]) => void;
  onInteract: () => void;
}) {
  // Shuffle — guaranteed to differ from identity order
  const initialOrder = useMemo(
    () => shuffleGuaranteed(scenario.items.length),
    [scenario.items.length]
  );

  const [order, setOrder] = useState<number[]>(initialOrder);
  const [hasMoved, setHasMoved] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const moveUp = (pos: number) => {
    if (pos === 0) return;
    const next = [...order];
    [next[pos - 1], next[pos]] = [next[pos], next[pos - 1]];
    setOrder(next);
    setHasMoved(true);
    onInteract();
  };

  const moveDown = (pos: number) => {
    if (pos === order.length - 1) return;
    const next = [...order];
    [next[pos], next[pos + 1]] = [next[pos + 1], next[pos]];
    setOrder(next);
    setHasMoved(true);
    onInteract();
  };

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
          onSubmit(order);
        }}
        onCancel={() => setShowSubmitConfirm(false)}
      />

      <p className="text-[13px] text-text-muted">
        Use the arrows to arrange items in the correct order.
      </p>

      <div className="flex flex-col gap-1.5">
        {order.map((itemIdx, pos) => (
          <div
            key={itemIdx}
            className="flex items-center gap-2 bg-bg-surface border border-border rounded-lg px-4 py-3"
          >
            <span className="text-[13px] font-mono text-text-muted tabular-nums w-6">
              {pos + 1}.
            </span>
            <span className="text-[14px] text-text-primary flex-1">
              {scenario.items[itemIdx]}
            </span>
            <div className="flex flex-col gap-0.5">
              <button
                onClick={() => moveUp(pos)}
                disabled={pos === 0}
                className="p-1 text-text-muted hover:text-text-primary disabled:opacity-25 disabled:cursor-default transition-colors"
                aria-label="Move up"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 15.75l7.5-7.5 7.5 7.5"
                  />
                </svg>
              </button>
              <button
                onClick={() => moveDown(pos)}
                disabled={pos === order.length - 1}
                className="p-1 text-text-muted hover:text-text-primary disabled:opacity-25 disabled:cursor-default transition-colors"
                aria-label="Move down"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="primary"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={!hasMoved}
      >
        Submit Answer
      </Button>
      {!hasMoved && (
        <p className="text-[12px] text-text-muted text-center">
          Rearrange at least one item before submitting.
        </p>
      )}
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

  // Shuffle right column display order
  const shuffledRight = useMemo(() => {
    const indices = scenario.right.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [scenario.right]);

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

      <p className="text-[13px] text-text-muted">
        Select the correct match for each item on the left.
      </p>

      <div className="flex flex-col gap-2">
        {scenario.left.map((leftItem, leftIdx) => (
          <div
            key={leftIdx}
            className="bg-bg-surface border border-border rounded-lg p-4"
          >
            <div className="flex items-center gap-4">
              <span className="text-[14px] font-mono font-medium text-text-primary min-w-[80px]">
                {leftItem}
              </span>
              <svg
                className="w-4 h-4 text-text-muted flex-shrink-0"
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
                className="flex-1 bg-bg-page border border-border rounded-md px-3 py-2 text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
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
        variant="primary"
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

  // Shuffled item display order
  const shuffledItems = useMemo(() => {
    const indices = scenario.items.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [scenario.items]);

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

      <p className="text-[13px] text-text-muted">
        Assign each item to the correct category.
      </p>

      {/* Items with category selectors */}
      <div className="flex flex-col gap-2">
        {shuffledItems.map((itemIdx) => {
          const item = scenario.items[itemIdx];
          return (
            <div
              key={itemIdx}
              className="bg-bg-surface border border-border rounded-lg p-3"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[14px] text-text-primary">
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
                              : "bg-bg-page border border-border-light text-text-secondary hover:border-primary/40 hover:text-text-primary"
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
            <Card key={catIdx} padding="sm">
              <span className="text-[12px] font-semibold text-text-primary uppercase tracking-wider">
                {cat}
              </span>
              <div className="mt-1.5 flex flex-col gap-0.5">
                {placedItems.length === 0 ? (
                  <span className="text-[12px] text-text-muted italic">
                    No items placed
                  </span>
                ) : (
                  placedItems.map((item, i) => (
                    <span key={i} className="text-[12px] text-text-secondary">
                      • {item.text}
                    </span>
                  ))
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <Button
        variant="primary"
        onClick={() => setShowSubmitConfirm(true)}
        disabled={!allPlaced}
      >
        Submit Answer
      </Button>
    </div>
  );
}
