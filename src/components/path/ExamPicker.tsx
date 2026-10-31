"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { hasStarted } from "@/core/path/progress";
import { PATH_CERTS, type PathCert } from "@/core/path/types";
import { EXAM_NAMES, OBJECTIVE_TITLES } from "@/data/path/titles";
import { readLocalPath } from "./usePathProgress";
import { cn } from "@/lib/utils";

const EXAM_CODES: Record<PathCert, string> = {
  "security-plus-sy0-701": "SY0-701",
  "network-plus-n10-009": "N10-009",
  "a-plus-core1-220-1101": "220-1101",
  "a-plus-core2-220-1102": "220-1102",
};

/**
 * The only choice on CertBench: which exam. Four tiles, each straight into
 * that exam's path. A path already started on this device is offered first.
 */
export function ExamPicker({ surface, className }: { surface: string; className?: string }) {
  const [resume, setResume] = useState<{ cert: PathCert; stops: number } | null>(null);

  useEffect(() => {
    let best: { cert: PathCert; stops: number; at: number } | null = null;
    for (const cert of PATH_CERTS) {
      const local = readLocalPath(cert);
      if (!local || !hasStarted(local.progress)) continue;
      const stops = Object.values(local.progress.stops);
      const at = Math.max(0, ...stops.map((s) => s.at), ...Object.values(local.progress.items).map((i) => i.t));
      if (!best || at > best.at) best = { cert, stops: stops.length, at };
    }
    // Reading this device's storage can only happen after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (best) setResume({ cert: best.cert, stops: best.stops });
  }, []);

  return (
    <div className={cn("grid gap-3", className)}>
      {resume && (
        <Link
          href={`/path/${resume.cert}`}
          onClick={() => track("path_exam_picked", { cert: resume.cert, surface: `${surface}_resume` })}
          className="group flex items-center justify-between gap-4 rounded-2xl border border-primary/50 bg-primary/[0.07] px-5 py-4 transition-colors hover:bg-primary/[0.11]"
        >
          <span className="grid gap-0.5 text-left">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Pick up where you left off</span>
            <span className="font-display text-lg font-semibold tracking-tight">
              Your {EXAM_NAMES[resume.cert]} path
              {resume.stops > 0 && (
                <span className="font-sans text-sm font-normal text-muted-foreground">
                  {" "}· {resume.stops} {resume.stops === 1 ? "stop" : "stops"} done
                </span>
              )}
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3">
        {PATH_CERTS.map((cert) => (
          <Link
            key={cert}
            href={`/path/${cert}`}
            onClick={() => track("path_exam_picked", { cert, surface })}
            className="glass group grid gap-1 rounded-2xl px-4 py-4 text-left transition-[border-color,transform] hover:border-primary/60 active:scale-[0.99] sm:px-5 sm:py-5"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-display text-lg font-semibold tracking-tight sm:text-xl">{EXAM_NAMES[cert]}</span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:translate-x-0.5 group-hover:text-primary" />
            </span>
            <span className="font-mono text-xs text-muted-foreground">
              {EXAM_CODES[cert]} · {Object.keys(OBJECTIVE_TITLES[cert]).length} objectives
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
