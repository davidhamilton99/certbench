"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { DrillTool, ItemStatus } from "@/core/drill-rounds/drill-rounds";
import { track } from "@/lib/analytics";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DrillRounds } from "./useDrillRounds";

export interface MapTile {
  id: string;
  /** Shown on the tile (labels/skills variants); always the tooltip. */
  label: string;
  /** Extra tooltip context, e.g. the protocol behind a port number. */
  name?: string;
  status: ItemStatus;
  /** Secondary line on a skill tile, e.g. "8 / 10". */
  detail?: string;
}

/**
 * labels — short facts with visible labels (35 ports)
 * dots   — a large deck as a compact grid, labels on hover (300+ acronyms)
 * skills — a few skills with a label and a score each (subnetting)
 */
export type MapVariant = "labels" | "dots" | "skills";

const TILE_TONE: Record<ItemStatus, string> = {
  got: "border-success/40 bg-success/10 text-success",
  missed: "border-danger/40 bg-danger/10 text-danger",
  new: "border-border text-muted-foreground/70",
};

const STATUS_WORD: Record<ItemStatus, string> = {
  got: "got it",
  missed: "missed",
  new: "not seen yet",
};

/** Room for the public pages' sticky header when the result scrolls into view. */
const HEADER_CLEARANCE = 72;

