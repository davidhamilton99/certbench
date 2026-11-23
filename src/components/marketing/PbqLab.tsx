"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import type { PbqScenario } from "@/data/pbq/types";
import { PbqPlayer } from "@/components/workspace/PbqPlayer";
import { preloadLab } from "@/components/workspace/pbq-host";
import { domainLabel, LAB_TYPES, labMeta } from "@/components/path/lab-types";
import { useSessionUserId } from "@/components/auth/useSignedIn";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { identifyUser, track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { cn } from "@/lib/utils";

/** How hard a free lab is, so that a new visitor can begin with an easy one. */
export type LabTier = "Introductory" | "Core" | "Exam level";

export interface FreeLab {
  scenario: PbqScenario;
  tier: LabTier;
  minutes: number;
}

/** Analytics context for the way on to the study path once a lab is graded. */
const CONTEXT = "public_pbq";

/** The labs the chooser leads with: an introductory lab, a core lab and one at exam level. Anyone can play these. */
const FEATURED = 3;

/** On the page's address after a Google sign-in from a lab's ask: open that lab. */
const OPEN_LAB = "lab";

const minutes = (n: number) => `${n} ${n === 1 ? "minute" : "minutes"}`;
const labWord = (n: number) => (n === 1 ? "lab" : "labs");

/** A lab's tile or row: something pressed, with the edge and the tints every pressed thing has. */
const TILE = "min-w-0 rounded-md border text-left transition-[border-color,background-color] duration-150";
const TILE_CHOSEN = "border-primary bg-tint-selected";
const TILE_IDLE = "border-input bg-card hover:border-primary hover:bg-tint-hover active:bg-tint-press";

/** The mark beside a lab: its kind, or a check once it has been completed. Words beside it say the same. */
function LabMark({ type, done, large = false }: { type: PbqScenario["type"]; done: boolean; large?: boolean }) {
  const { Icon } = LAB_TYPES[type];
  const size = large ? "size-[18px]" : "size-4";
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xs",
        large ? "size-10" : "size-8",
        done ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
      )}
    >
      {done ? <Check className={size} strokeWidth={3} /> : <Icon className={size} />}
    </span>
  );
}

/**
 * The labs of a public PBQ page, played as the study path plays one. Three
 * lead the chooser, from introductory to exam level, and the rest of the free
 * labs are listed under the stage, one domain at a time. Each is worked on the
 * same stage with the same player. The chooser's three are open to anyone; the
 * rest open with a free account, which is asked for on the stage when one of
 * them is chosen. Once a lab is graded, the way on is the exam's study path,
 * where Pro opens every lab.
 *
 * Every tile and row is named by the words printed on it, in the order they
 * are printed, so that what a screen reader says and what a voice user reads
 * out are the same words.
 */
