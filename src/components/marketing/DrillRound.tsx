"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, X } from "lucide-react";
import type { DrillTool, ItemStatus } from "@/core/drill-rounds/drill-rounds";
import { track } from "@/lib/analytics";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { cn } from "@/lib/utils";
import type { DrillRounds } from "./useDrillRounds";

export interface MapTile {
  id: string;
  /** Shown on the tile (labels and skills); always in the tile's tooltip. */
  label: string;
  /** More for the tooltip, for example the protocol behind a port number. */
  name?: string;
  status: ItemStatus;
  /** The second line of a skill tile, for example "8 of 10 correct". */
  detail?: string;
}

/**
 * labels: short facts with visible labels (35 ports)
 * dots:   a large deck as a compact grid, named in a tooltip (300 and more acronyms)
 * skills: a few skills with a label and a score each (subnetting)
 */
export type MapVariant = "labels" | "dots" | "skills";

/**
 * A tile's mark. It is never carried by colour alone: a tile with words on it
 * also shows a check or a cross, and a dot is filled when answered correctly,
 * ringed when missed and faint when not seen yet.
 */
const TILE_TONE: Record<ItemStatus, string> = {
  got: "border-success/50 bg-success/10 text-success",
  missed: "border-destructive/50 bg-destructive/10 text-destructive",
  new: "border-border text-muted-foreground",
};

const DOT_TONE: Record<ItemStatus, string> = {
  got: "border-success bg-success",
  missed: "border-2 border-destructive",
  new: "border-border bg-foreground/[0.05]",
};

const STATUS_WORD: Record<ItemStatus, string> = {
  got: "answered correctly",
  missed: "missed",
  new: "not seen yet",
};

/** Room for the public pages' sticky header when the result scrolls into view. */
const HEADER_CLEARANCE = 72;

/** The check or the cross on a tile that has words. Decoration for a screen reader: the status is said in words. */
function StatusMark({ status, className }: { status: ItemStatus; className?: string }) {
  if (status === "got") return <Check aria-hidden strokeWidth={3} className={cn("size-3 shrink-0", className)} />;
  if (status === "missed") return <X aria-hidden strokeWidth={3} className={cn("size-3 shrink-0", className)} />;
  return null;
}

export function ProgressMap({ tiles, variant }: { tiles: MapTile[]; variant: MapVariant }) {
  return (
    <ul
      aria-label="Your progress"
      className={cn(
        "grid",
        // Wide enough for the longest port ("1812/1813") beside its mark, with room to spare on each side.
        variant === "labels" && "grid-cols-[repeat(auto-fill,minmax(5.75rem,1fr))] gap-1 sm:gap-1.5",
        variant === "dots" && "grid-cols-[repeat(auto-fill,minmax(0.75rem,1fr))] gap-1",
        variant === "skills" && "grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2"
      )}
    >
      {tiles.map((t) => (
        <li
          key={t.id}
          title={`${t.label}${t.name ? ` ${t.name}` : ""}: ${STATUS_WORD[t.status]}`}
          className={cn(
            "rounded-xs border",
            variant === "dots" ? DOT_TONE[t.status] : TILE_TONE[t.status],
            variant === "labels" &&
              "flex items-center justify-center gap-0.5 py-1.5 font-mono text-xs tracking-tight sm:gap-1 sm:py-2 sm:tracking-normal",
            variant === "dots" && "aspect-square",
            variant === "skills" && "grid gap-0.5 px-3 py-2.5"
          )}
        >
          {variant === "labels" && (
            <>
              <StatusMark status={t.status} className="size-2.5 sm:size-3" />
              {t.label}
              <span className="sr-only">: {STATUS_WORD[t.status]}</span>
            </>
          )}
          {variant === "skills" && (
            <>
              <span className="flex items-center gap-1.5 text-small font-medium">
                <StatusMark status={t.status} />
                {t.label}
              </span>
              <span className="text-note">{t.detail ?? "Not tried yet"}</span>
            </>
          )}
          {variant === "dots" && <span className="sr-only">{`${t.label}: ${STATUS_WORD[t.status]}`}</span>}
        </li>
      ))}
    </ul>
  );
}

