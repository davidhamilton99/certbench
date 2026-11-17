import type { CSSProperties, ReactNode } from "react";
import { FlaskConical, Lock, Timer } from "lucide-react";
import type { ObjectiveStatus, PathStructure } from "@/core/path/types";
import { cn } from "@/lib/utils";

/** The exam rehearsal at the end of the map: its state, format and latest score. */
export interface MapRehearsal {
  state: LabState;
  questions: number;
  minutes: number;
  /** The latest rehearsal's score, once one is done. */
  score?: number;
}

/** Where a domain's lab stands: played, open to play, or part of Pro. */
export type LabState = "done" | "open" | "locked";

/** A tappable tile's key: an objective's code ("1.2"), a domain's lab ("lab:1.0"), or "rehearsal". */
export type MapTile = string;

export const labTileKey = (domain: string): MapTile => `lab:${domain}`;
export const REHEARSAL_TILE: MapTile = "rehearsal";

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
 * domain; then the exam rehearsal the path ends on. The objective in play
 * pulses; tiles a stop just changed pop in, one after another.
 *
 * Given `onSelect`, every tile is a button, the way a game's level map is:
 * the tapped one is ringed and `detail` opens under its row. (Replays showed
 * people tapping tiles again and again, and nothing happening.) Without it the
 * map is informative only.
 */
export function ExamMap({
  structure,
  statuses,
  current,
  fresh,
  labs,
  labsFresh,
  rehearsal,
  selected = null,
  onSelect,
  detail,
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
  /** The exam rehearsal that ends the path. */
  rehearsal?: MapRehearsal;
  /** The tile that's open. */
  selected?: MapTile | null;
  /** Tap a tile (null closes it). Makes every tile a button. */
  onSelect?: (tile: MapTile | null) => void;
  /** What opens under the selected tile's row. */
  detail?: ReactNode;
  className?: string;
}) {
  let order = 0;
  const tap = onSelect ? (key: MapTile) => () => onSelect(selected === key ? null : key) : undefined;
  return (
    <div className={cn("grid gap-4", className)}>
      {structure.domains.map((d, di) => {
        const open =
          selected !== null &&
          (selected === labTileKey(d.number) || d.objectives.some((o) => o.code === selected));
        return (
          <div key={d.number} className="grid gap-2">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="mr-2 font-mono text-xs text-muted-foreground">{d.number.replace(/\.0$/, "")}</span>
                <span className="font-medium">{d.title}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{d.weight}% of exam</span>
            </div>
            <ul className="flex flex-wrap gap-1.5" aria-label={`Domain ${d.number} objectives`}>
              {d.objectives.map((o) => {
                const status = statuses.get(o.code) ?? "new";
                const isCurrent = current?.has(o.code);
                const isFresh = fresh?.has(o.code);
                const style = isFresh ? ({ "--d": `${250 + order++ * 140}ms` } as CSSProperties) : undefined;
                return (
                  <Tile
                    key={o.code}
                    title={`${o.code} ${o.title}`}
                    label={`${o.code} ${o.title}: ${STATUS_LABEL[status]}${isCurrent ? ", up next" : ""}`}
                    style={style}
                    onTap={tap?.(o.code)}
                    selected={selected === o.code}
                    className={cn(
                      "flex h-7 min-w-10 items-center justify-center rounded-md px-1.5 font-mono text-[11px] font-semibold tabular-nums transition-colors",
                      isCurrent
                        ? `${CURRENT[status]} path-current ring-2 ring-primary ring-offset-2 ring-offset-background`
                        : TILE[status],
                      isFresh && "path-pop"
                    )}
                  >
                    {o.code}
                  </Tile>
                );
              })}
              {d.lab && labs?.has(d.number) && (
                <LabTile
                  state={labs.get(d.number)!}
                  title={d.lab.title}
                  domain={d.number}
                  style={labsFresh ? ({ "--d": `${300 + di * 160}ms` } as CSSProperties) : undefined}
                  fresh={labsFresh}
                  onTap={tap?.(labTileKey(d.number))}
                  selected={selected === labTileKey(d.number)}
                />
              )}
            </ul>
            {open && detail}
          </div>
        );
      })}
      {rehearsal && (
        <div className="grid gap-2 border-t border-border/70 pt-4">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium">Exam rehearsal</span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {rehearsal.questions} questions · {rehearsal.minutes} min
            </span>
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label="The path's last stop">
            <RehearsalTile
              rehearsal={rehearsal}
              style={
                labsFresh ? ({ "--d": `${300 + structure.domains.length * 160}ms` } as CSSProperties) : undefined
              }
              fresh={labsFresh}
              onTap={tap?.(REHEARSAL_TILE)}
              selected={selected === REHEARSAL_TILE}
            />
          </ul>
          {selected === REHEARSAL_TILE && detail}
        </div>
      )}
    </div>
  );
}

/** A tile: a list item, or a button in one when the map is tappable. */
function Tile({
  title,
  label,
  style,
  className,
  onTap,
  selected,
  children,
}: {
  title: string;
  label: string;
  style?: CSSProperties;
  className: string;
  onTap?: () => void;
  selected: boolean;
  children: ReactNode;
}) {
  if (!onTap) {
    return (
      <li title={title} aria-label={label} style={style} className={className}>
        {children}
      </li>
    );
  }
  return (
    <li style={style} className="flex">
      <button
        type="button"
        title={title}
        aria-label={label}
        aria-expanded={selected}
        onClick={onTap}
        className={cn(
          className,
          "cursor-pointer outline-none transition-[filter,box-shadow,transform] hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          selected && "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background"
        )}
      >
        {children}
      </button>
    </li>
  );
}

function RehearsalTile({
  rehearsal,
  style,
  fresh,
  onTap,
  selected,
}: {
  rehearsal: MapRehearsal;
  style?: CSSProperties;
  fresh?: boolean;
  onTap?: () => void;
  selected: boolean;
}) {
  const { state, score } = rehearsal;
  const Icon = state === "locked" ? Lock : Timer;
  const scored = score !== undefined && state !== "locked";
  return (
    <Tile
      title="Exam rehearsal"
      label={`Exam rehearsal: ${LAB_LABEL[state]}${scored ? `, latest score ${score}%` : ""}`}
      style={style}
      onTap={onTap}
      selected={selected}
      className={cn(
        "flex h-7 items-center gap-1 rounded-md px-2 font-mono text-[11px] font-semibold",
        LAB_TILE[state],
        fresh && "path-pop"
      )}
    >
      <Icon className="size-3" aria-hidden />
      {state === "locked" ? "Rehearsal · with Pro" : scored ? `Rehearsal · last ${score}%` : "Rehearsal"}
    </Tile>
  );
}

function LabTile({
  state,
  title,
  domain,
  style,
  fresh,
  onTap,
  selected,
}: {
  state: LabState;
  title: string;
  domain: string;
  style?: CSSProperties;
  fresh?: boolean;
  onTap?: () => void;
  selected: boolean;
}) {
  const Icon = state === "locked" ? Lock : FlaskConical;
  return (
    <Tile
      title={`Hands-on lab: ${title}`}
      label={`Domain ${domain.replace(/\.0$/, "")} hands-on lab, ${title}: ${LAB_LABEL[state]}`}
      style={style}
      onTap={onTap}
      selected={selected}
      className={cn(
        "flex h-7 items-center gap-1 rounded-md px-2 font-mono text-[11px] font-semibold",
        LAB_TILE[state],
        fresh && "path-pop"
      )}
    >
      <Icon className="size-3" aria-hidden />
      Lab
    </Tile>
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
