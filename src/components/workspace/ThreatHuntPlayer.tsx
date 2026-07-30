"use client";

import { useState } from "react";
import { Check, Flag, X } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PbqGradeResult,
  ThreatHuntScenario,
} from "@/data/pbq/types";
import { gradeThreatHunt } from "@/core/pbq/grade-threat-hunt";
import { cn } from "@/lib/utils";

/**
 * Threat Hunt player: an interactive log console. Tap the lines that are
 * evidence of the attack (instant, tactile — no confirm dialogs), pick the
 * attack, then Analyze for a per-line reveal. Touch-native throughout; the
 * inviting on-ramp to hands-on PBQs.
 */
export function ThreatHuntPlayer({
  scenario,
  onBack,
}: {
  scenario: ThreatHuntScenario;
  onBack: () => void;
}) {
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [attackChoice, setAttackChoice] = useState<number>(-1);
  const [result, setResult] = useState<PbqGradeResult | null>(null);

  const revealed = result !== null;

  function toggle(i: number) {
    if (revealed) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function analyze() {
    setResult(
      gradeThreatHunt(scenario, {
        flagged: [...flagged],
        attackChoice,
      })
    );
  }

  function reset() {
    setFlagged(new Set());
    setAttackChoice(-1);
    setResult(null);
  }

  const scoreColor =
    result && result.score >= 75
      ? "text-success"
      : result && result.score >= 40
        ? "text-warning"
        : "text-danger";

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to scenarios"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-semibold">{scenario.title}</h2>
          <p className="text-[13px] text-muted-foreground">
            {scenario.domain_number} {scenario.domain_title}
          </p>
        </div>
      </div>

      {/* Briefing */}
      <Panel padding="md">
        <p className="text-sm text-foreground">{scenario.briefing}</p>
      </Panel>

      {/* Result banner */}
      {result && (
        <Panel padding="lg">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className={cn("font-mono text-4xl font-semibold tabular-nums leading-none", scoreColor)}>
                {result.score}%
              </span>
              <span className="text-sm text-muted-foreground">
                {result.correctItems}/{result.totalItems} correct
              </span>
            </div>
            <Badge variant={result.score >= 75 ? "success" : result.score >= 40 ? "warning" : "danger"}>
              {result.score >= 75 ? "Threat identified" : result.score >= 40 ? "Partial" : "Missed it"}
            </Badge>
          </div>
        </Panel>
      )}

      {/* Console */}
      <div className="overflow-hidden rounded-xl border bg-[#0b0f17] text-[#d6deeb]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f56]" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="size-2.5 rounded-full bg-[#27c93f]" />
          </span>
          <span className="ml-1 truncate font-mono text-[11px] text-white/50">
            {scenario.logSource}
          </span>
          {!revealed && (
            <span className="ml-auto font-mono text-[11px] text-white/40">
              {flagged.size} flagged · tap to flag
            </span>
          )}
        </div>
        <div className="max-h-[26rem] overflow-y-auto overflow-x-auto p-1.5">
          {scenario.lines.map((line, i) => {
            const isFlagged = flagged.has(i);
            const correctFlag = revealed && line.malicious && isFlagged;
            const missed = revealed && line.malicious && !isFlagged;
            const falseAlarm = revealed && !line.malicious && isFlagged;

            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  disabled={revealed}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left font-mono text-[12px] leading-relaxed transition-colors",
                    !revealed && "hover:bg-white/[0.06]",
                    !revealed && isFlagged && "bg-amber-400/15 ring-1 ring-amber-400/40",
                    correctFlag && "bg-success/15 ring-1 ring-success/50",
                    missed && "bg-danger/15 ring-1 ring-danger/50",
                    falseAlarm && "bg-amber-400/10 ring-1 ring-amber-400/40",
                    revealed && "cursor-default"
                  )}
                >
                  <span className="mt-0.5 w-6 shrink-0 select-none text-right text-white/30">
                    {i + 1}
                  </span>
                  <span className="mt-0.5 shrink-0">
                    {correctFlag ? (
                      <Check className="size-3.5 text-success" />
                    ) : missed ? (
                      <span title="Missed evidence">
                        <Flag className="size-3.5 text-danger" />
                      </span>
                    ) : falseAlarm ? (
                      <X className="size-3.5 text-amber-400" />
                    ) : isFlagged ? (
                      <Flag className="size-3.5 text-amber-400" />
                    ) : (
                      <span className="block size-3.5" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 whitespace-pre-wrap break-words",
                      revealed && !line.malicious && !falseAlarm && "text-white/40"
                    )}
                  >
                    {line.text}
                  </span>
                </button>
                {revealed && line.note && (line.malicious || falseAlarm) && (
                  <p
                    className={cn(
                      "mb-1 ml-10 mr-2 rounded-md px-2.5 py-1 text-[11px] leading-relaxed",
                      line.malicious ? "text-success/90" : "text-amber-300/90"
                    )}
                  >
                    {line.note}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Attack identification */}
      <div>
        <p className="text-sm font-medium">{scenario.question}</p>
        <div className="mt-2 grid gap-2">
          {scenario.options.map((option, i) => {
            const isCorrect = revealed && i === scenario.correctOption;
            const isWrongPick = revealed && i === attackChoice && !isCorrect;
            return (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={attackChoice === i}
                disabled={revealed}
                onClick={() => setAttackChoice(i)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                  !revealed && attackChoice === i && "border-primary bg-primary/5 ring-1 ring-primary",
                  !revealed && attackChoice !== i && "hover:border-muted-foreground/40 hover:bg-accent",
                  isCorrect && "border-success bg-success/10",
                  isWrongPick && "border-danger bg-danger/10",
                  revealed && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]",
                    isCorrect && "border-success bg-success text-success-foreground",
                    isWrongPick && "border-danger bg-danger text-danger-foreground"
                  )}
                >
                  {isCorrect ? <Check className="size-3" /> : isWrongPick ? <X className="size-3" /> : String.fromCharCode(65 + i)}
                </span>
                <span className="leading-relaxed">{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation (revealed) */}
      {revealed && (
        <Panel padding="md">
          <h3 className="mb-2 text-sm font-semibold">What happened</h3>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {scenario.explanation}
          </p>
        </Panel>
      )}

      {/* Actions */}
      {revealed ? (
        <div className="flex gap-3">
          <Button onClick={reset}>Hunt again</Button>
          <Button variant="secondary" onClick={onBack}>
            Back to scenarios
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button onClick={analyze} disabled={flagged.size === 0 || attackChoice === -1}>
            Analyze
          </Button>
          {(flagged.size === 0 || attackChoice === -1) && (
            <p className="text-center text-[12px] text-muted-foreground">
              Flag at least one line and choose the attack to analyze.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
