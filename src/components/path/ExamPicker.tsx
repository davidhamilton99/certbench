"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { track } from "@/lib/analytics";
import { hasStarted } from "@/core/path/progress";
import { PATH_CERTS, type PathCert } from "@/core/path/types";
import { EXAM_CODES, LAST_EXAM_DAY, examVersions, longDate } from "@/core/path/versions";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { readLocalPath } from "./local-path";
import { carryOverPreV15Path } from "./carry-over";
import { cn } from "@/lib/utils";

/** One tile per exam. An exam taught in two versions gets one tile that asks which. */
const TILES: PathCert[][] = (() => {
  const placed = new Set<string>();
  const tiles: PathCert[][] = [];
  for (const cert of PATH_CERTS) {
    if (placed.has(cert)) continue;
    const versions = examVersions(cert);
    const tile = versions.length ? [...versions] : [cert];
    for (const c of tile) placed.add(c);
    tiles.push(tile);
  }
  return tiles;
})();

const objectiveCount = (cert: PathCert) =>
  `${Object.keys(OBJECTIVE_TITLES[cert]).length} ${usesOfficialObjectiveNumbers(cert) ? "objectives" : "topics"}`;

/** What a version's row says: when it stops, or that it's the newest. */
function versionNote(cert: PathCert): string {
  const last = LAST_EXAM_DAY[cert];
  return last ? `Can be taken until ${longDate(last)}` : "The newest version";
}

const tileClass =
  "glass group grid gap-1.5 rounded-2xl px-4 py-4 text-left transition-[border-color,transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-[0_24px_60px_-30px_var(--primary)] active:translate-y-0 active:scale-[0.99] sm:px-6 sm:py-5";

/** The arrow in a small round well that fills with ink on hover. */
const wellClass =
  "flex size-7 shrink-0 items-center justify-center rounded-full bg-foreground/[0.06] text-muted-foreground transition-colors group-hover:bg-foreground group-hover:text-background";

/**
 * The only choice on CertBench: which exam. A tile per exam, each straight into
 * that exam's path; an exam with two versions asks which one first. A path
 * already started on this device is offered first. `upgraded`: just paid, so
 * the path opens with the unlock moment.
 */
