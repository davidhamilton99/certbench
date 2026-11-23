import { useId, type ReactNode } from "react";
import { Check, ChevronDown } from "lucide-react";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import type { ObjectiveStatus, PathStructure } from "@/core/path/types";
import { cn } from "@/lib/utils";

/** The practice exam at the end of the outline: its state, format and latest score. */
export interface MapRehearsal {
  /**
   * "done" and "open" are a Pro learner's. Without Pro the row says that one
   * practice exam is free, whether "free" or "locked" is passed: every exam
   * has one on its public page, so the row never reads as Pro only.
   */
  state: LabState;
  questions: number;
  minutes: number;
  /** The latest practice exam's score, once one is done. */
  score?: number;
}

/**
 * Where a domain's lab stands for this learner: done, open to do, free for
 * everyone on the exam's public lab page, or part of Pro.
 */
export type LabState = "done" | "open" | "free" | "locked";

/** A row's key: an objective's code ("1.2"), a domain's lab ("lab:1.0"), or "rehearsal". */
export type MapTile = string;

export const labTileKey = (domain: string): MapTile => `lab:${domain}`;
export const REHEARSAL_TILE: MapTile = "rehearsal";

/** Shown at the end of a lab's row. */
const LAB_STATUS: Record<LabState, string> = {
  done: "Complete",
  open: "Available",
  free: "Free",
  locked: "Included with Pro",
};

/** Shown at the end of the practice exam's row for a learner without Pro. */
const EXAM_FREE = "One practice exam is free.";

/**
 * Where an objective stands in the outline. "Complete" is kept for an
 * objective whose own step is finished with no question left to review. One
 * that has only been touched by other questions (the introductory questions,
 * the checkpoint, a practice exam) is "Started": an instructor who checks the
 * outline against the syllabus must not find an objective marked complete that
 * has not been studied.
 */
type Standing = "new" | "started" | "review" | "complete";

/** `stepDone` is null when the caller does not say which steps are finished. */
export function objectiveStanding(status: ObjectiveStatus, stepDone: boolean | null): Standing {
  if (stepDone === null) return status === "got" ? "complete" : status === "missed" ? "review" : "new";
  if (stepDone) return status === "missed" ? "review" : "complete";
  return status === "new" ? "new" : "started";
}

const STANDING_TEXT: Record<Standing, string> = {
  new: "Not started",
  started: "Started",
  review: "To review",
  complete: "Complete",
};

const STANDING_CLASS: Record<Standing, string> = {
  new: "text-muted-foreground",
  started: "text-foreground",
  review: "text-warning-ink",
  complete: "text-success",
};

const label = (n: string) => n.replace(/\.0$/, "");

/** Read between the parts of a row by a screen reader, which sees no columns. */
const Pause = () => <span className="sr-only">, </span>;

/**
 * The exam as a course outline: a section for each domain, a row for each
 * objective saying where the learner stands, then the hands-on lab that closes
 * the domain; and at the end the practice exam the path finishes with. It is
 * set out the way a course's module list is, so it reads as a syllabus and
 * not as a board.
 *
 * Given `onSelect`, every row is a button: pressing one opens `detail` beneath
 * it. (Replays showed people pressing the old grid again and again, and
 * nothing happening.) Without it the outline is informative only.
 *
 * A row's accessible name is the text it shows, in the order it shows it: a
 * person who speaks the words on a row to a voice control, or who is read the
 * row by a screen reader, gets the same words as a person looking at it.
 */