const LEGEND: Record<"facts" | "skills", Record<ItemStatus, string>> = {
  facts: { got: "Answered correctly", missed: "Missed, and asked again first", new: "Not seen yet" },
  skills: { got: "Secure (80% or more)", missed: "Needs more practice", new: "Not tried yet" },
};

function Legend({ variant }: { variant: MapVariant }) {
  const words = LEGEND[variant === "skills" ? "skills" : "facts"];
  return (
    <ul aria-label="What the marks mean" className="flex flex-wrap gap-x-4 gap-y-1 text-note text-muted-foreground">
      {(["got", "missed", "new"] as const).map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "flex size-3.5 shrink-0 items-center justify-center rounded-xs border",
              variant === "dots" ? DOT_TONE[s] : TILE_TONE[s]
            )}
          >
            {variant !== "dots" && <StatusMark status={s} className="size-2.5" />}
          </span>
          {words[s]}
        </li>
      ))}
    </ul>
  );
}

/** Exams a drill can lead on to, by study path slug. */
export const EXAMS = {
  securityPlus: { cert: "security-plus-sy0-701", label: "Security+" },
  networkPlus: { cert: "network-plus-n10-009", label: "Network+" },
  aPlusCore1: { cert: "a-plus-core1-220-1201", label: "A+ Core 1" },
} as const;

export type BridgeExam = (typeof EXAMS)[keyof typeof EXAMS];

/** What the end of a drill's round says about the study path: the drill is a part, the study path is the exam. */
export interface PathLeadCopy {
  title: string;
  body: ReactNode;
  exams: readonly BridgeExam[];
}

/**
 * The way on from a free drill: the facts practiced are a small part of the
 * exam, so the study path for the rest comes first, one press on the exam.
 * Everyone sees it, signed in or not: the study path starts without an account.
 */
