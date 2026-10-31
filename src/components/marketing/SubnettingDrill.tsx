"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Flame, X } from "lucide-react";
import {
  generateQuestion,
  grade,
  MODES,
  pickGauntletMode,
  type Difficulty,
  type DrillMode,
  type DrillQuestion,
} from "@/lib/tools/subnetting";
import { skillStatus, weakestSkill } from "@/core/drill-rounds/drill-rounds";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDrillRounds, type DrillRounds } from "./useDrillRounds";
import { EXAMS, ExamBridge, RoundBar, RoundComplete, RoundStatus } from "./DrillRound";

type PickerMode = DrillMode | "gauntlet";

const PICKER: { id: PickerMode; label: string }[] = [
  ...MODES.map((m) => ({ id: m.id as PickerMode, label: m.label })),
  { id: "gauntlet", label: "Gauntlet" },
];

const SKILL_IDS = MODES.map((m) => m.id);
const labelOf = (id: string) => MODES.find((m) => m.id === id)?.label ?? id;

function makeQuestion(mode: PickerMode, difficulty: Difficulty): DrillQuestion {
  const concrete = mode === "gauntlet" ? pickGauntletMode() : mode;
  return generateQuestion(concrete, difficulty);
}

/**
 * Rapid-fire subnetting drill. On the public tool page it's played in rounds:
 * round 1 is free, a free account keeps going, and each later round opens on
 * the visitor's weakest skill.
 *
 * Rendered client-only (see SubnettingDrillLazy). `showRegisterCta` is off in
 * the logged-in workspace, which runs the plain endless drill.
 */
