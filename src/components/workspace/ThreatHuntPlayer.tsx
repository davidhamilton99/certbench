"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flag, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type {
  PbqGradeResult,
  ThreatHuntScenario,
} from "@/data/pbq/types";
import { gradeThreatHunt } from "@/core/pbq/grade-threat-hunt";
import { cn } from "@/lib/utils";

type Phase = "hunting" | "analyzing" | "revealed";

/* ------------------------------------------------------------------ */
/*  Neutral log highlighting                                           */
/* ------------------------------------------------------------------ */

/**
 * Tokenises a log line so it reads like a real console — timestamps dim,
 * IPs and ports tinted. Deliberately colours only STRUCTURAL tokens that
 * appear in both malicious and benign lines, so highlighting never hints
 * at the answer. Concatenation of the pieces equals the original text.
 */
function HighlightedLine({ text }: { text: string }) {
  const parts: { s: string; cls?: string }[] = [];

  // Peel a leading timestamp (HH:MM or HH:MM:SS).
  const tsMatch = text.match(/^(\d{2}:\d{2}(?::\d{2})?)(\s*)/);
  let rest = text;
  if (tsMatch) {
    parts.push({ s: tsMatch[1], cls: "text-white/35" });
    if (tsMatch[2]) parts.push({ s: tsMatch[2] });
    rest = text.slice(tsMatch[0].length);
  }

  // Tint IPv4 addresses and :port suffixes in the remainder.
  const token = /(\d{1,3}(?:\.\d{1,3}){3})|(:\d{2,5})(?=\b|\s|$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = token.exec(rest)) !== null) {
    if (m.index > last) parts.push({ s: rest.slice(last, m.index) });
    if (m[1]) parts.push({ s: m[1], cls: "text-sky-300/90" });
    else parts.push({ s: m[2], cls: "text-violet-300/90" });
    last = m.index + m[0].length;
  }
  if (last < rest.length) parts.push({ s: rest.slice(last) });

  return (
    <>
      {parts.map((p, i) =>
        p.cls ? (
          <span key={i} className={p.cls}>
            {p.s}
          </span>
        ) : (
          <span key={i}>{p.s}</span>
        )
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Player                                                             */
/* ------------------------------------------------------------------ */

/**
 * Threat Hunt player: an interactive log console. Tap the lines that are
 * evidence of the attack (instant, tactile — no confirm dialogs), pick the
 * attack, then Analyze: a scan sweeps the console, the verdict resolves
 * per line, and an analyst debrief breaks down what you caught and missed.
 * Touch-native throughout.
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
  const [phase, setPhase] = useState<Phase>("hunting");
  const [result, setResult] = useState<PbqGradeResult | null>(null);
  const scoreRef = useRef<HTMLSpanElement>(null);

  const revealed = phase === "revealed";
  const analyzing = phase === "analyzing";
  const locked = revealed || analyzing;

  function toggle(i: number) {
    if (locked) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function analyze() {
    const graded = gradeThreatHunt(scenario, {
      flagged: [...flagged],
      attackChoice,
    });
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setResult(graded);
      setPhase("revealed");
      return;
    }
    setPhase("analyzing");
    // The scan beat, then resolve. setState in a handler continuation is fine.
    window.setTimeout(() => {
      setResult(graded);
      setPhase("revealed");
    }, 780);
  }

  function reset() {
    setFlagged(new Set());
    setAttackChoice(-1);
    setResult(null);
    setPhase("hunting");
  }

  // Score count-up on reveal — direct textContent writes, visible-guarded so
  // a background tab (frozen rAF) still shows the final number.
  useEffect(() => {
    const el = scoreRef.current;
    if (!revealed || !result || !el) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      el.textContent = String(result.score);
      return;
    }
    let raf = 0;
    const target = result.score;
    const run = () => {
      const t0 = performance.now();
      const DURATION = 900;
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / DURATION);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = String(Math.round(eased * target));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    if (document.visibilityState === "visible") run();
    else el.textContent = String(target);
    return () => cancelAnimationFrame(raf);
  }, [revealed, result]);

  // Analyst debrief numbers, computed from the flags directly.
  const debrief = (() => {
    let caught = 0;
    let missed = 0;
    let falseAlarms = 0;
    let threats = 0;
    scenario.lines.forEach((line, i) => {
      if (line.malicious) {
        threats++;
        if (flagged.has(i)) caught++;
        else missed++;
      } else if (flagged.has(i)) {
        falseAlarms++;
      }
    });
    return { caught, missed, falseAlarms, threats };
  })();

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

      {/* Result: score + analyst debrief */}
      {result && (
        <Panel padding="lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-baseline gap-3">
              <span className={cn("font-mono text-4xl font-semibold tabular-nums leading-none", scoreColor)}>
                <span ref={scoreRef}>{result.score}</span>%
              </span>
              <Badge variant={result.score >= 75 ? "success" : result.score >= 40 ? "warning" : "danger"}>
                {result.score >= 75 ? "Threat identified" : result.score >= 40 ? "Partial" : "Missed it"}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
              <span className="flex items-center gap-1.5 text-success">
                <ShieldCheck className="size-3.5" />
                {debrief.caught}/{debrief.threats} caught
              </span>
              <span className={cn("flex items-center gap-1.5", debrief.missed ? "text-danger" : "text-muted-foreground")}>
                <ShieldAlert className="size-3.5" />
                {debrief.missed} missed
              </span>
              <span className={cn("flex items-center gap-1.5", debrief.falseAlarms ? "text-warning" : "text-muted-foreground")}>
                <Flag className="size-3.5" />
                {debrief.falseAlarms} false {debrief.falseAlarms === 1 ? "alarm" : "alarms"}
              </span>
            </div>
          </div>
        </Panel>
      )}

      {/* Console */}
      <div className="relative overflow-hidden rounded-xl border bg-[#0b0f17] text-[#d6deeb]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-[#ff5f56]" />
            <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
            <span className="size-2.5 rounded-full bg-[#27c93f]" />
          </span>
          <span className="ml-1 truncate font-mono text-[11px] text-white/50">
            {scenario.logSource}
          </span>
          <span className="ml-auto font-mono text-[11px] text-white/40">
            {analyzing
              ? `analyzing ${scenario.lines.length} events…`
              : revealed
                ? `${scenario.lines.length} events analyzed`
                : `${flagged.size} flagged · tap to flag`}
          </span>
        </div>
        <div className="relative max-h-[26rem] overflow-y-auto overflow-x-auto p-1.5">
          {/* Scan sweep during analysis */}
          {analyzing && (
            <div
              aria-hidden
              className="animate-hunt-scan pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-transparent via-primary/25 to-transparent"
            />
          )}
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
                  disabled={locked}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-md px-2.5 py-1.5 text-left font-mono text-[12px] leading-relaxed transition-colors duration-300",
                    !locked && "hover:bg-white/[0.06]",
                    !revealed && isFlagged && "bg-amber-400/15 ring-1 ring-amber-400/40",
                    correctFlag && "bg-success/15 ring-1 ring-success/50",
                    missed && "bg-danger/15 ring-1 ring-danger/50",
                    falseAlarm && "bg-amber-400/10 ring-1 ring-amber-400/40",
                    locked && "cursor-default"
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
                      "min-w-0 whitespace-pre-wrap break-words transition-opacity",
                      revealed && !line.malicious && !falseAlarm && "opacity-45"
                    )}
                  >
                    <HighlightedLine text={line.text} />
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
                disabled={locked}
                onClick={() => setAttackChoice(i)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-left text-sm transition-colors",
                  !locked && attackChoice === i && "border-primary bg-primary/5 ring-1 ring-primary",
                  !locked && attackChoice !== i && "hover:border-muted-foreground/40 hover:bg-accent",
                  isCorrect && "border-success bg-success/10",
                  isWrongPick && "border-danger bg-danger/10",
                  locked && "cursor-default"
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
          <Button onClick={analyze} disabled={flagged.size === 0 || attackChoice === -1 || analyzing}>
            {analyzing ? "Analyzing…" : "Analyze"}
          </Button>
          {!analyzing && (flagged.size === 0 || attackChoice === -1) && (
            <p className="text-center text-[12px] text-muted-foreground">
              Flag at least one line and choose the attack to analyze.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
