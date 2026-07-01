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
}: {
  block: SessionBlock;
  certSlug: string;
}) {
  return (
    <Link href={blockHref(block, certSlug)} className="group block">
      <Card
        className={cn(
          "border-l-4 py-4 transition-colors group-hover:bg-accent/40",
          ACCENT[block.color]
        )}
      >
        <CardContent className="flex items-center justify-between gap-4">
          <div className="grid gap-0.5">
            <span className="font-medium">{block.title}</span>
            <span className="text-sm text-muted-foreground">
              {block.description}
            </span>
            <span className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
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
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  );
}
