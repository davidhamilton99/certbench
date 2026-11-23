"use client";

import { useEffect, useId, useRef, useState } from "react";
import * as RadioGroup from "@radix-ui/react-radio-group";
import { Check, Flag, RotateCcw, X } from "lucide-react";
import { AnswerOption, OPTION_LETTERS, type AnswerState } from "@/components/quiz/AnswerOption";
import { Button } from "@/components/ui/button";
import type { PbqGradeResult, ThreatHuntScenario } from "@/data/pbq/types";
import { gradeThreatHunt, huntSentence, huntTally } from "@/core/pbq/grade-threat-hunt";
import { PbqUpsellCard, type PbqUpsell } from "@/components/workspace/pbq-upsell";
import type { PbqHostProps } from "@/components/workspace/pbq-host";
import { LabHeader, LabScore, useKeepInView, useStarted, type LabVerdicts } from "@/components/workspace/LabKit";
import { ConsoleFrame, Ticket } from "@/components/workspace/SimCaseFile";
import { cn } from "@/lib/utils";

/** A hunt's verdict in each band of its score. */
const VERDICTS: LabVerdicts = {
  ready: "Threat identified",
  close: "Partly identified",
  work: "Threat not identified",
};

/** How a line stands once the hunt is analyzed. A line that was not evidence and was left alone has no mark. */
type LineMark = "caught" | "missed" | "false-alarm";

/**
 * Each mark in three ways at once, never by colour alone: the row's frame, an
 * icon, and a sentence under the line. The colours are the console's own
 * marks (see ConsoleFrame): no colour is named here.
 */
const MARK: Record<LineMark, { row: string; ink: string; words: string }> = {
  caught: { row: "border-success/60 bg-success/15", ink: "text-success", words: "You flagged this evidence." },
  missed: { row: "border-destructive/60 bg-destructive/15", ink: "text-destructive", words: "You missed this evidence." },
  "false-alarm": { row: "border-warning/60 bg-warning/10", ink: "text-warning", words: "This line is not evidence." },
};

const ROW = "flex w-full items-start gap-2 rounded-md border px-2.5 py-1.5 text-left font-mono text-xs leading-relaxed";

/** The mark that separates the parts of a log's source as it is filed ("file, host"). */
const SOURCE_MARK = String.fromCharCode(0xb7);

