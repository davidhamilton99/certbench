"use client";

import { Fragment, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import { track } from "@/lib/analytics";
import { hasStarted } from "@/core/path/progress";
import { PATH_CERTS, isPathCert, type PathCert } from "@/core/path/types";
import { EXAM_CODES, LAST_EXAM_DAY, examVersions, longDate } from "@/core/path/versions";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { LinkArrow } from "@/components/ui/link-arrow";
import { readLocalPath } from "./local-path";
import { carryOverPreV15Path } from "./carry-over";
import { PRE_V15_SLUG, pathStorageKey } from "./storage-key";
import { cn } from "@/lib/utils";

/**
 * What the list prints for each exam: its name, and how many objectives its
 * outline has. The names are those of EXAM_NAMES in src/data/path/titles.ts,
 * and the counts are the sizes of that file's lists of objective titles. They
 * are written out here because that file holds every objective title of five
 * exams, which this list would otherwise load on the home page to print a
 * count. ExamPicker.test.tsx keeps the two equal.
 */
export const EXAM_LIST: Record<PathCert, { name: string; objectives: number }> = {
  "security-plus-sy0-701": { name: "Security+", objectives: 28 },
  "security-plus-sy0-801": { name: "Security+", objectives: 27 },
  "network-plus-n10-009": { name: "Network+", objectives: 27 },
  "a-plus-core1-220-1201": { name: "A+ Core 1", objectives: 27 },
  "a-plus-core2-220-1202": { name: "A+ Core 2", objectives: 36 },
};

/** One row per exam. An exam taught in two versions gets one row that asks which. */
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
  `${EXAM_LIST[cert].objectives} ${usesOfficialObjectiveNumbers(cert) ? "objectives" : "topics"}`;

/** What a version's row says, in a sentence: when it stops, or that it's the newest. */
function versionNote(cert: PathCert): string {
  const last = LAST_EXAM_DAY[cert];
  return last ? `This version can be taken until ${longDate(last)}.` : "This is the newest version.";
}

/**
 * A row of the list. The list's card clips what is drawn outside it, so the
 * row's focus ring is the page's own outline set inside the row.
 */
const rowClass =
  "flex w-full items-center gap-4 px-4 py-3.5 text-left transition-[background-color] hover:bg-tint-hover focus-visible:-outline-offset-2 sm:px-5 sm:py-4";

/* ------------------------------------------------------------------ */
/* The study path already started on this device                       */
/* ------------------------------------------------------------------ */

/** The card that leads back to a study path this device has started. */
const RESUME_CARD =
  "flex items-center justify-between gap-4 rounded-lg border border-primary bg-tint-selected px-4 py-3.5 transition-[background-color] hover:bg-tint-press sm:px-5";
const RESUME_TITLE = "text-lede font-semibold";
const RESUME_STEPS = "text-small text-muted-foreground";

const resumeTitle = (cert: PathCert) =>
  `Continue your ${EXAM_LIST[cert].name} study path${examVersions(cert).length > 0 ? ` (${EXAM_CODES[cert]})` : ""}`;

const ONE_STEP = "You have completed 1 step.";
/** `{n}` is the number of steps. */
const MANY_STEPS = "You have completed {n} steps.";
const stepsSentence = (steps: number) => (steps === 1 ? ONE_STEP : MANY_STEPS.replace("{n}", String(steps)));

interface Resume {
  cert: PathCert;
  /** Steps completed. */
  steps: number;
}

/**
 * The study path this device worked on most recently, as "exam|steps", or ""
 * when it has started none. A string, so that two readings of an unchanged
 * device are equal and nothing is drawn again.
 */
function readResume(): string {
  let best: (Resume & { at: number }) | null = null;
  for (const cert of PATH_CERTS) {
    const local = readLocalPath(cert);
    if (!local || !hasStarted(local.progress)) continue;
    const stops = Object.values(local.progress.stops);
    let at = 0;
    for (const stop of stops) at = Math.max(at, stop.at);
    for (const item of Object.values(local.progress.items)) at = Math.max(at, item.t);
    if (!best || at > best.at) best = { cert, steps: stops.length, at };
  }
  return best ? `${best.cert}|${best.steps}` : "";
}

/** What the server's markup holds in place of a reading: it cannot see the device. */
const NOT_READ = "not-read";

function parseResume(snapshot: string): Resume | null {
  const [cert, steps] = snapshot.split("|");
  return cert && isPathCert(cert) ? { cert, steps: Number(steps) || 0 } : null;
}

/**
 * One list's reading of this device's storage. It is read when the list is
 * first drawn in the browser, and again when another tab writes or `refresh`
 * is called.
 */
function createResumeStore() {
  let snapshot: string | null = null;
  let notify: (() => void) | null = null;
  const refresh = () => {
    snapshot = null;
    notify?.();
  };
  return {
    subscribe(onChange: () => void) {
      notify = onChange;
      window.addEventListener("storage", refresh);
      return () => {
        notify = null;
        window.removeEventListener("storage", refresh);
      };
    },
    getSnapshot: () => (snapshot ??= readResume()),
    refresh,
  };
}

/**
 * Fills in the card in the server's markup, before the page is first painted.
 *
 * The page is the same for every visitor, so the server cannot know whether
 * this device has started a study path. Drawn only once the page's scripts had
 * started, the card pushed the list of exams down by its own height just as a
 * returning learner reached for it. This function is printed into the page as
 * an inline script directly after the empty card (see `resumeScript`), so the
 * list is in its final place from the first paint and the card can be pressed
 * at once.
 *
 * It runs as text, on its own: it may use only its arguments and what every
 * browser provides. It reads the device the way `readResume` does.
 */
export function fillResumeCard(
  slot: Element | null,
  exams: [key: string, href: string, title: string][],
  oneStep: string,
  manySteps: string
) {
  try {
    if (!slot) return;
    let best: [key: string, href: string, title: string] | null = null;
    let bestAt = -1;
    let steps = 0;
    for (let i = 0; i < exams.length; i++) {
      try {
        const saved = JSON.parse(window.localStorage.getItem(exams[i][0]) || "null");
        const progress = saved && saved.progress;
        if (!progress) continue;
        const stops = progress.stops || {};
        const items = progress.items || {};
        const stopKeys = Object.keys(stops);
        const itemKeys = Object.keys(items);
        if (stopKeys.length === 0 && itemKeys.length === 0) continue;
        let at = 0;
        for (let s = 0; s < stopKeys.length; s++) at = Math.max(at, Number(stops[stopKeys[s]].at) || 0);
        for (let t = 0; t < itemKeys.length; t++) at = Math.max(at, Number(items[itemKeys[t]].t) || 0);
        if (at > bestAt) {
          bestAt = at;
          best = exams[i];
          steps = stopKeys.length;
        }
      } catch {
        // This exam's copy cannot be read: it is passed over, as readLocalPath does.
      }
    }
    if (!best) return;
    const link = slot.querySelector("a");
    const title = slot.querySelector("[data-resume='title']");
    const note = slot.querySelector("[data-resume='steps']");
    if (!link || !title || !note) return;
    link.setAttribute("href", best[1]);
    title.textContent = best[2];
    if (steps > 0) note.textContent = steps === 1 ? oneStep : manySteps.replace("{n}", String(steps));
    slot.removeAttribute("hidden");
  } catch {
    // Storage is blocked: the list is shown without the card.
  }
}

/** `fillResumeCard` as the text of an inline script that acts on the element before it. */
function resumeScript(flag: string): string {
  const exams = PATH_CERTS.map((cert) => [pathStorageKey(cert), `/path/${cert}${flag}`, resumeTitle(cert)]);
  const args = [exams, ONE_STEP, MANY_STEPS].map((arg) => JSON.stringify(arg).replace(/</g, "\\u003c")).join(",");
  return `(${fillResumeCard.toString()})(document.currentScript.previousElementSibling,${args})`;
}

/** Whether this device still holds an A+ study path under the slug it had before 220-1201 and 220-1202. */
function holdsPreV15Path(): boolean {
  try {
    return Object.values(PRE_V15_SLUG).some((old) => window.localStorage.getItem(pathStorageKey(old)) !== null);
  } catch {
    return false;
  }
}

/**
 * The only choice on CertBench: which exam. A ruled list, a row per exam, each
 * straight into that exam's path; an exam with two versions asks which one
 * first. A path already started on this device is offered first. `upgraded`:
 * just paid, so the path opens with the unlock moment.
 */
export function ExamPicker({
  surface,
  upgraded = false,
  heading,
  className,
}: {
  surface: string;
  upgraded?: boolean;
  /** The question, printed as the list's head where the page doesn't ask it. */
  heading?: string;
  className?: string;
}) {
  /** The versioned exam whose versions are showing, by its newest version's slug. */
  const [open, setOpen] = useState<PathCert | null>(null);
  const flag = upgraded ? "?upgraded=1" : "";

  // This device's storage, read as the list is drawn. The server's markup, and
  // the first pass over it in the browser, hold NOT_READ instead.
  const [store] = useState(createResumeStore);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, () => NOT_READ);
  const fromServer = snapshot === NOT_READ;
  const resume = fromServer ? null : parseResume(snapshot);

  // An A+ path begun before 220-1201/1202 is offered under its exam today.
  useEffect(() => {
    if (!holdsPreV15Path()) return;
    let live = true;
    void Promise.all(PATH_CERTS.map(carryOverPreV15Path)).then(() => {
      if (live) store.refresh();
    });
    return () => {
      live = false;
    };
  }, [store]);

  const rows: ReactNode[] = TILES.map((tile) => {
    const [first] = tile;
    if (tile.length === 1) {
      return (
        <li key={first}>
          <Link
            href={`/path/${first}${flag}`}
            onClick={() => track("path_exam_picked", { cert: first, surface })}
            className={rowClass}
          >
            <span className="min-w-0 flex-1 text-body font-semibold sm:text-lede">{EXAM_LIST[first].name}</span>{" "}
            <span className="shrink-0 text-right font-mono text-note text-muted-foreground">{EXAM_CODES[first]}</span>{" "}
            <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-primary">
              Start
              <LinkArrow className="size-4" />
            </span>
          </Link>
        </li>
      );
    }
    const isOpen = open === first;
    return (
      <li key={first}>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={`exam-versions-${first}`}
          onClick={() => {
            setOpen(isOpen ? null : first);
            if (!isOpen) track("path_versions_opened", { exam: EXAM_LIST[first].name, surface });
          }}
          className={cn(rowClass, isOpen && "bg-tint-selected")}
        >
          {/* On a narrow phone (320px) the two codes and "Choose" leave too
              little room beside the name, and a name allowed to shrink was
              drawn under the codes. There the codes are set on a line of their
              own under the name; from 400px they stand beside it, as on the
              other rows. */}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 min-[400px]:flex-row min-[400px]:items-center min-[400px]:gap-4">
            <span className="shrink-0 text-body font-semibold sm:text-lede">{EXAM_LIST[first].name}</span>{" "}
            {/* Each code is set in the code face; the word between them is not a code. */}
            <span className="text-note text-muted-foreground min-[400px]:flex-1 min-[400px]:text-right">
              {tile.map((c, i) => (
                <Fragment key={c}>
                  {i > 0 && " and "}
                  <span className="whitespace-nowrap font-mono">{EXAM_CODES[c]}</span>
                </Fragment>
              ))}
            </span>
          </span>{" "}
          <span className="inline-flex shrink-0 items-center gap-1 text-small font-semibold text-primary">
            Choose
            <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
          </span>
        </button>
        {isOpen && <VersionChoice versions={tile} flag={flag} surface={surface} />}
      </li>
    );
  });

  return (
    <div className={cn("grid gap-3", className)}>
      {fromServer ? (
        <>
          {/* The card as the server sends it: empty and out of sight. The script
              after it fills it in before first paint on a device that has started
              a study path, so each of these elements may differ from what was
              sent by the time the page's own scripts take it over. */}
          <div hidden suppressHydrationWarning>
            {/* The script gives the link its address: until then it leads nowhere. */}
            <a suppressHydrationWarning className={RESUME_CARD}>
              <span className="grid gap-0.5 text-left">
                <span data-resume="title" suppressHydrationWarning className={RESUME_TITLE}>
                  {""}
                </span>{" "}
                <span data-resume="steps" suppressHydrationWarning className={cn(RESUME_STEPS, "empty:hidden")}>
                  {""}
                </span>
              </span>
              <ArrowRight aria-hidden className="size-5 shrink-0 text-primary" />
            </a>
          </div>
          <script dangerouslySetInnerHTML={{ __html: resumeScript(flag) }} />
        </>
      ) : (
        resume && (
          <Link
            href={`/path/${resume.cert}${flag}`}
            onClick={() => track("path_exam_picked", { cert: resume.cert, surface: `${surface}_resume` })}
            className={RESUME_CARD}
          >
            <span className="grid gap-0.5 text-left">
              <span className={RESUME_TITLE}>{resumeTitle(resume.cert)}</span>{" "}
              {resume.steps > 0 && <span className={RESUME_STEPS}>{stepsSentence(resume.steps)}</span>}
            </span>
            <LinkArrow className="size-5 shrink-0 text-primary" />
          </Link>
        )
      )}
      <div className="glass overflow-hidden rounded-lg text-left">
        {heading && (
          <p className="border-b border-border bg-muted px-4 py-2.5 text-small font-medium text-muted-foreground sm:px-5">
            {heading}
          </p>
        )}
        <ul className="divide-y divide-border">{rows}</ul>
      </div>
    </div>
  );
}

