"use client";

import { useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import type { ItemStatus } from "@/core/drill-rounds/drill-rounds";
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

/** "round 2 · 7 / 20" plus a hairline progress bar, for a drill's scoreboard. */
export function RoundStatus({ rounds }: { rounds: DrillRounds }) {
  return (
    <span className="flex items-center gap-2">
      <span>
        round {rounds.roundNumber} · {rounds.answered} / {rounds.size}
      </span>
      {rounds.linked && rounds.account === "saved" && (
        <span className="flex items-center gap-1 text-success">
          <Check className="size-3.5" />
          saved to your account
        </span>
      )}
    </span>
  );
}

export function RoundBar({ rounds }: { rounds: DrillRounds }) {
  return (
    <div
      className="h-0.5 overflow-hidden rounded-full bg-foreground/[0.06]"
      role="progressbar"
      aria-label={`Round ${rounds.roundNumber} progress`}
      aria-valuemin={0}
      aria-valuemax={rounds.size}
      aria-valuenow={rounds.answered}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width] duration-300"
        style={{ width: `${(rounds.answered / rounds.size) * 100}%` }}
      />
    </div>
  );
}

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

/**
 * The end of a round: what the visitor built (their progress map), then the
 * way on. Anonymous visitors save it with a free account, right here; signed-in
 * visitors start the next round, which is planned from their misses.
 */
export function RoundComplete({
  rounds,
  noun,
  tiles,
  variant,
  headline,
  subline,
  extra,
}: {
  rounds: DrillRounds;
  /** What's drilled, singular and plural: ["port", "ports"]. */
  noun: [string, string];
  tiles: MapTile[];
  variant: MapVariant;
  /** Override the generated headline / next-round line (skill drills). */
  headline?: string;
  subline?: string;
  /** Shown to signed-in visitors under the next-round button. */
  extra?: ReactNode;
}) {
  const pathname = usePathname();
  const { gated, roundNumber: n, roundCorrect, size } = rounds;
  const got = tiles.filter((t) => t.status === "got").length;
  const missed = tiles.filter((t) => t.status === "missed").length;
  const unseen = tiles.length - got - missed;

  useEffect(() => {
    if (gated) track("drill_gate_viewed", { tool: rounds.tool });
  }, [gated, rounds.tool]);

  const word = (count: number) => (count === 1 ? noun[0] : noun[1]);
  const title =
    headline ??
    (missed === 0 && unseen === 0
      ? `All ${tiles.length} ${noun[1]} right.`
      : missed === 0
        ? `${got} ${word(got)} right, no misses.`
        : got === 0
          ? `${missed} ${word(missed)} still slipping.`
          : `${got} ${word(got)} right. ${missed} still slipping.`);

  const parts = [
    missed > 0 && `your ${missed} ${missed === 1 ? "miss" : "misses"}`,
    unseen > 0 &&
      (missed + unseen > size ? "new ones" : `the ${unseen} you haven't seen yet`),
  ].filter(Boolean);
  const next =
    subline ??
    (parts.length > 0
      ? `Round ${n + 1} starts with ${parts.join(", then ")}.`
      : `Round ${n + 1} goes back over the ones you know least.`);

  return (
    <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-6 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative grid gap-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-muted-foreground">
          <span>
            round {n} complete · {roundCorrect} / {size} correct
          </span>
          <span>
            {got + missed} of {tiles.length} seen
          </span>
        </div>

        <div>
          <h3 className="text-balance font-display text-2xl font-semibold tracking-tight">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{next}</p>
        </div>

        <div className="grid gap-3">
          <ProgressMap tiles={tiles} variant={variant} />
          <Legend variant={variant} />
        </div>

        <div className="grid gap-3 border-t pt-5">
          {gated ? (
            <>
              <p className="font-semibold tracking-tight">
                Save your progress and start round {n + 1}
              </p>
              <InlineSignup
                nextPath={pathname}
                submitLabel={`Save and start round ${n + 1}`}
                onSignedIn={(uid, email, method) => rounds.linkAccount(uid, email, method)}
              />
            </>
          ) : (
            <>
              {rounds.linked && rounds.account === "saved" && (
                <p className="flex items-center gap-1.5 text-sm text-success">
                  <Check className="size-4" />
                  Saved to your account
                </p>
              )}
              {rounds.account === "error" && (
                <p className="text-sm text-muted-foreground">
                  Couldn&apos;t reach your account just now — your progress is
                  kept on this device and will sync next time.
                </p>
              )}
              <Button size="lg" onClick={rounds.startNextRound} className="w-full sm:w-auto sm:justify-self-start">
                Start round {n + 1}
                <ArrowRight />
              </Button>
              {extra}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Perspective at the end of a round, for signed-in visitors: the drilled facts
 * are a small slice of the exam, so point at the part that decides it.
 */
export function ExamContext({ cert, children }: { cert: string; children: ReactNode }) {
  return (
    <div className="grid gap-2 rounded-lg border bg-foreground/[0.02] p-4 text-sm">
      <p className="leading-relaxed text-muted-foreground">{children}</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <Link
          href={`/readiness-check/${cert}`}
          className="inline-flex items-center gap-1 font-medium text-primary"
        >
          See where you stand in 3 minutes
          <ArrowRight className="size-3.5" />
        </Link>
        <Link href="/dashboard" className="text-muted-foreground underline underline-offset-4">
          Build your study plan
        </Link>
      </div>
    </div>
  );
}
