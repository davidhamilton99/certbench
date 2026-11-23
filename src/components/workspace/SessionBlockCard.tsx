import Link from "next/link";
import type { SessionBlock } from "@/core/session-plan/compute-plan";

/** Maps a session block to the route that starts it. */
function blockHref(block: SessionBlock, certSlug: string): string {
  const base = `/certifications/${certSlug}`;
  switch (block.type) {
    case "diagnostic":
      return `${base}/diagnostic`;
    case "srs_review":
      return `${base}/srs`;
    case "domain_drill":
      return `${base}/domain/${block.domainId}`;
    case "weak_points":
      return `${base}/exam?type=weak_points`;
    case "practice_exam":
      return `${base}/exam?type=full`;
    case "new_content":
      return `${base}/exam?type=full&fresh=1`;
  }
}

/**
 * One piece of today's work on the study plan: its place in the order, what it
 * is, why it is there and how long it takes. The whole row is the link that
 * starts it.
 *
 * It is drawn in ink on paper. The plan's kinds of work used to be told apart
 * by a coloured tile each (green, amber, red); those colours are kept for
 * marks on answers and for scores, so the order and the words say it here.
 */
export function SessionBlockCard({
  block,
  certSlug,
  order,
  locked = false,
}: {
  block: SessionBlock;
  certSlug: string;
  /** The block's place in today's plan, from 1. */
  order?: number;
  /** The free plan's allowance for today does not cover this block (the server enforces it). */
  locked?: boolean;
}) {
  const size: string[] = [];
  if (block.questionCount !== undefined) {
    size.push(`${block.questionCount} ${block.questionCount === 1 ? "question" : "questions"}`);
  }
  if (block.estimatedMinutes !== undefined) {
    size.push(`about ${block.estimatedMinutes} ${block.estimatedMinutes === 1 ? "minute" : "minutes"}`);
  }

  return (
    <Link
      href={blockHref(block, certSlug)}
      className="glass flex items-start gap-4 rounded-lg p-5 transition-colors hover:border-primary hover:bg-tint-hover"
    >
      {order !== undefined && (
        <span
          aria-hidden
          className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-xs border border-input font-mono text-xs text-muted-foreground"
        >
          {order}
        </span>
      )}
      <span className="grid min-w-0 flex-1 gap-1">
        <span className="font-semibold">
          {order !== undefined && <span className="sr-only">{order}. </span>}
          {block.title}
        </span>
        <span className="text-small text-muted-foreground">{block.description}</span>
        {(size.length > 0 || locked) && (
          <span className="text-note text-muted-foreground">
            {size.length > 0 && (
              // Sentence case: "25 questions, about 20 minutes."
              <>{size.join(", ").replace(/^./, (c) => c.toUpperCase())}.</>
            )}
            {locked && <> This is included with Pro.</>}
          </span>
        )}
      </span>
    </Link>
  );
}
