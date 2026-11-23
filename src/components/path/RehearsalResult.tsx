"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Timer, X } from "lucide-react";
import { OPTION_LETTERS } from "@/components/quiz/AnswerOption";
import { biggestOpportunity } from "@/core/path/checkpoint";
import { domainOf } from "@/core/path/rehearsal";
import type { PathStructure } from "@/core/path/types";
import { READINESS_TARGET } from "@/lib/readiness/band";
import { domainName } from "@/lib/seo/objective-meta";
import type { RehearsalRun } from "./rehearsal-run";
import { OpportunityNote, ReadingCard } from "./PathReveal";
import { cn } from "@/lib/utils";

/** The headline: how the score moved since the reading before. */
function headline(score: number, before: NonNullable<RehearsalRun["done"]>["before"]): string {
  const ready = score >= READINESS_TARGET;
  const points = (n: number) => `${n} ${n === 1 ? "point" : "points"}`;
  if (!before) return ready ? "You met the readiness target." : "This is where you stand.";
  const delta = score - before.score;
  const since = before.source === "checkpoint" ? "your checkpoint" : "your last practice exam";
  if (delta > 0)
    return ready
      ? `You met the readiness target, ${points(delta)} above ${since}.`
      : `Your result is ${points(delta)} higher than ${since}.`;
  if (delta === 0) return ready ? "You met the readiness target." : `Your result is the same as ${since}.`;
  return `Your result is ${points(-delta)} lower than ${since}.`;
}

/**
 * A finished practice exam: the score against the readiness target, counted
 * from the reading before; how each domain went; the time it took; the way on
 * (`children`); and every answer to look back over, the missed ones first. The
 * study path and the public practice exams both report on it.
 *
 * It is shown in answer to a press or to the clock running out, so it takes the
 * focus as it arrives (`takeFocus`): a screen reader is told that this is the
 * result, and that the time limit was reached when it was, before anything else.
 *
 * On the study path the result is a screen of its own, and its headline is
 * that screen's title (`headlineAs="h1"`). On a public page it stands under the
 * page's own title, and the headline is an h2. "Your answers" is the heading
 * one level under the headline in both places.
 */
export function RehearsalResult({
  run,
  structure,
  label = "Practice exam",
  caption = "Practice exam result",
  headlineAs = "h2",
  takeFocus = true,
  children,
}: {
  run: RehearsalRun & { done: NonNullable<RehearsalRun["done"]> };
  structure: PathStructure;
  /** What this sitting is called above the score. */
  label?: string;
  /** The words above the score's figure. */
  caption?: string;
  /** "h1" where the result is the title of the screen it is on (the study path). */
  headlineAs?: "h1" | "h2";
  /** False where the page that shows it moves the focus itself. */
  takeFocus?: boolean;
  children: ReactNode;
}) {
  const { result, before, timedOut } = run.done;
  const minutesUsed = Math.max(1, Math.round(result.seconds / 60));
  // The sitting's own limit: a public practice exam can be taken with extended time.
  const limit = Math.round(run.limitMs / 60_000);
  const unanswered = result.total - result.answered;
  const opportunity = biggestOpportunity(result, structure.domains);
  const fell = before !== null && result.score < before.score;
  const name = `${structure.examName} ${label.toLowerCase()}`;

  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (takeFocus) rootRef.current?.focus({ preventScroll: true });
  }, [takeFocus]);

  return (
    <div
      ref={rootRef}
      // Takes the focus so that it is read; it is not a control.
      tabIndex={-1}
      role="group"
      aria-label={`${timedOut ? "The time limit was reached. " : ""}${name} result`}
      className="path-rise grid grid-cols-[minmax(0,1fr)] gap-6"
    >
      <ReadingCard
        result={result}
        structure={structure}
        kicker={name}
        headline={headline(result.score, before)}
        headlineAs={headlineAs}
        caption={caption}
        from={before?.score}
        summary={
          <>
            You scored {result.score}% across {result.total} questions, weighted in the same way as the domains of
            the real exam.
            {fell &&
              " A single exam can vary by a few points. The questions that you missed will return in your next steps."}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {opportunity && <OpportunityNote domain={opportunity} />}
        <div className={cn("glass flex gap-3 rounded-lg p-4 sm:p-5", !opportunity && "sm:col-span-2")}>
          {/* In the ink of the note beside it: the pressable colour is kept for what can be pressed. */}
          <Timer className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="grid content-start gap-0.5 text-small">
            <span className="font-medium">
              {timedOut ? `The time limit of ${limit} minutes was reached.` : `You used ${minutesUsed} of ${limit} minutes.`}
            </span>
            <span className="text-muted-foreground">
              {unanswered === 0
                ? "You answered every question."
                : `${unanswered} ${unanswered === 1 ? "question was" : "questions were"} left unanswered and counted as incorrect.`}
            </span>
          </div>
        </div>
      </div>

      {children}

      <RehearsalAnswers run={run} structure={structure} headingAs={headlineAs === "h1" ? "h2" : "h3"} />
    </div>
  );
}