export function SubnettingDrill({
  showRegisterCta = true,
}: {
  showRegisterCta?: boolean;
} = {}) {
  const rounds = useDrillRounds({ tool: "subnetting", ids: SKILL_IDS, enabled: showRegisterCta });

  if (!rounds.ready) {
    return (
      <div className="grid min-h-72 place-items-center rounded-xl border bg-card p-6 text-sm text-muted-foreground">
        Loading the drill…
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
    const solid = tiles.filter((t) => t.status === "got").length;
    const shaky = tiles.filter((t) => t.status === "missed").length;
    const untried = tiles.length - solid - shaky;
    const w = weakest ? items[weakest] : undefined;
    return (
      <RoundComplete
        rounds={rounds}
        noun={["skill", "skills"]}
        tiles={tiles}
        variant="skills"
        headline={
          shaky > 0
            ? `${shaky} ${shaky === 1 ? "skill needs" : "skills need"} work.`
            : untried > 0
              ? `${solid} ${solid === 1 ? "skill" : "skills"} solid. ${untried} still to try.`
              : `All ${tiles.length} skills solid.`
        }
        subline={
          weakest
            ? `Round ${rounds.roundNumber + 1} opens on ${labelOf(weakest)}${
                w ? ` — ${w.c} of ${w.a} right so far.` : ", which you haven't tried yet."
              }`
            : undefined
        }
        extra={
          <ExamBridge
            tool="subnetting"
            title="Subnetting is one skill in one domain."
            exams={[EXAMS.networkPlus, EXAMS.aPlusCore1]}
          >
            The exam is decided by troubleshooting scenarios and PBQs across
            every domain. See where you stand on them in about 3 minutes.
          </ExamBridge>
        }
      />
    );
  }

  // Remounts each time play (re)starts; later rounds open on the weakest skill.
  return (
    <SubnettingRound
      rounds={rounds}
      initialMode={rounds.enabled && rounds.progress.rounds > 0 && weakest ? (weakest as DrillMode) : "network-id"}
    />
  );
}

function SubnettingRound({
  rounds,
  initialMode,
}: {
  rounds: DrillRounds;
  initialMode: PickerMode;
}) {
  const [mode, setMode] = useState<PickerMode>(initialMode);
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");
  const [question, setQuestion] = useState<DrillQuestion>(() =>
    makeQuestion(initialMode, "standard")
  );
  const [value, setValue] = useState("");
  const [missed, setMissed] = useState(false);
  const [score, setScore] = useState({ correct: 0, answered: 0 });
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const startedAt = useRef<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stamp the first question's start time once mounted (refs may be written
  // in effects; Date.now() is impure so it can't run in the initializer).
  useEffect(() => {
    if (startedAt.current === 0) startedAt.current = Date.now();
  }, []);

  const fresh = useCallback((m: PickerMode, d: Difficulty) => {
    setQuestion(makeQuestion(m, d));
    setValue("");
    setMissed(false);
    startedAt.current = Date.now();
    inputRef.current?.focus();
  }, []);

  /** Next question — unless that answer ended the round (the reveal takes over). */
  const proceed = useCallback(() => {
    if (rounds.advance()) return;
    fresh(mode, difficulty);
  }, [rounds, fresh, mode, difficulty]);

  const settle = useCallback(
    (correct: boolean) => {
      rounds.record(question.mode, correct);
      setTotalMs((t) => t + (Date.now() - startedAt.current));
      setScore((s) => ({
        correct: s.correct + (correct ? 1 : 0),
        answered: s.answered + 1,
      }));
      setStreak((prev) => {
        const next = correct ? prev + 1 : 0;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
      if (correct) {
        proceed();
      } else {
        setMissed(true);
      }
    },
    [rounds, question, proceed]
  );

  const submit = useCallback(
    (raw: string) => {
      if (missed) return;
      settle(grade(question, raw));
    },
    [missed, question, settle]
  );

  // Yes/no questions answer via Y/N keys; after a miss, Enter advances.
  // The listener only forwards events to handlers — no state set here.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (missed && e.key === "Enter") {
        e.preventDefault();
        proceed();
        return;
      }
      if (question.answerKind === "yes-no" && !missed) {
        if (e.key.toLowerCase() === "y") submit("yes");
        if (e.key.toLowerCase() === "n") submit("no");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [missed, proceed, question, submit]);

  function switchMode(m: PickerMode) {
    setMode(m);
    setScore({ correct: 0, answered: 0 });
    setStreak(0);
    setBestStreak(0);
    setTotalMs(0);
    fresh(m, difficulty);
  }

  function switchDifficulty(d: Difficulty) {
    setDifficulty(d);
    fresh(mode, d);
  }

  const avgSeconds =
    score.answered >= 3 ? (totalMs / score.answered / 1000).toFixed(1) : null;
  const modeLabel = MODES.find((m) => m.id === question.mode)?.label;
  const lastOfRound = rounds.enabled && rounds.answered >= rounds.size;

  return (
    <div className="grid gap-4">
      {/* Mode picker */}
      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Drill mode">
        {PICKER.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => switchMode(m.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              mode === m.id
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:border-muted-foreground/40"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-xl border bg-card p-6">
        {rounds.enabled && <RoundBar rounds={rounds} />}

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-xs text-muted-foreground">
          {rounds.enabled ? (
            <RoundStatus rounds={rounds} />
          ) : (
            <span>
              {score.correct} / {score.answered} correct
              {avgSeconds && <> · avg {avgSeconds}s</>}
            </span>
          )}
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Flame
                className={cn(
                  "size-3.5",
                  streak >= 3 ? "text-warning" : "text-muted-foreground/50"
                )}
              />
              streak {streak} · best {bestStreak}
            </span>
            <span className="flex overflow-hidden rounded-md border">
              {(["standard", "any-prefix"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => switchDifficulty(d)}
                  className={cn(
                    "px-2 py-1 transition-colors",
                    difficulty === d
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  )}
                >
                  {d === "standard" ? "/24+" : "any prefix"}
                </button>
              ))}
            </span>
          </span>
        </div>

        {/* Prompt */}
        <div>
          {mode === "gauntlet" && modeLabel && (
            <span className="mb-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              {modeLabel}
            </span>
          )}
          <p className="text-sm text-muted-foreground">{question.prompt}</p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
            {question.promptValue}
          </p>
        </div>

        {/* Answer */}
        {question.answerKind === "yes-no" ? (
          <div className="flex gap-2">
            {(["yes", "no"] as const).map((v) => {
              const isAnswer = missed && question.answer === v;
              return (
                <Button
                  key={v}
                  variant="outline"
                  disabled={missed}
                  onClick={() => submit(v)}
                  className={cn(
                    "min-w-24 font-mono",
                    isAnswer && "border-success text-success"
                  )}
                >
                  {v === "yes" ? "Yes (Y)" : "No (N)"}
                </Button>
              );
            })}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (missed) proceed();
              else submit(value);
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={question.placeholder}
              disabled={missed}
              autoFocus
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              inputMode={
                question.answerKind === "count" || question.answerKind === "cidr"
                  ? "numeric"
                  : "decimal"
              }
              aria-label="Your answer"
              className={cn(
                "h-10 w-full rounded-lg border bg-background px-3 font-mono text-sm outline-none transition-colors",
                "focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary",
                missed && "border-danger/50 text-muted-foreground"
              )}
            />
            <Button type="submit" className="min-w-24">
              {missed ? (lastOfRound ? "See your round" : "Next") : "Check"}
            </Button>
          </form>
        )}

        {/* Worked solution on a miss */}
        {missed && (
          <div className="rounded-lg border border-danger/40 bg-danger/5 px-4 py-3 text-sm leading-relaxed">
            <p className="flex items-center gap-1.5 font-medium">
              <X className="size-4 text-danger" />
              Answer:{" "}
              <span className="font-mono">
                {question.answerKind === "cidr"
                  ? `/${question.answer}`
                  : question.answer}
              </span>
            </p>
            <div className="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
              {question.solution.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {lastOfRound
                ? "Press Enter to see your round."
                : "Press Enter for the next one."}
            </p>
          </div>
        )}

        {!missed && score.answered > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-success" />
            Correct answers advance automatically — keep going.
          </p>
        )}
      </div>
    </div>
  );
}