export function PbqLab({
  labs: freeLabs,
  examName,
  pathHref,
  labCount,
}: {
  /** Every free lab: the first three lead the chooser, the rest are listed under the stage. */
  labs: FreeLab[];
  /** "Security+". */
  examName: string;
  pathHref: string;
  /** Every lab the exam has on the study path. */
  labCount: number;
}) {
  const [selected, setSelected] = useState(0);
  // Raised to mount a new player when its scenario changes.
  const [attempt, setAttempt] = useState(0);
  const [graded, setGraded] = useState<ReadonlySet<string>>(() => new Set());
  const chooser = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const userId = useSessionUserId();
  // An account made at a lab's ask opens the lab at once, ahead of the session event.
  const [signedUpHere, setSignedUpHere] = useState(false);
  const signedIn = typeof userId === "string" || signedUpHere;
  const moreId = useId();
  // A lab past the chooser's three, chosen while signed out: the stage asks for the account.
  const [asking, setAsking] = useState<number | null>(null);
  // Whether the stage takes the keyboard's focus when its lab opens. It does
  // when the lab was opened from further down the page (the list, the offer of
  // the next lab), because the stage is scrolled into view and the focus must
  // go with it. The three tiles directly over the stage keep the focus, as
  // tabs do. A lab that is on the page as it loads never takes it.
  const [stageFocus, setStageFocus] = useState(false);

  const active = freeLabs[selected];
  const activeId = active?.scenario.id;
  const activeType = active?.scenario.type;

  // Recorded when a lab is shown, as it always has been (an experiment is read
  // on this event). The first thing done in a lab is `pbq_first_move`, below.
  useEffect(() => {
    if (!activeId || !activeType || asking !== null) return;
    track("pbq_started", { scenario_id: activeId, scenario_type: activeType, surface: "public" });
  }, [activeId, activeType, asking]);

  // Back from a Google sign-in made at a lab's ask: open the lab that was chosen.
  useEffect(() => {
    if (!signedIn) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get(OPEN_LAB);
    if (!id) return;
    url.searchParams.delete(OPEN_LAB);
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    const i = freeLabs.findIndex((l) => l.scenario.id === id);
    if (i < 0) return;
    track("pbq_account_linked", { scenario_id: id, method: "redirect" });
    // The address can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAsking(null);
    setSelected(i);
    setAttempt((n) => n + 1);
    stage.current?.scrollIntoView?.({ block: "start" });
  }, [signedIn, freeLabs]);

  if (!active) return null;

  function pick(i: number, toStage = false) {
    // Past the chooser's three, a free account opens the lab: ask for it on the stage.
    if (i >= FEATURED && !signedIn) {
      setAsking(i);
      track("pbq_gate_viewed", { scenario_id: freeLabs[i].scenario.id });
    } else {
      setAsking(null);
    }
    if (i !== selected) {
      setSelected(i);
      setAttempt((n) => n + 1);
    }
    setStageFocus(toStage);
    if (toStage) {
      const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      stage.current?.scrollIntoView?.({ block: "start", behavior: still ? "auto" : "smooth" });
    }
  }

  /** The player's way back: up to the other labs. */
  function toChooser() {
    const el = chooser.current;
    if (!el) return;
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ block: "center", behavior: still ? "auto" : "smooth" });
    // The lab in hand, or the first of the three when it is one from the list below.
    const target =
      el.querySelector<HTMLButtonElement>('button[aria-pressed="true"]') ?? el.querySelector<HTMLButtonElement>("button");
    target?.focus({ preventScroll: true });
  }

  // After a lab, the next one not completed yet, so that the way on can offer it too.
  const nextIndex = freeLabs.findIndex((l, i) => i !== selected && !graded.has(l.scenario.id));
  const next = nextIndex >= 0 ? freeLabs[nextIndex] : null;

  // The free labs past the chooser's three, one domain at a time, in exam order.
  const more = freeLabs.map((lab, index) => ({ lab, index })).slice(FEATURED);
  const moreDomains = [...new Map(more.map(({ lab }) => [lab.scenario.domain_number, lab.scenario.domain_title] as const))]
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));

  return (
    <div className="grid min-w-0 gap-4">
      {/* Three across, and one under another on the narrowest screens (320
          pixels, or a page at 400%), where a third of the width cannot hold
          the word "Introductory". */}
      <div
        ref={chooser}
        role="group"
        aria-label="Choose a lab"
        className="grid scroll-mt-24 grid-cols-1 gap-2 min-[360px]:grid-cols-3"
      >
        {freeLabs.slice(0, FEATURED).map((lab, i) => {
          const isActive = i === selected;
          const done = graded.has(lab.scenario.id);
          return (
            <button
              key={lab.scenario.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => pick(i)}
              // The large players are fetched when a lab is opened; begin early when one is about to be.
              onPointerEnter={() => preloadLab(lab.scenario.type)}
              onFocus={() => preloadLab(lab.scenario.type)}
              className={cn(TILE, "grid content-start gap-2 p-3 sm:p-3.5", isActive ? TILE_CHOSEN : TILE_IDLE)}
            >
              {/* On a narrow tile the time wraps under the mark and is not cut short. */}
              <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                <LabMark type={lab.scenario.type} done={done} />
                <span className="text-note tabular-nums text-muted-foreground">{minutes(lab.minutes)}</span>
              </span>
              <span className="sr-only">, </span>
              <span className={isActive ? "cb-label text-primary" : "cb-label text-muted-foreground"}>{lab.tier}</span>
              <span className="sr-only">, </span>
              {/* Three tiles across a phone leave no room for the title, which the
                  stage prints; it is still in the tile's name. It is printed
                  where a tile has the room: from the `sm` width, and where the
                  tiles stand one under another. */}
              <span className="sr-only text-small font-medium leading-snug max-[359px]:not-sr-only max-[359px]:block sm:not-sr-only sm:block">
                {lab.scenario.title}
              </span>
              {done && <span className="sr-only">, completed</span>}
            </button>
          );
        })}
      </div>

      {/* min-w-0: a lab's row of tabs does not wrap, and would widen a phone's page. */}
      <div ref={stage} className="glass min-w-0 scroll-mt-24 rounded-lg p-4 sm:p-6">
        {asking !== null && !signedIn ? (
          <LabAsk
            lab={freeLabs[asking]}
            more={freeLabs.length - FEATURED}
            onSignedIn={(uid, email, method) => {
              identifyUser(uid, email ? { email } : undefined);
              track("pbq_account_linked", { scenario_id: freeLabs[asking].scenario.id, method });
              setSignedUpHere(true);
              setAsking(null);
              // The form that held the focus is replaced by the lab.
              setStageFocus(true);
            }}
          />
        ) : (
          <PbqPlayer
            key={`${active.scenario.id}-${attempt}`}
            scenario={active.scenario}
            backLabel="Choose another lab"
            onBack={toChooser}
            takeFocus={stageFocus}
            onStarted={() =>
              track("pbq_first_move", {
                scenario_id: active.scenario.id,
                scenario_type: active.scenario.type,
                surface: "public",
              })
            }
            onGraded={() =>
              setGraded((prev) => (prev.has(active.scenario.id) ? prev : new Set([...prev, active.scenario.id])))
            }
          />
        )}
      </div>

      {graded.size > 0 && (
        <NextOnPath
          examName={examName}
          pathHref={pathHref}
          labCount={labCount}
          signedIn={Boolean(userId)}
          next={next}
          onNext={() => pick(nextIndex, true)}
        />
      )}

      {more.length > 0 && (
        <section aria-labelledby={moreId} className="mt-10 grid gap-6 sm:mt-14">
          <div className="grid gap-2 border-t border-foreground/80 pt-5">
            <h2 id={moreId} className="cb-subsection">
              {more.length} more free {labWord(more.length)}
            </h2>
            <p className="cb-measure text-body text-muted-foreground">
              {signedIn
                ? "Each lab is graded with partial credit on this page."
                : "These labs are free with an account. Each lab is graded with partial credit on this page."}
            </p>
          </div>
          {moreDomains.map(([number, title]) => (
            <div key={number} className="grid gap-2.5">
              <h3 className="border-b border-foreground/70 pb-2 text-small font-semibold">
                Domain {domainLabel(number)}: {title}
              </h3>
              <ul className="grid gap-2 sm:grid-cols-2">
                {more
                  .filter(({ lab }) => lab.scenario.domain_number === number)
                  .map(({ lab, index }) => {
                    const isActive = index === selected;
                    const done = graded.has(lab.scenario.id);
                    return (
                      <li key={lab.scenario.id} className="min-w-0">
                        <button
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => pick(index, true)}
                          onPointerEnter={() => preloadLab(lab.scenario.type)}
                          onFocus={() => preloadLab(lab.scenario.type)}
                          className={cn(
                            TILE,
                            "flex h-full w-full items-center gap-3.5 p-3.5",
                            isActive ? TILE_CHOSEN : TILE_IDLE
                          )}
                        >
                          <LabMark type={lab.scenario.type} done={done} large />
                          {/* A title wraps and is never cut short. */}
                          <span className="min-w-0 flex-1">
                            <span className="block text-small font-medium leading-snug">{lab.scenario.title}</span>
                            <span className="sr-only">, </span>
                            <span className="mt-1 block text-note text-muted-foreground">
                              {labMeta({ type: lab.scenario.type, minutes: lab.minutes })}
                            </span>
                          </span>
                          {done && <span className="sr-only">, completed</span>}
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

/**
 * A lab past the chooser's three, chosen while signed out: a free account
 * opens it and the rest of the free labs, and is made here on the stage. A
 * Google sign-in returns to the page with that lab open.
 */
function LabAsk({
  lab,
  more,
  onSignedIn,
}: {
  lab: FreeLab;
  /** The free labs past the chooser's three. */
  more: number;
  onSignedIn: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  // The ask replaces the lab in answer to a press further down the page: its
  // heading takes the focus, so that it is read and the keyboard goes with it.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  const nextPath =
    typeof window === "undefined" ? "/" : `${window.location.pathname}?${OPEN_LAB}=${encodeURIComponent(lab.scenario.id)}`;
  return (
    <div className="grid gap-5">
      <div className="grid gap-2">
        <p className="cb-label text-muted-foreground">
          {lab.scenario.title}, {minutes(lab.minutes)}
        </p>
        <h2 ref={heading} tabIndex={-1} className="cb-statement">
          A free account opens {more} more free {labWord(more)}.
        </h2>
        {/* The form below says that the account is free and needs no payment card. */}
        <p className="cb-measure-sm text-small text-muted-foreground">
          Each lab is graded with partial credit on this page.
        </p>
      </div>
      <InlineSignup nextPath={nextPath} submitLabel="Open the labs" onSignedIn={onSignedIn} />
    </div>
  );
}

/**
 * Once a lab is graded: the study path is the way on, as the study path itself
 * follows a lab with the next step. Another free lab stays one press away.
 */
function NextOnPath({
  examName,
  pathHref,
  labCount,
  signedIn,
  next,
  onNext,
}: {
  examName: string;
  pathHref: string;
  labCount: number;
  signedIn: boolean;
  next: FreeLab | null;
  onNext: () => void;
}) {
  useEffect(() => {
    track("upsell_viewed", { context: CONTEXT });
  }, []);

  return (
    <div className="glass path-rise grid gap-5 rounded-lg p-5 sm:p-6">
      <div className="grid gap-2">
        <h2 className="cb-statement">
          PBQs are one part of the {examName} exam. The study path covers all of it.
        </h2>
        <p className="cb-measure text-small text-muted-foreground">
          The study path covers every {examName} objective in short steps, and a readiness checkpoint shows where you
          stand. Pro adds all {labCount} {examName} labs to it, with one at the end of each domain.
        </p>
      </div>
      <div className="grid gap-2.5 sm:flex sm:flex-wrap sm:items-center">
        <Button asChild size="lg" className="h-auto min-h-12 w-full whitespace-normal py-2.5 sm:w-auto">
          <Link href={pathHref} onClick={() => track("upsell_clicked", { context: CONTEXT, href: pathHref })}>
            {signedIn ? "Open the study path" : "Start the study path"}
            <LinkArrow />
          </Link>
        </Button>
        {next && (
          <Button variant="outline" size="lg" className="h-auto min-h-12 w-full whitespace-normal py-2.5 sm:w-auto" onClick={onNext}>
            Try the {next.tier.toLowerCase()} lab
          </Button>
        )}
      </div>
      {!signedIn && <p className="text-note text-muted-foreground">It is free, and you do not need an account to start.</p>}
    </div>
  );
}