export function PathLead({
  tool,
  title,
  body,
  exams,
  signedIn,
}: PathLeadCopy & { tool: DrillTool; signedIn: boolean }) {
  const context = `drill_bridge_${tool}`;

  useEffect(() => {
    track("upsell_viewed", { context });
  }, [context]);

  const multi = exams.length > 1;
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="cb-measure-sm text-small text-muted-foreground">{body}</p>
      </div>
      <div className="grid gap-2">
        {multi && <p className="text-note font-medium text-muted-foreground">Which exam are you taking?</p>}
        <div
          className={cn(
            "grid gap-2",
            exams.length === 2 && "grid-cols-2",
            exams.length === 3 && "grid-cols-3"
          )}
        >
          {exams.map((e) => {
            const href = `/path/${e.cert}`;
            return (
              <Button
                key={e.cert}
                asChild
                size="lg"
                className={cn(
                  "h-auto min-h-12 w-full whitespace-normal py-2.5 text-base",
                  multi ? "px-2" : "px-6 sm:w-auto sm:justify-self-start"
                )}
              >
                <Link href={href} onClick={() => track("upsell_clicked", { context, href })}>
                  {multi ? (
                    e.label
                  ) : (
                    <>
                      {signedIn ? "Open" : "Start"} the {e.label} study path
                      <LinkArrow />
                    </>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
        {!signedIn && <p className="text-note text-muted-foreground">It is free, and you do not need an account to start.</p>}
      </div>
    </div>
  );
}

/**
 * The end of a round, the way a step ends on the study path: the score and the
 * way on, then the record of what the visitor has answered. The way on is the
 * exam's study path, for everyone. The record is what an account keeps: a
 * visitor with no account saves it with one right there to play the next
 * round, which begins with their misses; someone signed in starts it at once.
 */
export function RoundComplete({
  rounds,
  label,
  noun,
  tiles,
  variant,
  mapTitle,
  subline,
  lead,
}: {
  rounds: DrillRounds;
  /** What is practiced, for example "Port numbers": the line over the result. */
  label: string;
  /** What is practiced, singular and plural: ["port", "ports"]. */
  noun: [string, string];
  tiles: MapTile[];
  variant: MapVariant;
  /** For example "Your ports". */
  mapTitle: string;
  /** In place of the sentence about the next round (skill drills). */
  subline?: string;
  lead: PathLeadCopy;
}) {
  const pathname = usePathname();
  const { gated, roundNumber: n, roundCorrect, size } = rounds;
  const got = tiles.filter((t) => t.status === "got").length;
  const missed = tiles.filter((t) => t.status === "missed").length;
  const unseen = tiles.length - got - missed;

  useEffect(() => {
    if (gated) track("drill_gate_viewed", { tool: rounds.tool });
  }, [gated, rounds.tool]);

  // The result replaces a question that was a different height, and may have
  // been scrolled past: its top is brought back under the header, and it takes
  // the focus so that it is read.
  const top = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = top.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    const y = el.getBoundingClientRect().top;
    if (y >= HEADER_CLEARANCE && y <= window.innerHeight / 2) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
  }, []);

  const parts = [
    missed > 0 && `the ${missed} that you missed`,
    unseen > 0 && (missed + unseen > size ? "new ones" : `the ${unseen} you have not seen yet`),
  ].filter(Boolean);
  const next =
    subline ??
    (parts.length > 0
      ? `Round ${n + 1} starts with ${parts.join(", then ")}.`
      : `Round ${n + 1} returns to the ones that you know least well.`);
  const saves =
    variant === "skills"
      ? "A free account keeps your scores and begins every round with your weakest skill."
      : `A free account keeps your progress and begins every round with the ${noun[1]} that you missed.`;

  return (
    <div
      ref={top}
      tabIndex={-1}
      role="group"
      aria-label={`${label}: round ${n} result`}
      className="grid min-w-0 gap-4"
    >
      <div className="glass path-rise grid min-w-0 gap-5 rounded-lg p-5 sm:p-8">
        <div className="grid min-w-0 gap-2">
          <p className="cb-label min-w-0 text-muted-foreground">
            {label}, round {n}
          </p>
          <h2 className="cb-statement">
            You answered {roundCorrect} of {size} questions correctly.
          </h2>
          <p className="cb-measure-sm text-small text-muted-foreground">{next}</p>
        </div>

        <div className="grid gap-4 border-t border-border pt-5">
          <PathLead tool={rounds.tool} signedIn={rounds.signedIn} {...lead} />
          {!gated && (
            <Button
              size="lg"
              variant="outline"
              onClick={rounds.startNextRound}
              className="h-12 w-full px-6 text-base sm:w-auto sm:justify-self-start"
            >
              Start round {n + 1}
            </Button>
          )}
        </div>
      </div>

      <div className="glass grid min-w-0 gap-5 rounded-lg p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">{mapTitle}</h3>
          <span className="text-note text-muted-foreground">
            {variant === "skills"
              ? `${got} of ${tiles.length} secure`
              : `${got + missed} of ${tiles.length} seen`}
          </span>
        </div>
        <ProgressMap tiles={tiles} variant={variant} />
        <Legend variant={variant} />

        {gated ? (
          <div className="grid gap-4 border-t border-border pt-5">
            <div className="grid gap-1.5">
              <h3 className="text-base font-semibold">Save your progress and start round {n + 1}</h3>
              <p className="cb-measure-sm text-small text-muted-foreground">{saves}</p>
            </div>
            <InlineSignup
              nextPath={pathname}
              submitLabel={`Save and start round ${n + 1}`}
              onSignedIn={(uid, email, method) => rounds.linkAccount(uid, email, method)}
            />
          </div>
        ) : rounds.account === "error" ? (
          <div className="border-t border-border pt-4">
            <p role="status" className="cb-measure-sm text-small text-muted-foreground">
              Your account could not be reached. Your progress is kept on this device and will be saved to your
              account next time.
            </p>
          </div>
        ) : rounds.linked && rounds.account === "saved" ? (
          <div className="border-t border-border pt-4">
            <p role="status" className="flex items-center gap-1.5 text-small text-muted-foreground">
              <Check className="size-4 shrink-0" aria-hidden />
              Your progress is saved to your account.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