/** Which version of an exam: a row per version, newest first, and how to tell. */
function VersionChoice({ versions, flag, surface }: { versions: PathCert[]; flag: string; surface: string }) {
  const [newest] = versions;
  const retiring = versions.find((c) => LAST_EXAM_DAY[c]);
  return (
    <div id={`exam-versions-${newest}`} className="path-rise grid gap-2 border-t border-border bg-muted/70 p-3 sm:p-4">
      <p className="px-1 text-small font-medium">Which {EXAM_LIST[newest].name} exam are you taking?</p>
      {versions.map((cert) => (
        <Link
          key={cert}
          href={`/path/${cert}${flag}`}
          onClick={() => track("path_exam_picked", { cert, surface })}
          className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-4 py-3 transition-[border-color] hover:border-primary"
        >
          <span className="grid gap-0.5">
            <span className="font-mono text-small font-medium">{EXAM_CODES[cert]}</span>{" "}
            <span className="text-note text-muted-foreground">
              {versionNote(cert)} It has {objectiveCount(cert)}.
            </span>
          </span>
          <LinkArrow className="size-4 shrink-0 text-primary" />
        </Link>
      ))}
      {retiring && (
        <p className="px-1 text-note text-muted-foreground">
          If you will take the exam in English after {longDate(LAST_EXAM_DAY[retiring]!)}, choose{" "}
          <span className="whitespace-nowrap">{EXAM_CODES[newest]}</span>.
        </p>
      )}
    </div>
  );
}
