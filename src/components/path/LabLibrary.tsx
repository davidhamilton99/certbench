"use client";

import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PathLabInfo, PathStructure, StopRecord } from "@/core/path/types";
import { cn } from "@/lib/utils";
import { domainLabel, handsOnCount, HANDS_ON_TYPES as HANDS_ON, LAB_TYPES, labMeta } from "./lab-types";

export { labMeta } from "./lab-types";

/**
 * Every lab an exam has, domain by domain: the one that closes each domain on
 * the study path and all the rest. Any of them opens on the study path's own
 * lab screen; each shows its latest score once it has been completed.
 *
 * A row is named by the words printed on it, in the order they are printed, so
 * that a person who is read the row by a screen reader, or who speaks its
 * title to a voice control, gets the same words as a person who looks at it.
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
        <p className="cb-label text-muted-foreground">{structure.examCode}</p>
        {/* The screen's title. It takes the focus when the list opens. */}
        <h1 tabIndex={-1} className="cb-section">
          Hands-on labs for {structure.examName}
        </h1>
        <p className="text-body text-muted-foreground">
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
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                {/* Set out as the course outline sets out a domain, in the same words. */}
                <h2 id={`labs-${d.number}`} className="min-w-0 text-small font-semibold">
                  Domain {domainLabel(d.number)}: {d.title}
                </h2>
                <p className="shrink-0 text-note tabular-nums text-muted-foreground">
                  {played} of {labs.length} complete.
                </p>
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
                        className="glass flex w-full min-w-0 items-center gap-3.5 rounded-md p-3.5 text-left transition-[border-color,background-color] duration-150 hover:border-primary hover:bg-tint-hover active:bg-tint-press sm:p-4"
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-xs",
                            result ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        {/* Titles wrap and are never cut short: on a phone a cut title hides what the lab is. */}
                        <span className="min-w-0 flex-1">
                          <span className="block text-small font-medium">{lab.title}</span>
                          {/* Read between the title and the line under it, which a screen reader does not see as two lines. */}
                          <span className="sr-only">. </span>
                          <span className="mt-1 block text-note text-muted-foreground">
                            {labMeta(lab)}.{closing.has(lab.id) && " This lab ends the domain on your study path."}
                          </span>
                        </span>
                        {result && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-note font-medium tabular-nums text-success">
                            <Check className="size-3.5" strokeWidth={3} aria-hidden />
                            <span className="sr-only"> Completed, with a score of </span>
                            {result.c} of {result.t}
                          </span>
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

      <button type="button" onClick={onBack} className="cb-link cb-tap justify-self-center text-small">
        Return to the study path
      </button>
    </div>
  );
}

/** After a lab from the list: the next one that has not been completed yet. */
export function NextLabCard({ lab, onOpen }: { lab: PathLabInfo; onOpen: () => void }) {
  const { Icon } = LAB_TYPES[lab.type];
  return (
    <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-5 sm:p-6">
      <div className="flex min-w-0 flex-1 basis-56 items-center gap-3.5">
        <span
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary"
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-small text-muted-foreground">Your next lab. {labMeta(lab)}.</p>
          <h2 className="cb-statement mt-1">{lab.title}</h2>
        </div>
      </div>
      <Button size="lg" className="w-full sm:w-auto" onClick={onOpen}>
        Open the lab
        <ArrowRight aria-hidden />
      </Button>
    </div>
  );
}
