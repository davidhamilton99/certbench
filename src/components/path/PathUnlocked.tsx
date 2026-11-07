"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, FlaskConical } from "lucide-react";
import { projectFinish } from "@/core/path/checkpoint";
import { isStopDone } from "@/core/path/progress";
import type { ObjectiveStatus, PathPlan, PathProgress, PathStructure } from "@/core/path/types";
import { ExamMap, MapLegend, type LabState } from "./ExamMap";

const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });

/**
 * The moment Pro opens a path, shown once per exam on a device: right after
 * buying, or on the first visit once Pro covers this exam. It counts what's now
 * theirs from the plan, pops the labs onto the map, and leads on (`children`,
 * the way to the next stop). It stays on the path, in the path's own words: a
 * buyer who lands somewhere unfamiliar leaves.
 */
export function PathUnlocked({
  structure,
  plan,
  progress,
  statuses,
  labs,
  firstLab,
  children,
}: {
  structure: PathStructure;
  plan: PathPlan;
  progress: PathProgress;
  statuses: Map<string, ObjectiveStatus>;
  labs: ReadonlyMap<string, LabState>;
  /** The earliest lab not played yet, when it isn't already the next stop. */
  firstLab: { title: string; minutes: number | null; onOpen: () => void } | null;
  children: ReactNode;
}) {
  // "Today" for the projection, fixed for the life of the screen.
  const [now] = useState(() => Date.now());
  const left = plan.stops.filter((s) => !isStopDone(progress, s.id));
  const count = {
    stops: left.filter((s) => s.kind !== "practice" && s.kind !== "lab").length,
    practice: left.filter((s) => s.kind === "practice").length,
    labs: left.filter((s) => s.kind === "lab").length,
  };
  const minutes = progress.goal?.minutes || 20;
  const finish = left.length > 0 ? projectFinish(left.length, minutes, now) : null;

  return (
    <div className="path-rise grid gap-6">
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-6 shadow-sm sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-28 left-1/2 h-64 w-[28rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl"
        />
        <div className="relative grid justify-items-center gap-3 text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-primary">
            Pro · {structure.examName}
          </span>
          <h2 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Your whole path is open.
          </h2>
          <p className="max-w-md text-balance text-muted-foreground">
            Everything from here to exam day, in the same short stops, with a hands-on lab
            closing every domain.
          </p>
        </div>

        <dl className="relative mt-7 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { n: count.stops, label: count.stops === 1 ? "short stop" : "short stops" },
            { n: count.practice, label: count.practice === 1 ? "domain practice" : "domain practices" },
            { n: count.labs, label: count.labs === 1 ? "hands-on lab" : "hands-on labs" },
          ].map(({ n, label }) => (
            <div
              key={label}
              className="flex flex-col-reverse gap-0.5 rounded-2xl border border-border bg-background/50 px-2 py-3 text-center sm:py-4"
            >
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="font-display text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl">{n}</dd>
            </div>
          ))}
        </dl>

        {finish && (
          <p className="relative mt-5 text-center text-sm text-muted-foreground">
            At {minutes} minutes a day, you finish by {fmt(finish)}.
          </p>
        )}
      </div>

      {children}

      {firstLab && (
        <button
          type="button"
          onClick={firstLab.onOpen}
          className="glass group flex items-center gap-4 rounded-3xl p-5 text-left transition-colors hover:border-primary/40 sm:p-6"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <FlaskConical className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Or try a lab now{firstLab.minutes ? ` · about ${firstLab.minutes} min` : ""}
            </span>
            <span className="mt-1 block truncate font-display text-lg font-semibold tracking-tight">
              {firstLab.title}
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </button>
      )}

      <div className="glass grid gap-5 rounded-3xl p-5 sm:p-6">
        <h3 className="font-display font-semibold tracking-tight">Your map</h3>
        <ExamMap structure={structure} statuses={statuses} labs={labs} labsFresh />
        <MapLegend labs="open" />
      </div>
    </div>
  );
}