export function ProgressMap({ tiles, variant }: { tiles: MapTile[]; variant: MapVariant }) {
  // Stagger the entrance across ~0.6s however many tiles there are.
  const step = Math.min(30, 600 / Math.max(1, tiles.length));
  return (
    <ul
      aria-label="Your progress"
      className={cn(
        "grid",
        variant === "labels" &&
          "grid-cols-[repeat(auto-fill,minmax(3.6rem,1fr))] gap-1 sm:grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] sm:gap-1.5",
        variant === "dots" && "grid-cols-[repeat(auto-fill,minmax(0.75rem,1fr))] gap-1",
        variant === "skills" && "grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))] gap-2"
      )}
    >
      {tiles.map((t, i) => (
        <li
          key={t.id}
          title={`${t.label}${t.name ? ` ${t.name}` : ""}: ${STATUS_WORD[t.status]}`}
          style={{ animationDelay: `${Math.round(i * step)}ms` }}
          className={cn(
            "animate-tile border",
            TILE_TONE[t.status],
            variant === "labels" &&
              "rounded-md py-1.5 text-center font-mono text-[10px] tracking-tight sm:py-2 sm:text-xs sm:tracking-normal",
            variant === "dots" && "aspect-square rounded-[3px]",
            variant === "dots" && t.status === "new" && "bg-foreground/[0.05]",
            variant === "skills" && "grid gap-0.5 rounded-lg px-3 py-2.5"
          )}
        >
          {variant === "labels" && t.label}
          {variant === "skills" && (
            <>
              <span className="text-sm font-medium">{t.label}</span>
              <span className="font-mono text-xs opacity-80">{t.detail ?? "not tried yet"}</span>
            </>
          )}
          {variant === "dots" && (
            <span className="sr-only">{`${t.label}: ${STATUS_WORD[t.status]}`}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

const LEGEND: Record<"facts" | "skills", Record<ItemStatus, string>> = {
  facts: { got: "Got it", missed: "Missed — comes back first", new: "Not seen yet" },
  skills: { got: "Solid (80%+)", missed: "Needs work", new: "Not tried yet" },
};

function Legend({ variant }: { variant: MapVariant }) {
  const words = LEGEND[variant === "skills" ? "skills" : "facts"];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {(["got", "missed", "new"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-[3px] border", TILE_TONE[s])} />
          {words[s]}
        </span>
      ))}
    </div>
  );
}

/** Exams a drill can lead on to, by path slug. */
export const EXAMS = {
  securityPlus: { cert: "security-plus-sy0-701", label: "Security+" },
  networkPlus: { cert: "network-plus-n10-009", label: "Network+" },
  aPlusCore1: { cert: "a-plus-core1-220-1201", label: "A+ Core 1" },
} as const;

export type BridgeExam = (typeof EXAMS)[keyof typeof EXAMS];

/** What a drill's round end says about the path: the drill is a slice, the path is the exam. */
export interface PathLeadCopy {
  title: string;
  body: ReactNode;
  exams: readonly BridgeExam[];
}

/**
 * The way on from a free drill: the drilled facts are a small slice of the
 * exam, so lead with the guided path for the rest, one tap on their exam.
 * Everyone sees it, signed in or not: the path starts without an account.
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
      <div className="grid gap-1">
        <p className="text-balance font-display text-xl font-semibold tracking-tight">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      </div>
      <div className="grid gap-2">
        {multi && <p className="text-xs font-medium text-muted-foreground">Which exam are you taking?</p>}
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
                className={cn("h-12 w-full text-base", multi ? "px-2" : "px-6 sm:w-auto sm:justify-self-start")}
              >
                <Link href={href} onClick={() => track("upsell_clicked", { context, href })}>
                  {multi ? (
                    e.label
                  ) : (
                    <>
                      {signedIn ? "Open" : "Start"} my {e.label} path
                      <ArrowRight />
                    </>
                  )}
                </Link>
              </Button>
            );
          })}
        </div>
        {!signedIn && <p className="text-xs text-muted-foreground">Free, no account needed to start.</p>}
      </div>
    </div>
  );
}

/**
 * The end of a round, the way a stop ends on the path: the score and the way
 * on, then the map of what the visitor built. The way on is their exam's path,
 * for everyone. The map is what an account keeps: a visitor with no account
 * saves it with one right there to play the next round, which opens with
 * their misses; someone signed in starts it straight away.
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
  /** What's drilled, e.g. "Port numbers": the result's eyebrow. */
  label: string;
  /** What's drilled, singular and plural: ["port", "ports"]. */
  noun: [string, string];
  tiles: MapTile[];
  variant: MapVariant;
  /** e.g. "Your port map". */
  mapTitle: string;
  /** Override the generated next-round line (skill drills). */
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
  // been scrolled past: bring its top back under the header, and focus with it.
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
    missed > 0 && `your ${missed} ${missed === 1 ? "miss" : "misses"}`,
    unseen > 0 && (missed + unseen > size ? "new ones" : `the ${unseen} you haven't seen yet`),
  ].filter(Boolean);
  const next =
    subline ??
    (parts.length > 0
      ? `Round ${n + 1} starts with ${parts.join(", then ")}.`
      : `Round ${n + 1} goes back over the ones you know least.`);
  const saves =
    variant === "skills"
      ? "A free account keeps your scores and opens every round on your weakest skill."
      : `A free account keeps your map and opens every round with the ${noun[1]} you miss.`;

  return (
    <div
      ref={top}
      tabIndex={-1}
      role="group"
      aria-label={`${label}: round ${n} result`}
      className="grid min-w-0 scroll-mt-24 gap-4 outline-none"
    >
      <div className="glass path-rise grid min-w-0 gap-5 rounded-3xl p-6 sm:p-8">
        <div className="grid min-w-0 gap-1.5">
          <span className="min-w-0 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            {label} · round {n}
          </span>
          <p className="font-display text-4xl font-semibold tracking-tight">
            {roundCorrect} <span className="text-muted-foreground">of {size}</span>
          </p>
          <p className="text-muted-foreground">
            {roundCorrect === size && "Every one right. "}
            {next}
          </p>
        </div>

        <div className="grid gap-4 border-t border-border/70 pt-5">
          <PathLead tool={rounds.tool} signedIn={rounds.signedIn} {...lead} />
          {!gated && (
            <Button
              size="lg"
              variant="outline"
              onClick={rounds.startNextRound}
              className="h-12 w-full px-6 text-base sm:w-auto sm:justify-self-start"
            >
              Start round {n + 1}
              <ArrowRight />
            </Button>
          )}
        </div>
      </div>

      <div className="glass grid min-w-0 gap-5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display font-semibold tracking-tight">{mapTitle}</h2>
          <span className="font-mono text-xs text-muted-foreground">
            {variant === "skills"
              ? `${got} of ${tiles.length} solid`
              : `${got + missed} of ${tiles.length} seen`}
          </span>
        </div>
        <ProgressMap tiles={tiles} variant={variant} />
        <Legend variant={variant} />

        {gated ? (
          <div className="grid gap-4 border-t border-border/70 pt-5">
            <div className="grid gap-1">
              <h2 className="font-display text-xl font-semibold tracking-tight">
                Save your map and play round {n + 1}
              </h2>
              <p className="text-sm text-muted-foreground">{saves}</p>
            </div>
            <InlineSignup
              nextPath={pathname}
              submitLabel={`Save and start round ${n + 1}`}
              onSignedIn={(uid, email, method) => rounds.linkAccount(uid, email, method)}
            />
          </div>
        ) : rounds.account === "error" ? (
          <p className="border-t border-border/70 pt-4 text-sm text-muted-foreground">
            Couldn&apos;t reach your account just now. Your progress is kept on this device and will sync next
            time.
          </p>
        ) : rounds.linked && rounds.account === "saved" ? (
          <p className="flex items-center gap-1.5 border-t border-border/70 pt-4 text-sm text-success">
            <Check className="size-4" aria-hidden />
            Saved to your account
          </p>
        ) : null}
      </div>
    </div>
  );
}
