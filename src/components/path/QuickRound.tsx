"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { track } from "@/lib/analytics";
import { finishStop, recordRep } from "@/core/path/progress";
import type { PathCert, Rep } from "@/core/path/types";
import { Button } from "@/components/ui/button";
import { RepCard, StopProgress, type RepAnswer } from "./RepCard";
import { updateLocalPath } from "./local-path";

/**
 * One stop of the guided path, playable right on a public page with no
 * account. Same reps and player as the path, so the page leads with the thing
 * people come back for. The answers count on their path (kept on this device
 * until they save it), and the round ends on one way on: that exam's path.
 */
export function QuickRound({
  cert,
  stopId,
  examName,
  reps,
  label,
  surface,
  pitch,
}: {
  cert: PathCert;
  /** The path stop being played ("warmup" or an objective code). */
  stopId: string;
  examName: string;
  reps: Rep[];
  /** Eyebrow for the round, e.g. "Objective 1.1 · Security controls". */
  label: string;
  /** Analytics surface, e.g. "objective_page". */
  surface: string;
  /** One line under the score: what the path does next. */
  pitch: string;
}) {
  const [run, setRun] = useState(0);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(() => reps.map(() => null));
  const [done, setDone] = useState(false);
  // Handlers read these, not render state: a right answer moves on by timer.
  const current = useRef(0);
  const right = useRef(0);

  const onAnswer = useCallback(
    (answer: RepAnswer) => {
      const index = current.current;
      const rep = reps[index];
      if (!rep) return;
      if (answer.correct) right.current += 1;
      updateLocalPath(cert, (p) => recordRep(p, rep.id, answer.correct, Date.now()));
      setResults((prev) => {
        const next = [...prev];
        next[index] = answer.correct;
        return next;
      });
    },
    [cert, reps]
  );

  const onNext = useCallback(() => {
    if (current.current < reps.length - 1) {
      current.current += 1;
      setI(current.current);
      return;
    }
    updateLocalPath(cert, (p) => finishStop(p, stopId, right.current, reps.length, Date.now()));
    track("quick_round_completed", { cert, surface, correct: right.current, total: reps.length });
    setDone(true);
  }, [cert, stopId, surface, reps.length]);

  function playAgain() {
    current.current = 0;
    right.current = 0;
    setI(0);
    setResults(reps.map(() => null));
    setDone(false);
    setRun((r) => r + 1);
  }

  if (done) {
    const correct = results.filter((r) => r === true).length;
    return (
      <div className="glass path-rise grid gap-5 rounded-3xl p-6 sm:p-8">
        <div className="grid gap-1.5">
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </span>
          <p className="font-display text-4xl font-semibold tracking-tight">
            {correct} <span className="text-muted-foreground">of {reps.length}</span>
          </p>
          <p className="text-muted-foreground">{pitch}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link href={`/path/${cert}`} onClick={() => track("path_exam_picked", { cert, surface })}>
              Start my {examName} path
              <ArrowRight />
            </Link>
          </Button>
          <button
            type="button"
            onClick={playAgain}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Play again
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          This round already counts on your path. No account needed to start.
        </p>
      </div>
    );
  }

  const rep = reps[i];
  return (
    <div className="glass rounded-3xl p-5 sm:p-8">
      <div className="mb-6 grid gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
            {i + 1} / {reps.length}
          </span>
        </div>
        <StopProgress results={results} current={i} />
      </div>
      {rep && <RepCard key={`${run}-${i}-${rep.id}`} rep={rep} onAnswer={onAnswer} onNext={onNext} />}
    </div>
  );
}
