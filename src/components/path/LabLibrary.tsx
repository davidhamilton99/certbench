"use client";

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PathLabInfo, PathStructure, StopRecord } from "@/core/path/types";
import { cn } from "@/lib/utils";
import { domainLabel, handsOnCount, HANDS_ON_TYPES as HANDS_ON, LAB_TYPES, labMeta } from "./lab-types";

export { labMeta } from "./lab-types";

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
        <span className="cb-label text-muted-foreground">{structure.examCode}</span>
        <h1 className="cb-display text-balance text-[1.875rem] sm:text-[2.5rem]">
          Hands-on labs for {structure.examName}
        </h1>
        <p className="leading-relaxed text-muted-foreground">
          There are {handsOnCount(library)} that work like the exam&apos;s performance-based questions
          {drills > 0 && (
            <>
              , and {drills} short {drills === 1 ? "drill" : "drills"}
            </>
          )}
          . You have completed {done} of {library.length}.
        </p>
      </div>

      <div className="grid gap-9">
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
                <span className="shrink-0 text-[0.8125rem] tabular-nums text-muted-foreground">
                  {played} of {labs.length} complete
                </span>
              </div>
              <ul className="grid gap-2">
                {labs.map((lab) => {
                  const result = results.get(lab.id);
                  const { Icon } = LAB_TYPES[lab.type];
                  return (
                    <li key={lab.id} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => onOpen(lab)}
                        aria-label={[
                          lab.title,
                          labMeta(lab),
                          closing.has(lab.id) && "the lab that ends the domain",
                          result && `done, ${result.c} of ${result.t}`,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                        className="glass group flex w-full min-w-0 items-center gap-3.5 rounded-md p-3.5 text-left transition-[border-color] duration-200 hover:border-primary/60 sm:p-4"
                      >
                        <span
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-md",
                            result ? "bg-success/10 text-success" : "bg-primary/[0.08] text-primary"
                          )}
                        >
                          <Icon className="size-[18px]" aria-hidden />
                        </span>
                        {/* Titles wrap, never truncate: on a phone a cut-off title hides what the lab is. */}
                        <span className="min-w-0 flex-1">
                          <span className="block text-balance font-medium leading-snug">{lab.title}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {labMeta(lab)}.{closing.has(lab.id) && " This lab ends the domain on your study path."}
                          </span>
                        </span>
                        {result ? (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-medium tabular-nums text-success">
                            <Check className="size-3.5" strokeWidth={3} aria-hidden />
                            {result.c} of {result.t}
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
        Return to the study path
      </button>
    </div>
  );
}

/** After a lab from the library: the next one not played yet. */
export function NextLabCard({ lab, onOpen }: { lab: PathLabInfo; onOpen: () => void }) {
  const { Icon } = LAB_TYPES[lab.type];
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary/[0.08] text-primary">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Your next lab. {labMeta(lab)}.</p>
          <p className="mt-1 text-balance font-display text-lg font-semibold leading-snug tracking-tight">{lab.title}</p>
        </div>
      </div>
      <Button size="lg" className="h-12 w-full px-6 text-base sm:w-auto" onClick={onOpen}>
        Open the lab
        <ArrowRight />
      </Button>
    </div>
  );
}
