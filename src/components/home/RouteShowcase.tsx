import type { CSSProperties } from "react";
import { Flag } from "lucide-react";
import type { PathPlan, PathStop, PathStructure } from "@/core/path/types";
import { CHECKPOINT_SIZE, MINUTES_PER_STOP } from "@/core/path/plan";
import { cn } from "@/lib/utils";
import { InView } from "./InView";

/** Where the illustrated learner is: a few stops past the checkpoint. */
const HERE_AFTER = 9;

const domainLabel = (n: string) => n.replace(/\.0$/, "");

/**
 * The whole exam drawn as one route: every stop of the real plan in order,
 * domain by domain, a lab closing each, the checkpoint and the rehearsal as
 * milestones, exam day at the end. Lit up to "you", with light running on.
 * A row across on wider screens; a timeline down on phones.
 */
export function RouteShowcase({
  structure,
  plan,
  warmupSize,
  titles,
}: {
  structure: PathStructure;
  plan: PathPlan;
  /** Questions in the warm-up. */
  warmupSize: number;
  /** One-word domain names for the row across, where space is tight. */
  titles: Record<string, string>;
}) {
  const stops = plan.stops;
  const here = Math.min(HERE_AFTER, stops.length - 1);
  const count = stops.length + 1; // and exam day
  const x = (k: number) => `${((k + 0.5) / count) * 100}%`;
  const labs = stops.filter((s) => s.kind === "lab").length;
  const objectives = structure.domains.reduce((n, d) => n + d.objectives.length, 0);
  const spans = structure.domains.map((d) => {
    const idx = stops.filter((s) => s.domain === d.number).map((s) => s.index);
    return { domain: d, from: Math.min(...idx), to: Math.max(...idx) };
  });
  // The checkpoint sits among the first domain's stops; on the timeline it
  // follows the domain it falls in.
  const checkpoint = stops.find((s) => s.kind === "checkpoint");
  const checkpointAfter = checkpoint ? stops[checkpoint.index - 1]?.domain : null;

  const specs = [
    { value: String(stops.length), label: "stops to exam day" },
    { value: `${MINUTES_PER_STOP} min`, label: "a stop" },
    { value: String(labs), label: labs === 1 ? "hands-on lab" : "hands-on labs" },
    { value: String(objectives), label: "objectives, in order" },
  ];

  return (
    <InView as="section" className="relative py-20 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-5 px-6 text-center">
        <p className="cb-rise text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {structure.examName} {structure.examCode}
        </p>
        <h2
          className="cb-rise cb-display text-balance text-[2.6rem] sm:text-6xl lg:text-7xl"
          style={{ "--rise-delay": "60ms" } as CSSProperties}
        >
          The whole exam.
          <br />
          <span className="text-muted-foreground/70">One route.</span>
        </h2>
      </div>

      {/* Across, from sm up */}
      <div
        className="cb-rise relative mx-auto mt-16 hidden max-w-6xl px-6 sm:block"
        style={{ "--rise-delay": "140ms" } as CSSProperties}
        aria-hidden
      >
        <div className="relative h-14">
          {spans.map(({ domain, from, to }) => (
            <div
              key={domain.number}
              className="absolute bottom-2 grid gap-1 border-l border-border pl-2.5 text-left"
              style={{ left: x(from), width: `calc(${x(to)} - ${x(from)})` }}
            >
              <span className="truncate text-[13px] font-medium">
                <span className="mr-1.5 font-mono text-muted-foreground">{domainLabel(domain.number)}</span>
                <span className="hidden md:inline">{titles[domain.number] ?? domain.title}</span>
              </span>
              <span className="font-mono text-[11px] text-muted-foreground">{domain.weight}%</span>
            </div>
          ))}
          <span className="absolute bottom-2 right-6 text-[13px] font-medium">Exam day</span>
        </div>

        <div className="relative h-16">
          {/* the line, lit to "you", with light running along the rest */}
          <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-foreground/[0.09]">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-signal shadow-[0_0_14px_var(--primary)]"
              style={{ width: x(here) }}
            />
            <div className="cb-run absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
          </div>
          {stops.map((s) => (
            <Node key={s.id} stop={s} here={here} left={x(s.index)} />
          ))}
          <span
            className="absolute top-1/2 grid size-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-foreground/20 bg-background"
            style={{ left: x(stops.length) }}
          >
            <Flag className="size-3.5" />
          </span>
        </div>

        <div className="relative h-8 text-[13px] font-medium text-muted-foreground">
          {stops
            .filter((s) => s.kind === "checkpoint" || s.kind === "rehearsal")
            .map((s) => (
              <span key={s.id} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: x(s.index) }}>
                {s.kind === "checkpoint" ? "Checkpoint" : "Rehearsal"}
              </span>
            ))}
          <span className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-foreground" style={{ left: x(here) }}>
            You
          </span>
        </div>
      </div>

      {/* Down, on phones */}
      <ol className="cb-rise relative mx-auto mt-12 grid max-w-md px-6 sm:hidden" aria-label={`The ${structure.examName} route`}>
        <TimelineRow lit title="Warm-up" meta={`${warmupSize} questions`} />
        {spans.map(({ domain: d, from, to }) => {
          const current = from <= here && here <= to;
          const learn = stops.filter((s) => s.domain === d.number && s.kind === "learn").length;
          const hasLab = stops.some((s) => s.domain === d.number && s.kind === "lab");
          return [
            <TimelineRow
              key={d.number}
              lit={to < here || current}
              current={current}
              title={`${domainLabel(d.number)} · ${d.title}`}
              meta={`${learn} stops${hasLab ? " + lab" : ""} · ${d.weight}% of the exam`}
            />,
            checkpointAfter === d.number && checkpoint ? (
              <TimelineRow
                key="checkpoint"
                lit={checkpoint.index < here}
                milestone
                title="Readiness checkpoint"
                meta={`${CHECKPOINT_SIZE} questions`}
              />
            ) : null,
          ];
        })}
        <TimelineRow milestone title="Exam rehearsal" meta="Timed, like the real one" />
        <TimelineRow flag title="Exam day" last />
      </ol>

      <dl className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-y-10 px-6 sm:mt-20 sm:grid-cols-4">
        {specs.map((s, k) => (
          <div
            key={s.label}
            className="cb-rise grid justify-items-center gap-1 text-center"
            style={{ "--rise-delay": `${200 + k * 70}ms` } as CSSProperties}
          >
            <dt className="order-2 text-sm text-muted-foreground">{s.label}</dt>
            <dd className="cb-display order-1 text-4xl sm:text-5xl">{s.value}</dd>
          </div>
        ))}
      </dl>
    </InView>
  );
}