export function ExamPicker({
  surface,
  upgraded = false,
  className,
}: {
  surface: string;
  upgraded?: boolean;
  className?: string;
}) {
  const [resume, setResume] = useState<{ cert: PathCert; stops: number } | null>(null);
  /** The versioned exam whose versions are showing, by its newest version's slug. */
  const [open, setOpen] = useState<PathCert | null>(null);
  const flag = upgraded ? "?upgraded=1" : "";

  // Reading this device's storage can only happen after mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // An A+ path begun before 220-1201/1202 is offered under its exam today.
      await Promise.all(PATH_CERTS.map(carryOverPreV15Path));
      let best: { cert: PathCert; stops: number; at: number } | null = null;
      for (const cert of PATH_CERTS) {
        const local = readLocalPath(cert);
        if (!local || !hasStarted(local.progress)) continue;
        const stops = Object.values(local.progress.stops);
        const at = Math.max(0, ...stops.map((s) => s.at), ...Object.values(local.progress.items).map((i) => i.t));
        if (!best || at > best.at) best = { cert, stops: stops.length, at };
      }
      if (best && !cancelled) setResume({ cert: best.cert, stops: best.stops });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openIndex = open ? TILES.findIndex((t) => t[0] === open) : -1;
  // The versions open under the tile's own row, spanning both columns.
  const rowEnd = openIndex < 0 ? -1 : Math.min(openIndex | 1, TILES.length - 1);

  const cells: ReactNode[] = [];
  TILES.forEach((tile, i) => {
    const [first] = tile;
    if (tile.length === 1) {
      cells.push(
        <Link
          key={first}
          href={`/path/${first}${flag}`}
          onClick={() => track("path_exam_picked", { cert: first, surface })}
          className={tileClass}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold tracking-[-0.02em] sm:text-[1.375rem]">{EXAM_NAMES[first]}</span>
            <span className={wellClass}>
              <ArrowRight className="size-3.5" />
            </span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {EXAM_CODES[first]} · {objectiveCount(first)}
          </span>
        </Link>
      );
    } else {
      const isOpen = open === first;
      cells.push(
        <button
          key={first}
          type="button"
          aria-expanded={isOpen}
          aria-controls={`exam-versions-${first}`}
          onClick={() => {
            setOpen(isOpen ? null : first);
            if (!isOpen) track("path_versions_opened", { exam: EXAM_NAMES[first], surface });
          }}
          className={cn(tileClass, isOpen && "border-primary/60 hover:translate-y-0")}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-lg font-semibold tracking-[-0.02em] sm:text-[1.375rem]">{EXAM_NAMES[first]}</span>
            <span className={cn(wellClass, isOpen && "bg-foreground text-background")}>
              <ChevronDown className={cn("size-3.5 transition-transform", isOpen && "rotate-180")} />
            </span>
          </span>
          <span className="font-mono text-xs text-muted-foreground">{tile.map((c) => EXAM_CODES[c]).join(" · ")}</span>
        </button>
      );
    }
    if (i === rowEnd && open) cells.push(<VersionChoice key="versions" versions={TILES[openIndex]} flag={flag} surface={surface} />);
  });

  return (
    <div className={cn("grid gap-3", className)}>
      {resume && (
        <Link
          href={`/path/${resume.cert}${flag}`}
          onClick={() => track("path_exam_picked", { cert: resume.cert, surface: `${surface}_resume` })}
          className="group flex items-center justify-between gap-4 rounded-2xl border border-primary/50 bg-primary/[0.07] px-5 py-4 transition-colors hover:bg-primary/[0.11]"
        >
          <span className="grid gap-0.5 text-left">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Pick up where you left off</span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Your {EXAM_NAMES[resume.cert]} path
              <span className="font-sans text-sm font-normal text-muted-foreground">
                {examVersions(resume.cert).length > 0 && <> · {EXAM_CODES[resume.cert]}</>}
                {resume.stops > 0 && (
                  <>
                    {" "}· {resume.stops} {resume.stops === 1 ? "stop" : "stops"} done
                  </>
                )}
              </span>
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3">{cells}</div>
    </div>
  );
}

/** Which version of an exam: a row per version, newest first, and how to tell. */
function VersionChoice({ versions, flag, surface }: { versions: PathCert[]; flag: string; surface: string }) {
  const [newest] = versions;
  const retiring = versions.find((c) => LAST_EXAM_DAY[c]);
  return (
    <div
      id={`exam-versions-${newest}`}
      className="path-rise col-span-2 grid gap-2 rounded-2xl border border-primary/40 bg-primary/[0.04] p-3 sm:p-4"
    >
      <p className="px-1 text-sm font-medium">Which {EXAM_NAMES[newest]} exam are you taking?</p>
      {versions.map((cert) => (
        <Link
          key={cert}
          href={`/path/${cert}${flag}`}
          onClick={() => track("path_exam_picked", { cert, surface })}
          className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/60"
        >
          <span className="grid gap-0.5">
            <span className="font-display text-base font-semibold tracking-tight">{EXAM_CODES[cert]}</span>
            <span className="text-xs text-muted-foreground">
              {versionNote(cert)} · {objectiveCount(cert)}
            </span>
          </span>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      ))}
      {retiring && (
        <p className="px-1 text-xs text-muted-foreground">
          Sitting it in English after {longDate(LAST_EXAM_DAY[retiring]!)}? Then it&apos;s{" "}
          <span className="whitespace-nowrap">{EXAM_CODES[newest]}</span>.
        </p>
      )}
    </div>
  );
}
