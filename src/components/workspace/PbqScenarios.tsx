"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as Tabs from "@radix-ui/react-tabs";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PbqScenario } from "@/data/pbq/types";
import { PbqPlayer, type PbqUpsell } from "@/components/workspace/PbqPlayer";
import { preloadLab } from "@/components/workspace/pbq-host";
import { domainLabel, HANDS_ON_TYPES, LAB_TYPES } from "@/components/path/lab-types";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/** Where Pro is described and bought. */
const PRO_HREF = "/upgrade?reason=pbq";

/**
 * What Pro adds, in the terms of the pricing page: every lab, the whole study
 * path and new timed practice exams. A free account's practice questions are
 * limited each day and Pro's are not (src/server/services/subscription.ts).
 */
const PRO_INCLUDES =
  "the whole study path and new timed practice exams, with no daily limit on practice questions";

type Kind = "labs" | "drills";

/** The two lists' names and what each holds. */
const KINDS: Record<Kind, { tab: string; empty: string }> = {
  labs: { tab: "Exam-style labs", empty: "There are no exam-style labs for this certification yet." },
  drills: { tab: "Short drills", empty: "There are no short drills for this certification yet." },
};

const TAB =
  "rounded-md border border-input px-3.5 py-1.5 text-small font-medium transition-colors pointer-coarse:py-2.5 hover:border-primary hover:bg-tint-hover data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-primary-foreground";

// On a phone a row's last part (what Pro includes) wraps under its text; from sm it sits at the row's end.
const ROW =
  "glass flex w-full min-w-0 flex-wrap items-center gap-x-3.5 gap-y-2 rounded-md p-3.5 text-left transition-[border-color] duration-200 hover:border-primary/60 sm:flex-nowrap sm:p-4";

/**
 * A briefing's first sentence, whole: what a lab is about in one line. A
 * sentence ends at a full stop that is followed by a capital, so "Contoso
 * Ltd. has hired" and "192.168.10.0/24" are not cut in two.
 */
