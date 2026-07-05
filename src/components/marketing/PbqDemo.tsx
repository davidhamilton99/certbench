"use client";

import { useState } from "react";
import type { PbqScenario } from "@/data/pbq/types";
import { PbqPlayer } from "@/components/workspace/PbqPlayer";

/**
 * Public, no-signup PBQ scenario embed for the SEO example pages. Grading
 * is the same pure client-side core grader the app uses; "back" just
 * resets the scenario.
 */
export function PbqDemo({ scenario }: { scenario: PbqScenario }) {
  // Remount the player to reset all of its internal state.
  const [attempt, setAttempt] = useState(0);

  return (
    <div className="rounded-xl border bg-card p-4 sm:p-6">
      <PbqPlayer
        key={attempt}
        scenario={scenario}
        onBack={() => setAttempt((n) => n + 1)}
      />
    </div>
  );
}
