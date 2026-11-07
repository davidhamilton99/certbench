import type { CSSProperties } from "react";
import { FlaskConical, Lock } from "lucide-react";
import type { ObjectiveStatus, PathStructure } from "@/core/path/types";
import { cn } from "@/lib/utils";

/** Where a domain's lab stands: played, open to play, or part of Pro. */
export type LabState = "done" | "open" | "locked";

const LAB_TILE: Record<LabState, string> = {
  done: "bg-success text-success-foreground",
  open: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/50",
  locked: "border border-dashed border-border text-muted-foreground",
};

const LAB_LABEL: Record<LabState, string> = {
  done: "done",
  open: "open",
  locked: "part of Pro",
};

const TILE: Record<ObjectiveStatus, string> = {
  got: "bg-success text-success-foreground",
  missed: "bg-warning text-warning-foreground",
  new: "bg-muted/50 text-muted-foreground ring-1 ring-inset ring-border",
};

/** The objective up next: lit in the accent with an outer ring that pulses. */
const CURRENT: Record<ObjectiveStatus, string> = {
  got: "bg-success text-success-foreground",
  missed: "bg-warning text-warning-foreground",
  new: "bg-primary/15 text-primary",
};

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  got: "covered",
  missed: "a miss to revisit",
  new: "not started",
};

/**
 * The whole exam at a glance: one row per domain, one tile per objective,
 * coloured by where the learner stands, and the hands-on lab that closes the
 * domain. The objective in play pulses; tiles a stop just changed pop in, one
 * after another. Informative only — the path, not the map, decides what comes
 * next.
 */
export function ExamMap({
  structure,
  statuses,
  current,
  fresh,
  labs,
  labsFresh,
  className,
}: {
  structure: PathStructure;
  statuses: Map<string, ObjectiveStatus>;
  /** Objectives of the stop that's next (or in play). */
  current?: ReadonlySet<string>;
  /** Objectives whose status just changed — animated in. */
  fresh?: ReadonlySet<string>;
  /** Each domain's lab, by domain number. A domain without one shows none. */
  labs?: ReadonlyMap<string, LabState>;
  /** Pop the lab tiles in, one domain after another (they just opened). */
  labsFresh?: boolean;
  className?: string;
}) {
  let order = 0;
  return (
    <div className={cn("grid gap-4", className)}>
      {structure.domains.map((d, di) => (
        <div key={d.number} className="grid gap-2">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="min-w-0">
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                {d.number.replace(/\.0$/, "")}
              </span>
              <span className="font-medium">{d.title}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {d.weight}% of exam
            </span>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label={`Domain ${d.number} objectives`}>
            {d.objectives.map((o) => {
              const status = statuses.get(o.code) ?? "new";
              const isCurrent = current?.has(o.code);
              const isFresh = fresh?.has(o.code);
              const style = isFresh ? ({ "--d": `${250 + order++ * 140}ms` } as CSSProperties) : undefined;
              return (
                <li
                  key={o.code}
                  title={`${o.code} ${o.title}`}
                  aria-label={`${o.code} ${o.title}: ${STATUS_LABEL[status]}${isCurrent ? ", up next" : ""}`}
                  style={style}
                  className={cn(
                    "flex h-7 min-w-10 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold tabular-nums transition-colors",
                    isCurrent
                      ? `${CURRENT[status]} path-current ring-2 ring-primary ring-offset-2 ring-offset-background`
                      : TILE[status],
                    isFresh && "path-pop"
                  )}
                >
                  {o.code}
                </li>
              );
            })}
            {d.lab && labs?.has(d.number) && (
              <LabTile
                state={labs.get(d.number)!}
                title={d.lab.title}
                domain={d.number}
                style={labsFresh ? ({ "--d": `${300 + di * 160}ms` } as CSSProperties) : undefined}
                fresh={labsFresh}
              />
            )}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LabTile({
  state,
  title,
  domain,
  style,
  fresh,
}: {
  state: LabState;
  title: string;
  domain: string;
  style?: CSSProperties;
  fresh?: boolean;
}) {
  const Icon = state === "locked" ? Lock : FlaskConical;
  return (
    <li
      title={`Hands-on lab: ${title}`}
      aria-label={`Domain ${domain.replace(/\.0$/, "")} hands-on lab, ${title}: ${LAB_LABEL[state]}`}
      style={style}
      className={cn(
        "flex h-7 items-center gap-1 rounded-md px-2 font-mono text-[11px] font-semibold",
        LAB_TILE[state],
        fresh && "path-pop"
      )}
    >
      <Icon className="size-3" aria-hidden />
      Lab
    </li>
  );
}

export function MapLegend({ className, labs }: { className?: string; labs?: "open" | "locked" }) {
  return (
    <div className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground", className)}>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2.5 rounded-[3px] bg-success" /> Covered
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2.5 rounded-[3px] bg-warning" /> A miss, comes back later
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="size-2.5 rounded-[3px] bg-muted ring-1 ring-inset ring-border" /> Not started
      </span>
      {labs && (
        <span className="inline-flex items-center gap-1.5">
          <FlaskConical className="size-3" aria-hidden />
          {labs === "open" ? "Hands-on lab" : "Hands-on lab, with Pro"}
        </span>
      )}
    </div>
  );
}