function Node({ stop, here, left }: { stop: PathStop; here: number; left: string }) {
  const lit = stop.index < here;
  const style = { left } as CSSProperties;
  const base = "absolute top-1/2 -translate-x-1/2 -translate-y-1/2";

  if (stop.index === here) {
    return (
      <span className={cn(base, "grid size-5 place-items-center")} style={style}>
        <span className="cb-ping absolute inset-0 rounded-full bg-primary" />
        <span className="relative size-5 rounded-full border-[3px] border-background bg-primary shadow-[0_0_0_1.5px_var(--primary),0_0_18px_var(--primary)]" />
      </span>
    );
  }
  if (stop.kind === "checkpoint" || stop.kind === "rehearsal") {
    return (
      <span
        className={cn(
          base,
          "size-[1.125rem] rounded-full border-2 bg-background",
          lit ? "border-signal shadow-[0_0_12px_var(--signal)]" : "border-foreground/35"
        )}
        style={style}
      />
    );
  }
  if (stop.kind === "lab") {
    return (
      <span
        className={cn(
          base,
          "size-3 rotate-45 rounded-[3px]",
          lit ? "bg-signal shadow-[0_0_10px_var(--signal)]" : "bg-foreground/25"
        )}
        style={style}
      />
    );
  }
  return (
    <span
      className={cn(
        base,
        stop.kind === "practice" ? "size-2" : "size-2.5",
        "rounded-full",
        lit ? "bg-primary shadow-[0_0_8px_var(--primary)]" : "bg-foreground/25"
      )}
      style={style}
    />
  );
}

function TimelineRow({
  title,
  meta,
  lit = false,
  current = false,
  milestone = false,
  flag = false,
  last = false,
}: {
  title: string;
  meta?: string;
  lit?: boolean;
  current?: boolean;
  milestone?: boolean;
  flag?: boolean;
  last?: boolean;
}) {
  return (
    <li className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-3 pb-5">
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-0 left-[0.875rem] top-4 w-[2px] -translate-x-1/2",
            lit && !current ? "bg-gradient-to-b from-primary to-signal" : "bg-foreground/10"
          )}
        />
      )}
      <span className="relative mt-0.5 grid size-7 place-items-center" aria-hidden>
        {current && <span className="cb-ping absolute inset-1 rounded-full bg-primary" />}
        {flag ? (
          <Flag className="size-4 text-foreground" />
        ) : (
          <span
            className={cn(
              "relative rounded-full",
              milestone ? "size-3.5 border-2 bg-background" : "size-2.5",
              milestone && (lit ? "border-signal" : "border-foreground/35"),
              !milestone && (lit ? "bg-primary shadow-[0_0_10px_var(--primary)]" : "bg-foreground/25")
            )}
          />
        )}
      </span>
      <span className="grid gap-0.5 pt-0.5 text-left">
        <span className={cn("text-[15px] font-medium leading-snug", !lit && !flag && "text-foreground/75")}>
          {title}
          {current && <span className="ml-2 text-xs font-medium text-primary">You</span>}
        </span>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </span>
    </li>
  );
}
