"use client";

import { useCallback, useState } from "react";
import { MODES, pickGauntletMode, type Difficulty, type DrillMode } from "@/lib/tools/subnetting";
import { skillStatus, weakestSkill } from "@/core/drill-rounds/drill-rounds";
import { subnetToRep } from "@/lib/path/fact-reps";
import { cn } from "@/lib/utils";
import { useDrillRounds, type DrillRounds } from "./useDrillRounds";
import { DrillLoading, DrillPlayer, type Dealt } from "./DrillPlayer";
import { EXAMS, RoundComplete } from "./DrillRound";

type PickerMode = DrillMode | "gauntlet";

const PICKER: { id: PickerMode; label: string }[] = [
  ...MODES.map((m) => ({ id: m.id as PickerMode, label: m.label })),
  { id: "gauntlet", label: "Gauntlet" },
];

const SKILL_IDS = MODES.map((m) => m.id);
const labelOf = (id: string) => MODES.find((m) => m.id === id)?.label ?? id;
const LABEL = "Subnetting";

/** The modes, one row that scrolls sideways on a phone rather than stacking above the drill. */
function ModePicker({
  mode,
  onPick,
  disabled = false,
}: {
  mode: PickerMode;
  onPick?: (mode: PickerMode) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label="Drill mode"
      className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {PICKER.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          disabled={disabled}
          onClick={() => onPick?.(m.id)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60",
            mode === m.id
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card/60 text-muted-foreground hover:border-primary/50 hover:text-foreground"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

/** Standard keeps the math in the last octet (/24 to /30); the wider range runs /8 to /30. */
function DifficultyToggle({ value, onChange }: { value: Difficulty; onChange: (d: Difficulty) => void }) {
  return (
    <span className="flex items-center gap-2">
      <span id="subnet-prefixes">Prefixes</span>
      <span role="group" aria-labelledby="subnet-prefixes" className="flex overflow-hidden rounded-md border">
        {(["standard", "any-prefix"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={cn(
              "px-2 py-1 transition-colors",
              value === d ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-foreground"
            )}
          >
            {d === "standard" ? "/24–/30" : "/8–/30"}
          </button>
        ))}
      </span>
    </span>
  );
}

/**
 * The subnetting drill on the free tool page, played in rounds on the path's
 * own card with the path's own subnetting reps: pick a mode, answer against
 * the clock, and misses show the worked steps. Round 1 is free; a free
 * account keeps going, each round opening on the visitor's weakest skill, and
 * every round ends on their exam's path.
 */
export function SubnettingPractice() {
  const rounds = useDrillRounds({ tool: "subnetting", ids: SKILL_IDS });

  if (!rounds.ready) {
    return (
      <div className="grid min-w-0 gap-3">
        <ModePicker mode="network-id" disabled />
        <DrillLoading label={LABEL} size={rounds.size} settingsRow />
      </div>
    );
  }

  const items = rounds.progress.items;
  const weakest = weakestSkill(SKILL_IDS, items);

  if (rounds.complete) {
    const tiles = MODES.map((m) => {
      const r = items[m.id];
      return {
        id: m.id,
        label: m.label,
        status: skillStatus(r),
        detail: r ? `${r.c} / ${r.a} right` : undefined,
      };
    });
    const w = weakest ? items[weakest] : undefined;
    return (
      <RoundComplete
        rounds={rounds}
        label={LABEL}
        noun={["skill", "skills"]}
        tiles={tiles}
        variant="skills"
        mapTitle="Your subnetting skills"
        subline={
          weakest
            ? `Round ${rounds.roundNumber + 1} opens on ${labelOf(weakest)}${
                w ? `: ${w.c} of ${w.a} right so far.` : ", which you haven't tried yet."
              }`
            : undefined
        }
        lead={{
          title: "Subnetting is one skill in one domain.",
          body: "The exam is decided by scenarios across every domain. Your path walks every objective in short rounds like this one, up to a readiness checkpoint that shows where you stand.",
          exams: [EXAMS.networkPlus, EXAMS.aPlusCore1],
        }}
      />
    );
  }

  // Later rounds open on the weakest skill.
  return (
    <SubnettingRound
      key={rounds.roundNumber}
      rounds={rounds}
      initialMode={rounds.progress.rounds > 0 && weakest ? (weakest as DrillMode) : "network-id"}
    />
  );
}

function SubnettingRound({ rounds, initialMode }: { rounds: DrillRounds; initialMode: PickerMode }) {
  const [mode, setMode] = useState<PickerMode>(initialMode);
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");

  const deal = useCallback((): Dealt => {
    const skill = mode === "gauntlet" ? pickGauntletMode() : mode;
    // The card names the skill: in the gauntlet it changes every question.
    return { rep: { ...subnetToRep("", skill, Math.random, difficulty), label: labelOf(skill) }, item: skill };
  }, [mode, difficulty]);

  return (
    <div className="grid min-w-0 gap-3">
      <ModePicker mode={mode} onPick={setMode} />
      <DrillPlayer
        rounds={rounds}
        label={`${LABEL} · round ${rounds.roundNumber}`}
        deal={deal}
        dealKey={`${mode}|${difficulty}`}
        pace
        explainMisses
        controls={<DifficultyToggle value={difficulty} onChange={setDifficulty} />}
      />
    </div>
  );
}
