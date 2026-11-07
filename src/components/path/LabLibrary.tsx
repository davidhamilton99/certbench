"use client";

import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  Columns3,
  ListOrdered,
  Network,
  Radar,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LabType, PathLabInfo, PathStructure, StopRecord } from "@/core/path/types";
import { cn } from "@/lib/utils";

const TYPES: Record<LabType, { label: string; Icon: LucideIcon }> = {
  simulation: { label: "Simulation", Icon: SquareTerminal },
  topology: { label: "Topology", Icon: Network },
  "threat-hunt": { label: "Threat hunt", Icon: Radar },
  ordering: { label: "Ordering drill", Icon: ListOrdered },
  matching: { label: "Matching drill", Icon: ArrowLeftRight },
  categorization: { label: "Sorting drill", Icon: Columns3 },
};

const HANDS_ON: ReadonlySet<LabType> = new Set(["simulation", "topology", "threat-hunt"]);
const HANDS_ON_NAMES: [LabType, string][] = [
  ["simulation", "simulations"],
  ["topology", "topologies"],
  ["threat-hunt", "threat hunts"],
];

const domainLabel = (number: string) => number.replace(/\.0$/, "");

/** "7 simulations and topologies": the hands-on labs an exam has, by the kinds it has. */
function handsOnCount(labs: readonly PathLabInfo[]): string {
  const handsOn = labs.filter((l) => HANDS_ON.has(l.type));
  const names = HANDS_ON_NAMES.filter(([type]) => handsOn.some((l) => l.type === type)).map(([, name]) => name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : (names[0] ?? "labs");
  return `${handsOn.length} ${list}`;
}

/** "Simulation · 12 min", for a lab's line. */
export const labMeta = (lab: PathLabInfo) => `${TYPES[lab.type].label} · ${lab.minutes} min`;

/**
 * Every lab an exam has, domain by domain: the one closing each domain on the
 * path and all the rest. Any of them opens in the path's own lab stage; each
 * shows its latest score once played.
 */
export function LabLibrary({
  structure,
  results,
  onOpen,
  onBack,
}: {
  structure: PathStructure;
  /** Latest result per lab id, for those played. */
  results: ReadonlyMap<string, StopRecord>;
  onOpen: (lab: PathLabInfo) => void;
  onBack: () => void;
}) {
  const library = structure.library ?? [];
  const drills = library.filter((l) => !HANDS_ON.has(l.type)).length;
  const done = library.filter((l) => results.has(l.id)).length;
  const closing = new Set(structure.domains.map((d) => d.lab?.id).filter(Boolean));

  return (
    <div className="path-rise grid gap-6">
      <div className="grid gap-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          Hands-on labs · {structure.examCode}
        </span>
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Every lab for {structure.examName}
        </h1>
        <p className="text-muted-foreground">
          {handsOnCount(library)} that work like the exam&apos;s performance-based questions
          {drills > 0 && <>, and {drills} quick drills</>}. {done} of {library.length} done.
        </p>
      </div>

      <div className="glass grid gap-7 rounded-3xl p-5 sm:p-6">
        {structure.domains.map((d) => {
          const labs = library.filter((l) => l.domain === d.number);
          if (labs.length === 0) return null;
          const played = labs.filter((l) => results.has(l.id)).length;
          return (
            <section key={d.number} aria-labelledby={`labs-${d.number}`} className="grid gap-2.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <h2
                  id={`labs-${d.number}`}
                  aria-label={`Domain ${domainLabel(d.number)}: ${d.title}`}
                  className="min-w-0 font-medium leading-snug"
                >
                  <span className="mr-2 font-mono text-xs text-muted-foreground">{domainLabel(d.number)}</span>
                  {d.title}
                </h2>
                <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {played} of {labs.length} done
                </span>
              </div>
              <ul className="grid gap-2">
                {labs.map((lab) => {
                  const result = results.get(lab.id);
                  const { Icon } = TYPES[lab.type];
                  return (
                    <li key={lab.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(lab)}
                        aria-label={[
                          lab.title,
                          labMeta(lab),
                          closing.has(lab.id) && "closes the domain",
                          result && `done, ${result.c} of ${result.t}`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        className="group flex w-full min-w-0 items-center gap-3.5 rounded-2xl border border-border bg-card/60 p-3.5 text-left transition-[border-color,background-color] duration-150 hover:border-primary/50 hover:bg-primary/[0.03]"
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xl",
                            result ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="size-[18px]" aria-hidden />
                        </span>
                        {/* Titles wrap, never truncate: on a phone a cut-off title hides what the lab is. */}
                        <span className="min-w-0 flex-1">
                          <span className="block text-balance font-medium leading-snug">{lab.title}</span>
                          <span className="mt-1 block font-mono text-[11px] uppercase leading-relaxed tracking-wider text-muted-foreground">
                            {labMeta(lab)}
                            {closing.has(lab.id) && " · closes the domain"}
                          </span>
                        </span>
                        {result ? (
                          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-xs font-semibold tabular-nums text-success">
                            <Check className="size-3.5" strokeWidth={3} aria-hidden />
                            {result.c}/{result.t}
                          </span>
                        ) : (
                          <ArrowRight
                            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="justify-self-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        Back to my map
      </button>
    </div>
  );
}

/** After a lab from the library: the next one not played yet. */
export function NextLabCard({ lab, onOpen }: { lab: PathLabInfo; onOpen: () => void }) {
  const { Icon } = TYPES[lab.type];
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-3xl p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Next lab · {labMeta(lab)}
          </p>
          <p className="mt-1 text-balance font-display text-lg font-semibold leading-snug tracking-tight">{lab.title}</p>
        </div>
      </div>
      <Button size="lg" className="h-12 w-full px-6 text-base sm:w-auto" onClick={onOpen}>
        Open
        <ArrowRight />
      </Button>
    </div>
  );
}
