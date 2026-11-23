"use client";

import { useCallback, useState } from "react";
import { MODES, pickGauntletMode, type Difficulty, type DrillMode } from "@/lib/tools/subnetting";
import { MIXED_MODE_NAME, modeName } from "@/lib/tools/subnet-mode-names";
import { skillStatus, weakestSkill } from "@/core/drill-rounds/drill-rounds";
import { subnetToRep } from "@/lib/path/fact-reps";
import { useDrillRounds, type DrillRounds } from "./useDrillRounds";
import { DrillLoading, DrillPlayer, type Dealt } from "./DrillPlayer";
import { EXAMS, RoundComplete } from "./DrillRound";

/** "gauntlet" is the mixed mode's id in code; a visitor reads "Mixed". */
type PickerMode = DrillMode | "gauntlet";

const PICKER: { id: PickerMode; label: string }[] = [
  ...MODES.map((m) => ({ id: m.id as PickerMode, label: modeName(m.id) })),
  { id: "gauntlet", label: MIXED_MODE_NAME },
];

const SKILL_IDS = MODES.map((m) => m.id);
const labelOf = modeName;
const LABEL = "Subnetting";

// The class lists below are joined as plain strings: each pair is one or the
// other, so there is nothing in them for the class merger to resolve.
const MODE = "shrink-0 rounded-md border px-3.5 py-1.5 text-small font-medium transition-colors disabled:opacity-60 pointer-coarse:min-h-11";
const MODE_CHOSEN = "border-primary bg-primary text-primary-foreground";
const MODE_IDLE = "border-input bg-card text-muted-foreground hover:border-primary hover:text-foreground";

// A row inside a clipped box: the focus ring is drawn inside it.
const RANGE = "px-2 py-1 font-mono text-note transition-colors focus-visible:-outline-offset-2 pointer-coarse:min-h-11 pointer-coarse:px-3";
const RANGE_CHOSEN = "bg-primary text-primary-foreground";
const RANGE_IDLE = "hover:bg-tint-hover hover:text-foreground";

/**
 * The modes. On a phone they are one row that scrolls sideways under a
 * finger, so they do not stack above the drill. From the `sm` width, where a
 * hidden row could only be reached by scrolling sideways with a mouse, they
 * wrap onto a second line and every mode is in view.
 */
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
      className="-mx-1 flex min-w-0 gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
    >
      {PICKER.map((m) => (
        <button
          key={m.id}
          type="button"
          aria-pressed={mode === m.id}
          disabled={disabled}
          onClick={() => onPick?.(m.id)}
          className={`${MODE} ${mode === m.id ? MODE_CHOSEN : MODE_IDLE}`}
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
      <span role="group" aria-labelledby="subnet-prefixes" className="flex overflow-hidden rounded-md border border-input">
        {(["standard", "any-prefix"] as const).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={value === d}
            onClick={() => onChange(d)}
            className={`${RANGE} ${value === d ? RANGE_CHOSEN : RANGE_IDLE}`}
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
        <DrillLoading label={LABEL} size={rounds.size} settingsRow shape="typed" />
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
        label: modeName(m.id),
        status: skillStatus(r),
        detail: r ? `${r.c} of ${r.a} correct` : undefined,
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
            ? `Round ${rounds.roundNumber + 1} begins with ${labelOf(weakest)}${
                w ? `, where you have answered ${w.c} of ${w.a} correctly so far.` : ", which you have not tried yet."
              }`
            : undefined
        }
        lead={{
          title: "Subnetting is one skill in one domain.",
          body: "The exam is decided by scenarios from every domain. Your study path covers every objective in short sets of questions like this one, up to a readiness checkpoint that shows where you stand.",
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
    // The card names the skill: in the mixed mode it changes with every question.
    return { rep: { ...subnetToRep("", skill, Math.random, difficulty), label: labelOf(skill) }, item: skill };
  }, [mode, difficulty]);

  return (
    <div className="grid min-w-0 gap-3">
      <ModePicker mode={mode} onPick={setMode} />
      <DrillPlayer
        rounds={rounds}
        label={`${LABEL}, round ${rounds.roundNumber}`}
        deal={deal}
        dealKey={`${mode}|${difficulty}`}
        pace
        explainMisses
        shape="typed"
        controls={<DifficultyToggle value={difficulty} onChange={setDifficulty} />}
      />
    </div>
  );
}
