"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ClipboardList } from "lucide-react";
import { isColumnar, toneLine, type EvidenceTone } from "@/core/pbq/evidence-tokens";
import { cn } from "@/lib/utils";

export interface Evidence {
  label: string;
  content: string;
}

/** The console's colours: GitHub's dark palette, readable on its near-black. */
const TONE: Record<EvidenceTone, string> = {
  plain: "",
  bad: "text-[#ff7b72]",
  warn: "text-[#ffa657]",
  good: "text-[#7ee787]",
  addr: "text-[#79c0ff]",
  id: "text-[#d2a8ff]",
  num: "text-[#a5d6ff]",
  dim: "text-[#8b949e]",
};

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
 * The briefing, three lines at most until it's opened: the start of the story
 * is in view and the rest is a tap away. The whole card opens it (replays
 * showed people clicking the briefing and nothing happening).
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
        "flex min-w-0 gap-3 rounded-xl border border-border bg-card/70 px-4 py-3",
        clipped && "cursor-pointer"
      )}
      onClick={clipped || open ? toggle : undefined}
    >
      <ClipboardList className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="grid min-w-0 gap-1">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Ticket</span>
        <p ref={body} className={cn("text-sm leading-relaxed text-foreground/90", !open && "line-clamp-3")}>
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
            className="w-fit text-xs font-medium text-primary hover:underline"
          >
            {open ? "Show less" : "Read the whole ticket"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * The stage's evidence as a console: one tab per clue, a dot on the ones not
 * opened yet, line numbers, and colour so failures, successes and addresses
 * stand out before a word is read.
 */
export function EvidenceConsole({ evidence }: { evidence: readonly Evidence[] }) {
  const [tab, setTab] = useState(0);
  const [seen, setSeen] = useState<ReadonlySet<number>>(() => new Set([0]));
  const [open, setOpen] = useState(true);
  const active = evidence[Math.min(tab, evidence.length - 1)];
  const columnar = isColumnar(active.content);
  const lines = active.content.replace(/\n+$/, "").split("\n");
  const tabs = evidence.length > 1;

  function pick(i: number) {
    setTab(i);
    setOpen(true);
    setSeen((prev) => (prev.has(i) ? prev : new Set([...prev, i])));
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f17] text-[#d6deeb] shadow-sm">
      <div className="flex min-w-0 items-start gap-2 border-b border-white/10 py-1.5 pl-3 pr-1.5">
        {/* Window dots: decoration, so on a phone the room goes to the clue tabs. */}
        <span className={cn("h-7 shrink-0 items-center gap-1.5", tabs ? "hidden sm:flex" : "flex")} aria-hidden>
          <span className="size-2.5 rounded-full bg-[#ff5f56]" />
          <span className="size-2.5 rounded-full bg-[#ffbd2e]" />
          <span className="size-2.5 rounded-full bg-[#27c93f]" />
        </span>
        {tabs ? (
          // Wrapping, not scrolling: every clue's tab stays in sight on a phone.
          <div role="tablist" aria-label="Evidence" className="flex min-w-0 flex-1 flex-wrap gap-1">
            {evidence.map((e, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === tab}
                title={e.label}
                onClick={() => pick(i)}
                className={cn(
                  "relative h-7 max-w-[7.5rem] truncate rounded-md px-2.5 font-mono text-[11px] transition-colors sm:max-w-[12rem]",
                  i === tab ? "bg-white/10 text-white" : "text-white/55 hover:bg-white/5 hover:text-white/85"
                )}
              >
                {e.label}
                {!seen.has(i) && (
                  <>
                    <span aria-hidden className="absolute right-1 top-1 size-1.5 rounded-full bg-[#ffa657]" />
                    <span className="sr-only"> (not opened yet)</span>
                  </>
                )}
              </button>
            ))}
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] leading-7 text-white/60" title={active.label}>
            {active.label}
          </span>
        )}
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? "Hide the evidence" : "Show the evidence"}
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-md p-1.5 text-white/50 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ChevronDown className={cn("size-4 transition-transform", !open && "-rotate-90")} />
        </button>
      </div>

      {open && (
        <div
          role={tabs ? "tabpanel" : undefined}
          aria-label={active.label}
          className="max-h-64 overflow-auto py-2 sm:max-h-80"
        >
          {/* Columns keep their spacing where there's room for them; on a phone,
              where a box that scrolls sideways goes unnoticed, every line wraps. */}
          <div className={cn(columnar && "sm:w-max sm:min-w-full")}>
            {tabs && <p className="px-3 pb-1 font-mono text-[11px] text-[#8b949e]"># {active.label}</p>}
            {lines.map((line, i) => (
              <div key={`${tab}-${i}`} className="flex gap-3 px-3 font-mono text-[12px] leading-relaxed">
                <span aria-hidden className="w-5 shrink-0 select-none text-right text-white/25">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "min-w-0 whitespace-pre-wrap break-words",
                    columnar && "sm:min-w-fit sm:whitespace-pre sm:break-normal"
                  )}
                >
                  {toneLine(line).map((t, k) => (
                    <span key={k} className={TONE[t.tone]}>
                      {t.text}
                    </span>
                  ))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
