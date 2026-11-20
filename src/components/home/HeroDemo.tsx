"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import type { ObjectiveStatus, PathStructure, Rep } from "@/core/path/types";
import { RepCard, StopProgress, type RepAnswer } from "@/components/path/RepCard";
import { ExamMap } from "@/components/path/ExamMap";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const SURFACE = "home_demo";

/**
 * The homepage's test drive: four real warm-up questions on the path's own
 * card, each marked the moment it's tapped, lighting its objective on the
 * exam's map beside it. Then the score and the way onto a path.
 */
export function HeroDemo({
  reps,
  structure,
  stops,
}: {
  reps: Rep[];
  structure: PathStructure;
  /** How many stops the full path has, for the closing line. */
  stops: number;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<(boolean | null)[]>(() => reps.map(() => null));
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  // Number keys answer only while the demo is on screen.
  const [onScreen, setOnScreen] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(!!e?.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const done = i >= reps.length;
  const rep = reps[i];
  const correct = results.filter((r) => r === true).length;

  const statuses = useMemo(() => {
    const m = new Map<string, ObjectiveStatus>();
    reps.forEach((r, k) => {
      const res = results[k];
      if (res === null || res === undefined) return;
      m.set(r.objective, res && m.get(r.objective) !== "missed" ? "got" : "missed");
    });
    return m;
  }, [reps, results]);

  const onAnswer = useCallback(
    ({ correct: ok }: RepAnswer) => {
      setResults((prev) => prev.map((r, k) => (k === i ? ok : r)));
      setFresh(new Set([reps[i].objective]));
      track("sample_question_answered", { correct: ok, surface: SURFACE });
    },
    [i, reps]
  );

  const onNext = useCallback(() => {
    const n = i + 1;
    setI(n);
    if (n >= reps.length) {
      const got = results.filter((r) => r === true).length;
      track("question_deck_completed", { surface: SURFACE, correct: got, total: reps.length });
    }
  }, [i, reps.length, results]);

  function again() {
    setRound((r) => r + 1);
    setI(0);
    setResults(reps.map(() => null));
    setFresh(new Set());
  }

  return (
    <div ref={root} className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="grid content-start gap-6 p-5 sm:p-9">
        <div className="grid gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <span className="relative flex size-2">
                <span className="cb-ping absolute inset-0 rounded-full bg-primary" />
                <span className="relative size-2 rounded-full bg-primary" />
              </span>
              Test drive · {structure.examName}
            </p>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {Math.min(i + 1, reps.length)} / {reps.length}
            </span>
          </div>
          <StopProgress results={results} current={done ? -1 : i} />
        </div>

        {done ? (
          <div className="path-rise grid min-h-[19rem] content-center justify-items-center gap-5 py-4 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Your score</p>
            <p className="cb-display text-7xl sm:text-8xl">
              {correct}
              <span className="text-muted-foreground/60">/{reps.length}</span>
            </p>
            <p className="max-w-sm text-balance text-muted-foreground">
              That&apos;s how every stop plays. {stops} of them take you to exam day.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button asChild size="lg">
                <Link
                  href="/start"
                  onClick={() => track("upsell_clicked", { context: SURFACE, href: "/start" })}
                >
                  Start my path
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="ghost" size="lg" onClick={again} className="text-muted-foreground hover:text-foreground">
                <RotateCcw />
                Again
              </Button>
            </div>
          </div>
        ) : (
          rep && (
            <RepCard
              key={`${round}-${rep.id}`}
              rep={rep}
              onAnswer={onAnswer}
              onNext={onNext}
              promptAs="p"
              keyboard={onScreen}
            />
          )
        )}
      </div>

      <aside
        aria-label={`The ${structure.examName} map this demo fills in`}
        className="hidden border-l border-border/70 bg-foreground/[0.018] p-7 lg:grid lg:content-start lg:gap-5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold tracking-[-0.01em]">Your {structure.examName} map</p>
          <p className={cn("font-mono text-xs text-muted-foreground", statuses.size > 0 && "text-foreground")}>
            {statuses.size} of {structure.domains.reduce((s, d) => s + d.objectives.length, 0)}
          </p>
        </div>
        <ExamMap
          structure={structure}
          statuses={statuses}
          fresh={fresh}
          current={!done && rep ? new Set([rep.objective]) : undefined}
          className="gap-3.5"
        />
      </aside>
    </div>
  );
}
