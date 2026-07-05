import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionBlock } from "@/core/session-plan/compute-plan";
import { cn } from "@/lib/utils";

const ACCENT: Record<SessionBlock["color"], string> = {
  primary: "border-l-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
  urgency: "border-l-danger",
};

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

export function SessionBlockCard({
  block,
  certSlug,
  order,
}: {
  block: SessionBlock;
  certSlug: string;
  /** 1-based position in today's plan, shown as a step number. */
  order?: number;
}) {
  return (
    <Link href={blockHref(block, certSlug)} className="group block">
      <Card
        className={cn(
          "border-l-4 py-5 transition-all group-hover:border-l-8 group-hover:bg-accent/40",
          ACCENT[block.color]
        )}
      >
        <CardContent className="flex items-center justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <span className="flex items-baseline gap-2.5">
              {order !== undefined && (
                <span className="font-mono text-xs text-muted-foreground/70">
                  {String(order).padStart(2, "0")}
                </span>
              )}
              <span className="text-[15px] font-semibold tracking-tight">
                {block.title}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {block.description}
            </span>
            <span className="flex items-center gap-3 pt-1.5 text-xs text-muted-foreground">
              {block.questionCount !== undefined && (
                <span className="font-mono">{block.questionCount} questions</span>
              )}
              {block.estimatedMinutes !== undefined && (
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />~{block.estimatedMinutes} min
                </span>
              )}
            </span>
          </div>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
