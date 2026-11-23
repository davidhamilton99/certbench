import type { ReactNode, Ref } from "react";
import { ScoreBar, ScoreLevel } from "@/components/instrument/ScoreLevel";
import { bandFor } from "@/lib/readiness/band";

export interface ScoreReportDomain {
  id: string;
  /** The domain's number as the exam prints it: "1.0". */
  number: string;
  title: string;
  correct: number;
  total: number;
  /** The domain's share of the exam, as a percentage, where it is known. */
  weight?: number | null;
}

/**
 * A result in the signed-in workspace (the diagnostic, a practice exam, a
 * domain drill), drawn the way the study path draws its own: a sentence for a
 * heading, the score against the readiness target, and every domain under it
 * on the same scale. It replaces a coloured figure and a list of fractions.
 *
 * Every bar is drawn at its final length in the markup, with no delay, so the
 * report is right in a paused tab and in a session replay.
 *
 * A result from a small set of questions (the diagnostic, a drill) is not a
 * measure of readiness, so for those the mark at the readiness target is left
 * out (`readyMark={false}`) and `verdict` replaces the band's own words where
 * they would say more than the result can support. The study path's checkpoint
 * is reported the same way (ReadingCard in components/path/PathReveal.tsx).
 */
export function ScoreReport({
  heading,
  headingRef,
  caption,
  score,
  summary,
  domains,
  readyMark = true,
  verdict,
}: {
  /** The result as a sentence: "You have completed the Security+ SY0-701 diagnostic." */
  heading: string;
  /** Lets the screen that shows the report move the focus to it, so that it is read. */
  headingRef?: Ref<HTMLHeadingElement>;
  /** The small line over the figure: "Diagnostic result". */
  caption: string;
  /** 0 to 100. */
  score: number;
  summary?: ReactNode;
  domains: ScoreReportDomain[];
  /** The mark at the readiness target. Left out for a result too small to call anyone ready. */
  readyMark?: boolean;
  /** Beside the score, in place of the band's own words ("Target met" and so on). */
  verdict?: string;
}) {
  const band = bandFor(score);
  const asked = domains.filter((d) => d.total > 0);

  return (
    <section className="glass overflow-hidden rounded-lg">
      <div className="grid gap-5 p-5 sm:p-8">
        {/* Takes the focus when the result replaces the questions; it is not a control. */}
        <h2 ref={headingRef} tabIndex={-1} className="cb-statement">
          {heading}
        </h2>
        <ScoreLevel
          score={score}
          band={verdict ? { ...band, label: verdict } : band}
          caption={caption}
          readyMark={readyMark}
        />
        {summary && <p className="cb-measure text-small text-muted-foreground">{summary}</p>}
      </div>

      {asked.length > 0 && (
        <div className="grid gap-4 border-t border-border bg-muted/60 p-5 sm:p-8">
          <h3 className="text-small font-semibold">Results by domain</h3>
          <ul className="grid gap-3.5">
            {asked.map((d) => {
              const pct = Math.round((d.correct / d.total) * 100);
              return (
                <li
                  key={d.id}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)] items-center gap-x-5 gap-y-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
                >
                  <div className="flex min-w-0 items-baseline justify-between gap-3 text-small">
                    <span className="min-w-0">
                      <span className="sr-only">Domain </span>
                      <span className="mr-1 text-note tabular-nums text-muted-foreground">
                        {d.number.replace(/\.0$/, "")}
                      </span>{" "}
                      {d.title}
                      {d.weight != null && (
                        <span className="block text-note text-muted-foreground">{d.weight}% of the exam</span>
                      )}
                    </span>{" "}
                    <span className="shrink-0 text-note tabular-nums text-muted-foreground">
                      {d.correct} of {d.total}
                      <span className="sr-only"> correct</span>
                    </span>
                  </div>
                  <ScoreBar value={pct} color={bandFor(pct).accent} readyLine={readyMark} />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