function RehearsalAnswers({
  run,
  structure,
  headingAs: Heading,
}: {
  run: RehearsalRun;
  structure: PathStructure;
  /** One level under the result's headline. */
  headingAs: "h2" | "h3";
}) {
  const items = run.reps.map((rep, i) => ({ rep, i, pick: run.picks[i], right: run.picks[i] === rep.answer }));
  const missed = items.filter((x) => !x.right);
  const [show, setShow] = useState<"missed" | "all">(missed.length > 0 ? "missed" : "all");
  const list = show === "missed" ? missed : items;
  const domainTitle = new Map(structure.domains.map((d) => [d.number, domainName(d.title)]));

  return (
    <section className="glass grid gap-5 rounded-lg p-5 sm:p-6" aria-labelledby="rehearsal-answers">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Heading id="rehearsal-answers" className="cb-statement">
          Your answers
        </Heading>
        {/* A filter of the one list under it: two buttons, of which one is
            pressed. They are not tabs, which would each need a panel of their
            own and the arrow keys to move between them. */}
        <div role="group" aria-label="Which answers to show" className="inline-flex rounded-md bg-muted p-1 text-small">
          {(
            [
              ["missed", `Missed (${missed.length})`],
              ["all", `All (${items.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={show === key}
              onClick={() => setShow(key)}
              className={cn(
                "cb-tap rounded-xs px-3 py-1 font-medium transition-colors duration-100",
                show === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-small text-muted-foreground">You did not miss any questions.</p>
      ) : (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-4">
          {list.map(({ rep, i, pick, right }) => (
            <li
              key={rep.id}
              className="grid grid-cols-[minmax(0,1fr)] gap-3 rounded-md border border-border bg-card p-4 [overflow-wrap:anywhere] sm:p-5"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-small">
                <span className="min-w-0 text-muted-foreground" title={domainTitle.get(domainOf(rep.objective))}>
                  Question {i + 1}, Domain {domainOf(rep.objective).replace(/\.0$/, "")}
                </span>
                <span className={cn("shrink-0 font-medium", right ? "text-success" : "text-destructive")}>
                  {pick === null ? "Not answered" : right ? "Correct" : "Incorrect"}
                </span>
              </div>
              <p className="text-small font-medium">{rep.prompt}</p>
              <ul className="grid gap-1.5">
                {rep.options.map((option, k) => {
                  const isAnswer = k === rep.answer;
                  const isPick = k === pick;
                  return (
                    <li
                      key={`${k}-${option}`}
                      className={cn(
                        "flex items-start gap-2.5 rounded-md px-3 py-2 text-small",
                        isAnswer && "bg-success/10",
                        isPick && !isAnswer && "bg-destructive/10",
                        !isAnswer && !isPick && "text-muted-foreground"
                      )}
                    >
                      {/* The same size as the answer beside it, so the two share a line. */}
                      <span className="w-4 shrink-0 text-muted-foreground" aria-hidden>
                        {OPTION_LETTERS[k]}
                      </span>
                      <span className="min-w-0 flex-1">{option}</span>
                      {isAnswer && (
                        <>
                          <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                          <span className="sr-only">
                            {isPick ? "(the correct answer, and your answer)" : "(the correct answer)"}
                          </span>
                        </>
                      )}
                      {isPick && !isAnswer && (
                        <>
                          <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
                          <span className="sr-only">(your answer, which is incorrect)</span>
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="text-small">{rep.takeaway}</p>
              {rep.explanation && (
                <details className="text-small text-muted-foreground">
                  <summary className="cb-tap w-fit cursor-pointer select-none font-medium text-foreground marker:text-muted-foreground">
                    Read the full explanation
                  </summary>
                  <p className="mt-2">{rep.explanation}</p>
                </details>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