/** A log's source as a plain list: its parts with commas between them. */
function sourceLabel(source: string): string {
  return source
    .split(SOURCE_MARK)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * A threat hunt: a log in a console. The player flags the lines that are
 * evidence, answers one question about what the evidence shows, and then has
 * the hunt analyzed: every line that mattered is marked and explained where
 * it stands, and the score says how the hunt went.
 *
 * The console is the frame every lab's console is drawn in (ConsoleFrame), so
 * it is dark paper in both themes and takes all its ink from that frame.
 *
 * Keyboard and screen readers. Each line is a button that is pressed or not
 * (flagged or not). The answers to the question are a radio group: one stop
 * for Tab, the arrow keys move between them. Once the hunt is analyzed the
 * score takes the focus so that it is read, and the lines become plain text
 * with their marks in words. There are no single-key shortcuts here.
 */
export function ThreatHuntPlayer({
  scenario,
  onBack,
  upsell,
  onGraded,
  backLabel,
  onStarted,
  takeFocus,
}: {
  scenario: ThreatHuntScenario;
  onBack: () => void;
  upsell?: PbqUpsell;
} & PbqHostProps) {
  const root = useRef<HTMLDivElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const questionId = useId();
  const needId = useId();
  const whatId = useId();

  const [run, setRun] = useState(0);
  const [flagged, setFlagged] = useState<ReadonlySet<number>>(() => new Set());
  const [choice, setChoice] = useState(-1);
  const [result, setResult] = useState<PbqGradeResult | null>(null);
  const started = useStarted(onStarted);

  const revealed = result !== null;
  const ready = flagged.size > 0 && choice !== -1;

  function toggle(i: number) {
    if (revealed) return;
    started();
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function choose(i: number) {
    if (revealed) return;
    started();
    setChoice(i);
  }

  function analyze() {
    if (!ready || revealed) return;
    const graded = gradeThreatHunt(scenario, { flagged: [...flagged], attackChoice: choice });
    setResult(graded);
    onGraded?.(graded);
  }

  function reset() {
    setFlagged(new Set());
    setChoice(-1);
    setResult(null);
    setRun((r) => r + 1);
  }

  // The score takes the focus when it arrives, so that it is read; it is not a control.
  useEffect(() => {
    if (revealed) top.current?.focus({ preventScroll: true });
  }, [revealed]);

  // A hunt that is repeated starts again from what it asks.
  useEffect(() => {
    if (run > 0) hint.current?.focus({ preventScroll: true });
  }, [run]);

  // The score from the lab's top, and a repeat from its start.
  useKeepInView(`${run}:${revealed}`, () => root.current);

  function markOf(i: number): LineMark | null {
    if (!revealed) return null;
    const line = scenario.lines[i];
    if (line.malicious) return flagged.has(i) ? "caught" : "missed";
    return flagged.has(i) ? "false-alarm" : null;
  }

  function answerState(i: number): AnswerState {
    if (!revealed) return choice === i ? "chosen" : "idle";
    if (i === scenario.correctOption) return "correct";
    if (i === choice) return "incorrect";
    return "dimmed";
  }

  /** The mark on an answer in words, for a screen reader. */
  function answerSaid(i: number): string | undefined {
    if (!revealed) return undefined;
    if (i === scenario.correctOption) return i === choice ? "Your answer, which is correct: " : "Correct answer: ";
    if (i === choice) return "Your answer, which is incorrect: ";
    return undefined;
  }

  const count = flagged.size;

  return (
    <div ref={root} className="flex min-w-0 flex-col gap-4 sm:gap-5">
      <LabHeader
        title={scenario.title}
        subtitle={`${scenario.domain_number} ${scenario.domain_title}`}
        onBack={onBack}
        backLabel={backLabel}
        takeFocus={takeFocus}
      />

      {result && (
        <div ref={top} tabIndex={-1} role="group" aria-label="Your score" className="path-rise">
          <LabScore
            score={result.score}
            verdicts={VERDICTS}
            summary={huntSentence(huntTally(scenario, { flagged: [...flagged], attackChoice: choice }))}
          />
        </div>
      )}

      <Ticket text={scenario.briefing} />

      <div className="grid min-w-0 gap-2">
        {/* Takes the focus when the hunt is repeated, so that it is read; it is not a control. */}
        <p ref={hint} tabIndex={-1} className="text-small text-muted-foreground">
          {revealed
            ? "Each line that was evidence, and each line you flagged, is marked and explained in the log."
            : count === 0
              ? "Choose each line of the log that is evidence."
              : `You have flagged ${count} ${count === 1 ? "line" : "lines"}. Choose a flagged line again to remove its flag.`}
        </p>
        <ConsoleFrame
          header={
            <span className="min-w-0 flex-1 font-mono text-xs leading-7 text-muted-foreground [overflow-wrap:anywhere]">
              {sourceLabel(scenario.logSource)}
            </span>
          }
        >
          <ol
            // Named as a list for every screen reader, with or without list markers.
            role="list"
            aria-label="Log lines"
            // While the hunt is on, a long log scrolls in its box, and the focus
            // carries the scroll with it. Once it is marked it is laid out whole,
            // to be read with its notes.
            className={cn("grid gap-0.5 p-1.5", !revealed && "max-h-104 overflow-y-auto")}
          >
            {scenario.lines.map((line, i) => {
              const isFlagged = flagged.has(i);
              const mark = markOf(i);
              // Quieter than the log's text, and still well above the contrast that small text needs.
              const number = (
                <span aria-hidden className="mt-px w-6 shrink-0 select-none text-right text-muted-foreground/80">
                  {i + 1}
                </span>
              );
              return (
                <li key={i} className="grid min-w-0">
                  {revealed ? (
                    <div className={cn(ROW, mark ? MARK[mark].row : "border-transparent text-muted-foreground")}>
                      {number}
                      <span aria-hidden className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
                        {mark === "caught" ? (
                          <Check className={cn("size-3.5", MARK.caught.ink)} strokeWidth={3} />
                        ) : mark === "missed" ? (
                          <Flag className={cn("size-3.5", MARK.missed.ink)} />
                        ) : mark === "false-alarm" ? (
                          <X className={cn("size-3.5", MARK["false-alarm"].ink)} strokeWidth={3} />
                        ) : null}
                      </span>
                      <span className="min-w-0 whitespace-pre-wrap break-words">{line.text}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-pressed={isFlagged}
                      onClick={() => toggle(i)}
                      className={cn(
                        ROW,
                        // A line is a full-size target under a thumb, and its ring is drawn inside the list's box.
                        "transition-colors focus-visible:-outline-offset-2 pointer-coarse:py-3",
                        isFlagged ? "border-primary/70 bg-primary/15" : "border-transparent hover:bg-foreground/[0.06]"
                      )}
                    >
                      {number}
                      <span aria-hidden className="mt-0.5 flex size-3.5 shrink-0 items-center justify-center">
                        {isFlagged && <Flag className="size-3.5 text-primary" />}
                      </span>
                      <span className="min-w-0 whitespace-pre-wrap break-words">{line.text}</span>
                    </button>
                  )}
                  {mark && (
                    // What the mark means, in words, and why the line is or is not evidence.
                    <p className="mb-1.5 ml-10 mr-2 mt-1 text-note">
                      <span className={cn("font-semibold", MARK[mark].ink)}>{MARK[mark].words}</span>
                      {line.note ? ` ${line.note}` : null}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </ConsoleFrame>
      </div>

      <div className="grid min-w-0 gap-3">
        <p id={questionId} className="text-body font-medium">
          {scenario.question}
        </p>
        {/* A choice that can still be changed is a radio group, named by the question. */}
        <RadioGroup.Root
          aria-labelledby={questionId}
          // An empty value is "nothing chosen yet"; it keeps the group controlled.
          value={choice === -1 ? "" : String(choice)}
          onValueChange={(next) => choose(Number(next))}
          disabled={revealed}
          className="grid gap-2.5"
        >
          {scenario.options.map((option, i) => (
            <RadioGroup.Item key={i} value={String(i)} asChild>
              <AnswerOption marker={OPTION_LETTERS[i] ?? String(i + 1)} state={answerState(i)} srPrefix={answerSaid(i)} dense>
                {option}
              </AnswerOption>
            </RadioGroup.Item>
          ))}
        </RadioGroup.Root>
      </div>

      {revealed ? (
        <>
          <section aria-labelledby={whatId} className="grid gap-2 rounded-lg border border-border bg-card p-5 sm:p-6">
            <h3 id={whatId} className="text-base font-semibold leading-snug">
              What happened
            </h3>
            <p className="cb-measure-sm text-small text-muted-foreground">{scenario.explanation}</p>
          </section>

          {upsell && <PbqUpsellCard upsell={upsell} />}

          <div className="flex flex-wrap gap-3">
            <Button onClick={reset}>
              <RotateCcw />
              Repeat the lab
            </Button>
            <Button variant="outline" onClick={onBack}>
              {backLabel ?? "Return to the scenarios"}
            </Button>
          </div>
        </>
      ) : (
        <div className="grid gap-2">
          <Button
            size="lg"
            className="w-full sm:w-auto sm:justify-self-start"
            onClick={analyze}
            disabled={!ready}
            // The line below says what is still needed before the button can be pressed.
            aria-describedby={ready ? undefined : needId}
          >
            Analyze
          </Button>
          {!ready && (
            <p id={needId} className="text-note text-muted-foreground">
              Flag at least one line and answer the question before you analyze.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