export function firstSentence(text: string): string {
  const match = text.trim().match(/^[\s\S]*?[.?!](?=\s+[A-Z"'(]|\s*$)/);
  return match ? match[0] : text.trim();
}

/** "Simulation, 5 minutes" or "Ordering drill": the kind of lab, and how long it takes where that is known. */
function metaOf(scenario: PbqScenario): string {
  const kind = LAB_TYPES[scenario.type].label;
  if (!("estimatedMinutes" in scenario)) return kind;
  const minutes = scenario.estimatedMinutes;
  return `${kind}, ${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

/** One sentence that says what the lab is about. */
function summaryOf(scenario: PbqScenario): string {
  return "briefing" in scenario ? firstSentence(scenario.briefing) : scenario.description;
}

/* ------------------------------------------------------------------ */
/*  A list of labs, by domain                                          */
/* ------------------------------------------------------------------ */

function ScenarioList({
  scenarios,
  lockedIds,
  empty,
  onSelect,
  rowRef,
}: {
  scenarios: readonly PbqScenario[];
  lockedIds: ReadonlySet<string>;
  /** What to say when the list holds nothing. */
  empty: string;
  onSelect: (s: PbqScenario) => void;
  /** Keeps each open row's button, so the focus can return to it. */
  rowRef: (id: string, el: HTMLButtonElement | null) => void;
}) {
  const domains = useMemo(() => {
    const groups = new Map<string, { number: string; title: string; labs: PbqScenario[] }>();
    for (const s of scenarios) {
      const group = groups.get(s.domain_number) ?? { number: s.domain_number, title: s.domain_title, labs: [] };
      group.labs.push(s);
      groups.set(s.domain_number, group);
    }
    // In the order the labs are filed in: the first lab, which a free account can open, stays at the top.
    return [...groups.values()];
  }, [scenarios]);

  if (scenarios.length === 0) {
    return <p className="rounded-lg border border-dashed border-border p-6 text-small text-muted-foreground">{empty}</p>;
  }

  return (
    <div className="grid gap-7">
      {domains.map((domain) => (
        <section key={domain.number} aria-labelledby={`pbq-domain-${domain.number}`} className="grid gap-2.5">
          <h2 id={`pbq-domain-${domain.number}`} className="text-small font-semibold leading-snug">
            Domain {domainLabel(domain.number)}: {domain.title}
          </h2>
          <ul className="grid gap-2">
            {domain.labs.map((scenario) => {
              const locked = lockedIds.has(scenario.id);
              const { Icon } = LAB_TYPES[scenario.type];
              const body = (
                <>
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-md",
                      locked ? "bg-foreground/[0.06] text-muted-foreground" : "bg-primary/[0.08] text-primary"
                    )}
                  >
                    <Icon className="size-[18px]" aria-hidden />
                  </span>
                  {/* Titles and summaries wrap, never cut short: a cut title hides what the lab is. */}
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium leading-snug">{scenario.title}</span>
                    <span className="mt-1 block text-note text-muted-foreground">
                      {metaOf(scenario)}. {summaryOf(scenario)}
                    </span>
                  </span>
                  {locked && (
                    // Under the text and in line with it on a phone, so the title keeps the row's width.
                    <span className="inline-flex w-full items-center gap-1.5 pl-13.5 text-note font-medium text-muted-foreground sm:w-auto sm:shrink-0 sm:pl-0">
                      <Lock className="size-3.5" aria-hidden />
                      Included with Pro
                    </span>
                  )}
                </>
              );
              return (
                <li key={scenario.id} className="min-w-0">
                  {locked ? (
                    // A lab that Pro includes leads to where Pro is described: a link, since it goes to another page.
                    <Link href={PRO_HREF} className={ROW}>
                      {body}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      ref={(el) => rowRef(scenario.id, el)}
                      onClick={() => onSelect(scenario)}
                      // The large players are fetched when a lab is opened; a hover or the focus starts that early.
                      onPointerEnter={() => preloadLab(scenario.type)}
                      onFocus={() => preloadLab(scenario.type)}
                      className={ROW}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  The workspace's labs                                               */
/* ------------------------------------------------------------------ */

/**
 * Every lab an exam has, in two lists (the labs that work like the exam's
 * performance-based questions, and the short drills), each by domain. A lab
 * opens in place of the lists and takes the focus; leaving it brings the lists
 * back with the focus on the row it was opened from.
 */
export function PbqScenarios({
  scenarios,
  isPro = true,
}: {
  scenarios: PbqScenario[];
  /** A free account opens the first exam-style lab and the first drill; Pro opens the rest. */
  isPro?: boolean;
}) {
  const [active, setActive] = useState<PbqScenario | null>(null);
  const [kind, setKind] = useState<Kind>("labs");
  const rows = useRef(new Map<string, HTMLButtonElement>());
  const lastOpened = useRef<string | null>(null);

  const labs = useMemo(() => scenarios.filter((s) => HANDS_ON_TYPES.has(s.type)), [scenarios]);
  const drills = useMemo(() => scenarios.filter((s) => !HANDS_ON_TYPES.has(s.type)), [scenarios]);

  const lockedIds = useMemo(() => {
    if (isPro) return new Set<string>();
    return new Set([...labs.slice(1), ...drills.slice(1)].map((s) => s.id));
  }, [isPro, labs, drills]);

  // Back from a lab: the focus returns to the row that opened it, not to the top of the page.
  useEffect(() => {
    if (active || !lastOpened.current) return;
    rows.current.get(lastOpened.current)?.focus();
    lastOpened.current = null;
  }, [active]);

  function rowRef(id: string, el: HTMLButtonElement | null) {
    if (el) rows.current.set(id, el);
    else rows.current.delete(id);
  }

  function openScenario(s: PbqScenario) {
    track("pbq_started", {
      scenario_id: s.id,
      scenario_type: s.type,
      surface: "authed",
    });
    lastOpened.current = s.id;
    setActive(s);
  }

  if (scenarios.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-small text-muted-foreground">
        There are no hands-on labs for this certification yet.
      </p>
    );
  }

  if (active) {
    // Shown to a free account once the lab is graded.
    const upsell: PbqUpsell = {
      heading: "You have completed this lab.",
      note: `Pro includes all ${scenarios.length} labs for this exam, ${PRO_INCLUDES}.`,
      href: PRO_HREF,
      label: "See what Pro includes",
      context: "authed_pbq",
    };
    return (
      <PbqPlayer
        scenario={active}
        backLabel="Return to the labs"
        onBack={() => setActive(null)}
        upsell={isPro ? undefined : upsell}
        // The lab opens in answer to a press on this page: it takes the focus.
        takeFocus
        onStarted={() =>
          track("pbq_first_move", { scenario_id: active.id, scenario_type: active.type, surface: "authed" })
        }
      />
    );
  }

  // The list in view: the other one when the chosen kind has nothing in it.
  const shown: Kind = kind === "labs" && labs.length === 0 ? "drills" : kind === "drills" && drills.length === 0 ? "labs" : kind;
  const both = labs.length > 0 && drills.length > 0;
  const list = (which: Kind) => (
    <ScenarioList
      scenarios={which === "labs" ? labs : drills}
      lockedIds={lockedIds}
      empty={KINDS[which].empty}
      onSelect={openScenario}
      rowRef={rowRef}
    />
  );

  return (
    <div className="grid gap-6">
      {!isPro && lockedIds.size > 0 && (
        <div className="glass flex flex-wrap items-center justify-between gap-4 rounded-lg p-4 sm:p-5">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-small font-semibold">
              {lockedIds.size === 1 ? "1 more lab is" : `${lockedIds.size} more labs are`} included with Pro.
            </p>
            <p className="mt-1 text-note text-muted-foreground">Pro includes every lab on this page, {PRO_INCLUDES}.</p>
          </div>
          <Button asChild className="shrink-0">
            <Link href={PRO_HREF}>See what Pro includes</Link>
          </Button>
        </div>
      )}

      {both ? (
        // Real tabs: one stop for the Tab key, and the arrow keys move between the two lists.
        <Tabs.Root value={shown} onValueChange={(next) => setKind(next as Kind)} className="grid gap-5">
          <Tabs.List aria-label="Kind of lab" className="flex flex-wrap gap-1.5">
            <Tabs.Trigger value="labs" className={TAB}>
              {KINDS.labs.tab} ({labs.length})
            </Tabs.Trigger>
            <Tabs.Trigger value="drills" className={TAB}>
              {KINDS.drills.tab} ({drills.length})
            </Tabs.Trigger>
          </Tabs.List>
          {/* Each panel holds its own controls, so the panel itself is not a stop for the Tab key. */}
          <Tabs.Content value="labs" tabIndex={-1}>
            {list("labs")}
          </Tabs.Content>
          <Tabs.Content value="drills" tabIndex={-1}>
            {list("drills")}
          </Tabs.Content>
        </Tabs.Root>
      ) : (
        list(shown)
      )}
    </div>
  );
}
