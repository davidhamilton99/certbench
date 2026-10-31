import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A still of the guided path for the homepage hero: one rep mid-stop, answered
 * right, above the exam map it's filling in. Real Security+ content, drawn with
 * the same pieces the path uses. Decorative — the picker beside it is the action.
 */
const OPTIONS = ["Deterrent", "Detective", "Preventive", "Compensating"];
const ANSWER = 0;

const DOMAINS: { n: string; tiles: ("got" | "missed" | "new" | "next")[] }[] = [
  { n: "1", tiles: ["got", "next", "new", "got"] },
  { n: "2", tiles: ["new", "got", "new", "got", "new"] },
  { n: "3", tiles: ["new", "new", "new", "new"] },
  { n: "4", tiles: ["new", "new", "new", "new", "got", "missed", "new", "new", "new"] },
  { n: "5", tiles: ["new", "new", "new", "new", "new", "new"] },
];

const TILE = {
  got: "bg-success",
  missed: "bg-warning",
  new: "bg-muted ring-1 ring-inset ring-border",
  next: "bg-primary/20 ring-2 ring-primary",
};

export function PathShowcase() {
  return (
    <div aria-hidden className="relative w-full max-w-md select-none">
      <div className="pointer-events-none absolute -inset-10 -z-10 rounded-full bg-primary/10 blur-3xl" />

      <div className="glass rounded-3xl p-5 shadow-xl sm:p-6">
        <div className="mb-5 grid gap-2.5">
          <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            <span>
              Stop 2 of 35 <span className="text-foreground">· Security controls</span>
            </span>
            <span className="tabular-nums">6 / 8</span>
          </div>
          <div className="flex gap-1">
            {["bg-success", "bg-success", "bg-warning", "bg-success", "bg-success", "bg-primary", "bg-muted", "bg-muted"].map(
              (c, i) => (
                <span key={i} className={cn("h-1.5 flex-1 rounded-full", c)} />
              )
            )}
          </div>
        </div>

        <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-primary">
          Quick scenario
        </span>
        <p className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight">
          A sign reads &ldquo;This area is under video surveillance.&rdquo; Which control type is the sign?
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {OPTIONS.map((o, i) => (
            <div
              key={o}
              className={cn(
                "flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm",
                i === ANSWER ? "border-success bg-success/10" : "opacity-45"
              )}
            >
              <span
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-md border font-mono text-[10px] text-muted-foreground",
                  i === ANSWER && "border-success bg-success text-success-foreground"
                )}
              >
                {i === ANSWER ? <Check className="size-3" strokeWidth={3} /> : i + 1}
              </span>
              {o}
            </div>
          ))}
        </div>

        <p className="mt-3 rounded-xl bg-success/10 px-3 py-2.5 text-sm leading-relaxed">
          <span className="font-semibold text-success">Right.</span> Deterrent controls discourage an
          attack before it starts.
        </p>
      </div>

      <div className="glass relative -mt-3 ml-6 mr-[-0.5rem] rounded-2xl p-4 shadow-lg sm:ml-10">
        <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          Your Security+ map · 6 of 28 started
        </p>
        <div className="grid gap-1.5">
          {DOMAINS.map((d) => (
            <div key={d.n} className="flex items-center gap-2">
              <span className="w-3 font-mono text-[10px] text-muted-foreground">{d.n}</span>
              <div className="flex flex-wrap gap-1">
                {d.tiles.map((t, i) => (
                  <span key={i} className={cn("h-3 w-5 rounded-[4px]", TILE[t])} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
