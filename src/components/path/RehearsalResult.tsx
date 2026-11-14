"use client";

import { useState, type ReactNode } from "react";
import { Check, Timer, X } from "lucide-react";
import { biggestOpportunity } from "@/core/path/checkpoint";
import { REHEARSAL_FORMATS } from "@/core/path/rehearsal";
import type { PathStructure } from "@/core/path/types";
import type { RehearsalRun } from "./rehearsal-run";
import { OpportunityNote, ReadingCard } from "./PathReveal";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** The domain an objective sits in: "4.2" is in "4.0". */
export const domainOf = (objective: string) =>
  objective.includes(".") ? `${objective.split(".")[0]}.0` : objective;

/** The headline: how the dial moved since the reading before. */
function headline(score: number, before: NonNullable<RehearsalRun["done"]>["before"]): string {
  const ready = score >= 75;
  if (!before) return ready ? "Exam-ready on this run." : "Here's where you stand.";
  const delta = score - before.score;
  const since = before.source === "checkpoint" ? "your checkpoint" : "your last rehearsal";
  if (delta > 0) return ready ? `Up ${delta}, and exam-ready on this run.` : `Up ${delta} since ${since}.`;
  if (delta === 0) return ready ? "Exam-ready on this run." : `Level with ${since}.`;
  return `Down ${-delta} from ${since}.`;
}

/**
 * A finished exam rehearsal: the score on the readiness dial, swept from the
 * reading before; how each domain went; the time it took; the way on
 * (`children`); and every answer to look back over, misses first. A public
 * practice test reports on it under its own name (`label`, `caption`).
 */
export function RehearsalResult({
  run,
  structure,
  label = "Exam rehearsal",
  caption = "Rehearsal",
  children,
}: {
  run: RehearsalRun & { done: NonNullable<RehearsalRun["done"]> };
  structure: PathStructure;
  /** What this sitting is called above the score. */
  label?: string;
  /** The word under the dial's number. */
  caption?: string;
  children: ReactNode;
}) {
  const { result, before, timedOut } = run.done;
  const minutesUsed = Math.max(1, Math.round(result.seconds / 60));
  const limit = REHEARSAL_FORMATS[result.size].minutes;
  const unanswered = result.total - result.answered;
  const opportunity = biggestOpportunity(result, structure.domains);
  const fell = before !== null && result.score < before.score;

  return (
    <div className="path-rise grid gap-6">
      <ReadingCard
        result={result}
        structure={structure}
        kicker={`${label} · ${structure.examName}`}
        headline={headline(result.score, before)}
        caption={caption}
        from={before?.score}
        summary={
          <>
            {result.score}% across {result.total} questions, weighted the way the real exam weights its domains. 75%
            is where we call it exam-ready.
            {fell && " One sitting can swing a few points; your misses come back in the stops ahead."}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {opportunity && <OpportunityNote domain={opportunity} />}
        <div className={cn("flex gap-3 rounded-2xl border border-border bg-card p-4", !opportunity && "sm:col-span-2")}>
          <Timer className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="grid gap-0.5 text-sm">
            <span className="font-medium">
              {timedOut ? `Time ran out at ${limit} minutes` : `${minutesUsed} of ${limit} minutes`}
            </span>
            <span className="text-muted-foreground">
              {unanswered === 0
                ? "Every question answered."
                : `${unanswered} left unanswered, counted as wrong.`}
            </span>
          </div>
        </div>
      </div>

      {children}

      <RehearsalAnswers run={run} structure={structure} />
    </div>
  );
}

function RehearsalAnswers({ run, structure }: { run: RehearsalRun; structure: PathStructure }) {
  const items = run.reps.map((rep, i) => ({ rep, i, pick: run.picks[i], right: run.picks[i] === rep.answer }));
  const missed = items.filter((x) => !x.right);
  const [show, setShow] = useState<"missed" | "all">(missed.length > 0 ? "missed" : "all");
  const list = show === "missed" ? missed : items;
  const domainName = new Map(structure.domains.map((d) => [d.number, d.title]));

  return (
    <section className="glass grid gap-5 rounded-3xl p-5 sm:p-6" aria-labelledby="rehearsal-answers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="rehearsal-answers" className="font-display text-lg font-semibold tracking-tight">
          Your answers
        </h3>
        <div role="tablist" aria-label="Which answers" className="inline-flex rounded-full bg-muted p-1 text-sm">
          {(
            [
              ["missed", `Missed (${missed.length})`],
              ["all", `All (${items.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={show === key}
              onClick={() => setShow(key)}
              className={cn(
                "rounded-full px-3 py-1 font-medium transition-colors",
                show === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not one missed.</p>
      ) : (
        <ol className="grid gap-4">
          {list.map(({ rep, i, pick, right }) => (
            <li key={rep.id} className="grid gap-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
              <div className="flex items-baseline justify-between gap-3 font-mono text-[11px] uppercase tracking-wider">
                <span
                  className="min-w-0 truncate text-muted-foreground"
                  title={domainName.get(domainOf(rep.objective))}
                >
                  Question {i + 1} · Domain {domainOf(rep.objective).replace(/\.0$/, "")}
                </span>
                <span className={cn("shrink-0", right ? "text-success" : "text-destructive")}>
                  {pick === null ? "Unanswered" : right ? "Right" : "Missed"}
                </span>
              </div>
              <p className="text-[15px] font-medium leading-relaxed">{rep.prompt}</p>
              <ul className="grid gap-1.5">
                {rep.options.map((option, k) => {
                  const isAnswer = k === rep.answer;
                  const isPick = k === pick;
                  return (
                    <li
                      key={`${k}-${option}`}
                      className={cn(
                        "flex items-start gap-2.5 rounded-lg px-3 py-2 text-sm",
                        isAnswer && "bg-success/10",
                        isPick && !isAnswer && "bg-destructive/[0.07]",
                        !isAnswer && !isPick && "text-muted-foreground"
                      )}
                    >
                      <span className="mt-px font-mono text-[11px]" aria-hidden>
                        {LETTERS[k]}
                      </span>
                      <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{option}</span>
                      {isAnswer && (
                        <>
                          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                          <span className="sr-only">(the answer{isPick ? ", yours" : ""})</span>
                        </>
                      )}
                      {isPick && !isAnswer && (
                        <>
                          <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                          <span className="sr-only">(your answer)</span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm leading-relaxed">{rep.takeaway}</p>
              {rep.explanation && (
                <details className="text-sm text-muted-foreground">
                  <summary className="cursor-pointer select-none font-medium text-foreground marker:text-muted-foreground">
                    Why, in full
                  </summary>
                  <p className="mt-2 leading-relaxed">{rep.explanation}</p>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
