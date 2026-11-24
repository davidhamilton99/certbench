"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { hangOf, isColumnar, isTable, toneLine, type EvidenceTone } from "@/core/pbq/evidence-tokens";
import { cn } from "@/lib/utils";

export interface Evidence {
  label: string;
  content: string;
}

/**
 * A hanging indent in characters of the code face: the wrapped part of a line
 * starts under its column. Never more than 40% of the evidence box's width
 * (cqw: the box is the container both lengths are measured in, where a
 * percentage would be the line's own width for one and its row's for the
 * other): at 320 pixels a deep column left a value 13 characters, and
 * "corp.internal" broke in two.
 */
export function hangStyle(line: string): CSSProperties | undefined {
  const n = hangOf(line);
  if (n === 0) return undefined;
  const depth = `min(${n}ch, 40cqw)`;
  return { paddingLeft: depth, textIndent: `calc(-1 * ${depth})` };
}

/**
 * What each run of text in a console is drawn in, by what it reports. These
 * are the theme's own ink and marks as they are on dark paper (see
 * ConsoleFrame): red for a failure, amber for a warning, green for a success,
 * the blue for what is picked out (an address, an identifier, a measure), and
 * the quiet ink for timestamps and rules.
 */
export const CONSOLE_TONE: Record<EvidenceTone, string> = {
  plain: "",
  bad: "text-destructive",
  warn: "text-warning",
  good: "text-success",
  addr: "text-primary",
  id: "text-primary",
  num: "text-primary",
  dim: "text-muted-foreground",
};

/**
 * The frame every lab's console is drawn in: the evidence of a simulation, a
 * device's configuration, the log of a threat hunt.
 *
 * A console is dark wherever it is met, so the frame is a sheet of dark paper
 * in both themes. The class `dark` gives everything inside it the dark
 * theme's tokens: its ink, its rules and its three marks. Nothing in a
 * console names a colour of its own, so a change to a token cannot leave one
 * console readable and another not. (That happened: text set in a light
 * theme's token on a fixed dark panel had a contrast of 1 to 1.)
 *
 * Inside the frame use `text-foreground`, `text-muted-foreground`, the marks
 * and CONSOLE_TONE. Do not use the tint tokens (`bg-tint-hover` and the
 * others) there: they are worked out once at the page's root, from the page's
 * theme and not the console's.
 */
export function ConsoleFrame({
  header,
  children,
  className,
}: {
  /** The bar at the top: what the console is showing, and its controls. */
  header: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "dark scheme-dark min-w-0 overflow-hidden rounded-lg border border-border bg-background text-foreground",
        className
      )}
    >
      {/* pr-2: a control at the bar's end keeps the whole of its touch area (cb-tap) inside the frame. */}
      <div className="flex min-w-0 items-start gap-2 border-b border-border py-1.5 pl-3 pr-2">{header}</div>
      {children}
    </div>
  );
}

/**
 * What a lab hands the player: the ticket (its briefing) and, for the stage
 * being played, the evidence in a console with a tab per clue. Remount it per
 * stage (key it) so each stage opens on its own first clue.
 */
export function CaseFile({ briefing, evidence }: { briefing: string; evidence?: readonly Evidence[] }) {
  return (
    <div className="grid min-w-0 gap-3">
      <Ticket text={briefing} />
      {evidence && evidence.length > 0 && <EvidenceConsole evidence={evidence} />}
    </div>
  );
}

/**
 * The briefing, three lines at most until it is opened: the start of the story
 * is in view and the rest is one press away. The whole card opens it (replays
 * showed people pressing the briefing and nothing happening); the button
 * inside it is the same action for a keyboard.
 */