export function ExamMap({
  structure,
  statuses,
  doneStops,
  current,
  labs,
  rehearsal,
  selected = null,
  onSelect,
  onLabIntent,
  detail,
  className,
}: {
  structure: PathStructure;
  statuses: Map<string, ObjectiveStatus>;
  /**
   * The ids of the steps that are finished. An objective's own step has the
   * objective's code as its id. Without it the outline cannot tell an objective
   * that has been studied from one that other questions have touched, and
   * calls both "Complete".
   */
  doneStops?: ReadonlySet<string>;
  /**
   * Objectives of the step that's next (or in hand): the only rows that are
   * tinted. One tint means "next"; what a step has just changed is said in the
   * sentence above the outline, and no row is tinted or moved for it.
   */
  current?: ReadonlySet<string>;
  /** Each domain's lab, by domain number. A domain without one shows none. */
  labs?: ReadonlyMap<string, LabState>;
  /** The practice exam that ends the path. */
  rehearsal?: MapRehearsal;
  /** The row that's open. */
  selected?: MapTile | null;
  /** Press a row (null closes it). Makes every row a button. */
  onSelect?: (tile: MapTile | null) => void;
  /**
   * Called with a lab's id when the lab's row is hovered or takes the focus,
   * so that a page on which the lab opens can begin to fetch what the lab
   * needs before it is pressed. Only rows that can be pressed call it.
   */
  onLabIntent?: (labId: string) => void;
  /** What opens beneath the selected row. */
  detail?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const tap = onSelect ? (key: MapTile) => () => onSelect(selected === key ? null : key) : undefined;
  const standingOf = (code: string) =>
    objectiveStanding(statuses.get(code) ?? "new", doneStops ? doneStops.has(code) : null);
  return (
    <div className={cn("grid gap-7", className)}>
      {structure.domains.map((d) => {
        const done = d.objectives.filter((o) => standingOf(o.code) === "complete").length;
        const headingId = `${id}-domain-${d.number}`;
        const labId = d.lab?.id;
        return (
          <section key={d.number} className="grid gap-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-foreground/70 pb-2">
              <h3 id={headingId} className="min-w-0 text-small font-semibold">
                Domain {label(d.number)}: {d.title}
              </h3>
              <p className="shrink-0 text-note tabular-nums text-muted-foreground">
                {d.weight}% of the exam. {done} of {d.objectives.length} complete.
              </p>
            </div>
            <ul aria-labelledby={headingId} className="divide-y divide-border">
              {d.objectives.map((o) => {
                const standing = standingOf(o.code);
                const isCurrent = !!current?.has(o.code);
                // The step that is next says so, whatever other questions have touched it.
                const next = isCurrent && (standing === "new" || standing === "started");
                return (
                  <Row
                    key={o.code}
                    onTap={tap?.(o.code)}
                    selected={selected === o.code}
                    detail={selected === o.code ? detail : null}
                    highlight={isCurrent}
                  >
                    <span className="w-8 shrink-0 font-mono text-note tabular-nums text-muted-foreground">{o.code}</span>{" "}
                    <span className={cn("min-w-0 flex-1 text-small", isCurrent && "font-semibold")}>{o.title}</span>
                    <Pause />
                    {next ? (
                      <span className="shrink-0 text-note font-medium text-primary">
                        Next<span className="sr-only"> step</span>
                      </span>
                    ) : (
                      <Status className={STANDING_CLASS[standing]} check={standing === "complete"}>
                        {STANDING_TEXT[standing]}
                      </Status>
                    )}
                  </Row>
                );
              })}
              {d.lab && labs?.has(d.number) && (
                <Row
                  onTap={tap?.(labTileKey(d.number))}
                  onIntent={onLabIntent && labId ? () => onLabIntent(labId) : undefined}
                  selected={selected === labTileKey(d.number)}
                  detail={selected === labTileKey(d.number) ? detail : null}
                >
                  <span className="w-8 shrink-0 text-note text-muted-foreground">Lab</span>
                  <Pause />
                  <TitleAndStatus title={d.lab.title}>
                    <LabStatus state={labs.get(d.number)!} />
                  </TitleAndStatus>
                </Row>
              )}
            </ul>
          </section>
        );
      })}
      {rehearsal && (
        <section className="grid gap-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-foreground/70 pb-2">
            <h3 id={`${id}-exam`} className="text-small font-semibold">
              Practice exam
            </h3>
            <p className="shrink-0 text-note tabular-nums text-muted-foreground">
              {rehearsal.questions} questions in {rehearsal.minutes} minutes.
            </p>
          </div>
          <ul aria-labelledby={`${id}-exam`} className="divide-y divide-border">
            <Row
              onTap={tap?.(REHEARSAL_TILE)}
              selected={selected === REHEARSAL_TILE}
              detail={selected === REHEARSAL_TILE ? detail : null}
            >
              <span className="w-8 shrink-0 text-note text-muted-foreground">Exam</span>
              <Pause />
              <TitleAndStatus title="Full-length timed practice exam">
                <ExamStatus rehearsal={rehearsal} />
              </TitleAndStatus>
            </Row>
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * A row's standing, at its end. The words and the mark share the row's
 * baseline: the mark is set a little below the middle of its box, so that
 * "Complete" sits on the same line as the title beside it.
 */
function Status({ className, check = false, children }: { className?: string; check?: boolean; children: ReactNode }) {
  return (
    <span className={cn("inline-flex shrink-0 items-baseline gap-1 text-note", className)}>
      {check && <Check className="size-3.5 translate-y-0.5" strokeWidth={2.5} aria-hidden />}
      {children}
    </span>
  );
}

/**
 * A lab's or the practice exam's title with its status. These statuses run to
 * several words ("Included with Pro", "One practice exam is free."), so on a
 * row too narrow for both the status goes under the title instead of pressing
 * the title into three short lines.
 */
function TitleAndStatus({ title, children }: { title: string; children: ReactNode }) {
  return (
    <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
      <span className="text-small">{title}</span>
      <Pause />
      {children}
    </span>
  );
}

function LabStatus({ state }: { state: LabState }) {
  return (
    <Status
      check={state === "done"}
      className={
        state === "done"
          ? "text-success"
          : state === "open"
            ? "font-medium text-primary"
            : state === "free"
              ? "text-foreground"
              : "text-muted-foreground"
      }
    >
      {LAB_STATUS[state]}
    </Status>
  );
}

function ExamStatus({ rehearsal }: { rehearsal: MapRehearsal }) {
  const pro = rehearsal.state === "done" || rehearsal.state === "open";
  if (!pro) return <Status className="text-foreground">{EXAM_FREE}</Status>;
  if (rehearsal.score !== undefined) {
    return <Status className="tabular-nums text-muted-foreground">Last result: {rehearsal.score}%</Status>;
  }
  return <LabStatus state={rehearsal.state} />;
}

/** A row of the outline: a list item, or a button in one when rows can be pressed. */
function Row({
  onTap,
  onIntent,
  selected,
  detail,
  highlight = false,
  children,
}: {
  onTap?: () => void;
  /** The row is hovered or takes the focus: it is about to be pressed, or may be. */
  onIntent?: () => void;
  selected: boolean;
  /** What opens beneath this row while it is selected. */
  detail?: ReactNode;
  /** The row of the step that is next. */
  highlight?: boolean;
  children: ReactNode;
}) {
  // The tint reaches a little past the text on both sides, and the text keeps its edge.
  const row = "-mx-2 flex items-baseline gap-3 px-3 py-2.5 text-left";
  if (!onTap) {
    return <li className={cn(row, highlight && "bg-tint-selected")}>{children}</li>;
  }
  return (
    <li>
      <button
        type="button"
        aria-expanded={selected}
        onClick={onTap}
        onPointerEnter={onIntent}
        onFocus={onIntent}
        className={cn(
          row,
          "w-[calc(100%+1rem)] transition-[background-color] focus-visible:-outline-offset-2",
          highlight || selected ? "bg-tint-selected hover:bg-tint-press" : "hover:bg-tint-hover"
        )}
      >
        {children}
        <ChevronDown
          aria-hidden
          className={cn("size-4 shrink-0 self-center text-muted-foreground transition-transform", selected && "rotate-180")}
        />
      </button>
      {selected && detail && <div className="pb-3 pt-1">{detail}</div>}
    </li>
  );
}

/**
 * A sentence under the outline saying what is free and what Pro adds. The rows
 * state their own status, so no key to colours is needed.
 */
export function MapLegend({ className, labs }: { className?: string; labs?: "open" | "locked" }) {
  if (labs !== "locked") return null;
  return (
    <p className={cn("text-small text-muted-foreground", className)}>
      One practice exam and {FREE_LAB_COUNT} labs are free. Further labs and practice exams are included with Pro.
    </p>
  );
}
