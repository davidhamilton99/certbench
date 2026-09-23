"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import type { PbqScenario } from "@/data/pbq/types";
import { PbqPlayer, type PbqUpsell } from "@/components/workspace/PbqPlayer";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<PbqScenario["type"], string> = {
  ordering: "Warm-up",
  "threat-hunt": "Core",
  matching: "Core",
  categorization: "Core",
  topology: "Exam-level",
  simulation: "Exam-level",
};

/**
 * The "try one" on-ramp for the public PBQ pages. Fixes the freeze: instead of
 * dropping the hardest simulation on a cold visitor, it leads with an
 * approachable warm-up and lets them pick their difficulty. The chosen
 * scenario plays inline, graded, with a convert-at-the-win CTA.
 */
export function PbqTryChooser({
  scenarios,
  upsell,
}: {
  scenarios: PbqScenario[];
  upsell: PbqUpsell;
}) {
  const [selected, setSelected] = useState(0);
  // Bumped to remount the player — on scenario switch and on "back"/retry.
  const [attempt, setAttempt] = useState(0);
  const active = scenarios[selected];
  if (!active) return null;

  function pick(i: number) {
    if (i === selected) return;
    setSelected(i);
    setAttempt((n) => n + 1);
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Pick one and work it right here — graded instantly, with the
        explanation. Start with the warm-up; the last one is a real exam-style
        simulation.
      </p>

      <div className="grid gap-2 sm:grid-cols-3">
        {scenarios.map((s, i) => {
          const isActive = i === selected;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={isActive}
              className={cn(
                "grid content-start gap-1 rounded-xl border p-3 text-left transition-colors",
                isActive
                  ? "border-primary bg-primary/5"
                  : "bg-card hover:border-muted-foreground/40"
              )}
            >
              <span className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                  {TIER_LABEL[s.type]}
                </span>
                {isActive && <Check className="size-3.5 text-primary" />}
              </span>
              <span className="text-sm font-medium leading-snug">{s.title}</span>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        <PbqPlayer
          key={`${active.id}-${attempt}`}
          scenario={active}
          onBack={() => setAttempt((n) => n + 1)}
          upsell={upsell}
        />
      </div>
    </div>
  );
}