export function Ticket({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [clipped, setClipped] = useState(false);
  const body = useRef<HTMLParagraphElement>(null);

  // Whether three lines cut it short, measured while it's closed.
  useEffect(() => {
    const el = body.current;
    if (!el || open) return;
    const measure = () => setClipped(el.scrollHeight > el.clientHeight + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);

  function toggle() {
    // Selecting text to copy shouldn't fold it away.
    if (window.getSelection?.()?.toString()) return;
    setOpen((o) => !o);
  }

  return (
    <div
      className={cn(
        "flex min-w-0 gap-3 rounded-lg border border-border bg-card px-4 py-3",
        clipped && "cursor-pointer"
      )}
      onClick={clipped || open ? toggle : undefined}
    >
      <ClipboardList className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="grid min-w-0 gap-1">
        <span className="cb-label text-muted-foreground">Ticket</span>
        {/* The size alone: `cn` would drop it beside a text colour (they share a prefix). */}
        <p ref={body} className={cn("text-small", !open && "line-clamp-3")}>
          {text}
        </p>
        {(clipped || open) && (
          <button
            type="button"
            aria-expanded={open}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((o) => !o);
            }}
            className="cb-link cb-tap w-fit text-note font-medium"
          >
            {open ? "Show less of the ticket" : "Read the whole ticket"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The stage's evidence as a console: one button per clue, a dot on the ones
 * not opened yet, line numbers, and colour so failures, successes and
 * addresses stand out before a word is read.
 *
 * The clues are a group of buttons, each pressed or not, as the subnetting
 * modes are: each is its own stop for the Tab key, which is what a button
 * promises. (They were tabs, which promise arrow keys that did nothing.) A
 * clue's name wraps and is never cut short, so it can be read at any width.
 */
export function EvidenceConsole({ evidence }: { evidence: readonly Evidence[] }) {
  const [tab, setTab] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [open, setOpen] = useState(true);
  const active = evidence[Math.min(tab, evidence.length - 1)];
  const columnar = isColumnar(active.content);
  const table = columnar && isTable(active.content);
  const lines = active.content.replace(/\n+$/, "").split("\n");
  const tabs = evidence.length > 1;
  // Whether a table is wider than its box, measured as the box and the
  // evidence change size, so that the line about scrolling sideways shows only
  // when there is something to scroll to.
  const box = useRef<HTMLDivElement>(null);
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const el = box.current;
    if (!el || !table || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setWide(el.scrollWidth > el.clientWidth + 1));
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [table, open, tab]);

  function pick(i: number) {
    setTab(i);
    setOpen(true);
    setSeen((prev) => (prev.has(i) ? prev : new Set([...prev, i])));
  }

  return (
    <ConsoleFrame
      header={
        <>
          {tabs ? (
            // Wrapping, not scrolling: every clue stays in sight on a phone.
            <div role="group" aria-label="Evidence" className="flex min-w-0 flex-1 flex-wrap gap-1">
              {evidence.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={i === tab}
                  onClick={() => pick(i)}
                  className={cn(
                    // A full-size target under a thumb: 44px tall on a touch screen.
                    "relative min-h-7 min-w-0 rounded-md px-2.5 py-1 text-left font-mono text-xs leading-5 transition-colors [overflow-wrap:anywhere] pointer-coarse:py-3",
                    i === tab
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  )}
                >
                  {e.label}
                  {!seen.has(i) && (
                    <>
                      <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-xs bg-primary" />
                      <span className="sr-only"> (not opened yet)</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <span className="min-w-0 flex-1 font-mono text-xs leading-7 text-muted-foreground [overflow-wrap:anywhere]">
              {active.label}
            </span>
          )}
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? "Hide the evidence" : "Show the evidence"}
            onClick={() => setOpen((o) => !o)}
            className="cb-tap shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            <ChevronDown aria-hidden className={cn("size-4 transition-transform", !open && "-rotate-90")} />
          </button>
        </>
      }
    >
      {open && table && wide && (
        <p className="px-3 pt-2 text-note text-muted-foreground">Scroll sideways to read each whole line.</p>
      )}
      {open && (
        <div
          ref={box}
          role="group"
          aria-label={active.label}
          // The evidence can scroll inside its box (sideways, and down too on a
          // screen that is wide and tall: `roomy`), so the box takes the
          // keyboard: the arrow keys then scroll it. On a phone, upright or on
          // its side, it is laid out at its full height (24 lines at most): a
          // box that scrolls inside a page that scrolls catches the thumb, and
          // a few lines were hidden for the sake of four pixels.
          tabIndex={0}
          className="overflow-x-auto py-2 [container-type:inline-size] focus-visible:-outline-offset-2 roomy:max-h-80 roomy:overflow-y-auto"
        >
          {/* A table (a tracert, an ACL) keeps every line whole at every width,
              and the box scrolls sideways where the lines are wider than it;
              the line above says so. Wrapped on a phone, a tracert's times and
              hosts fell under the wrong hop and a learner could not read which
              hop failed. Other output in columns ("Key : value", ipconfig)
              wraps, each wrapped part under its own column: scrolled sideways,
              every value of an ipconfig was off the screen. Other evidence
              wraps. */}
          <div className={cn(table && "w-max min-w-full")}>
            {tabs && <p className="px-3 pb-1 font-mono text-xs text-muted-foreground"># {active.label}</p>}
            {lines.map((line, i) => (
              <div
                key={`${tab}-${i}`}
                className="flex gap-3 px-3 font-mono text-xs leading-relaxed"
              >
                {/* Quieter than the evidence, and still above the contrast that
                    small text needs. Output in columns has none: it numbers its
                    own rows (a tracert's hops), and a line number beside a hop
                    number was read as the hop. */}
                {!columnar && (
                  <span aria-hidden className="w-5 shrink-0 select-none text-right text-muted-foreground/80">
                    {i + 1}
                  </span>
                )}
                <span
                  className={table ? "min-w-fit whitespace-pre" : "min-w-0 whitespace-pre-wrap break-words"}
                  // A wrapped part starts under its column: the first line is
                  // drawn from the start, the rest from the hang.
                  style={columnar && !table ? hangStyle(line) : undefined}
                >
                  {toneLine(line).map((t, k) => (
                    <span key={k} className={CONSOLE_TONE[t.tone]}>
                      {t.text}
                    </span>
                  ))}
                  {/* An empty line keeps its height: without a line number beside it, it had none. */}
                  {line === "" && " "}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ConsoleFrame>
  );
}
