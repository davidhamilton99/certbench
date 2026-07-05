import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  Clock,
  Compass,
  Crosshair,
  Lock,
  RotateCcw,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SessionBlock } from "@/core/session-plan/compute-plan";
import { cn } from "@/lib/utils";

const TILE: Record<SessionBlock["color"], string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/10 text-danger",
  urgency: "bg-danger/10 text-danger",
};

const ICON: Record<SessionBlock["type"], LucideIcon> = {
  diagnostic: Activity,
  srs_review: RotateCcw,
  domain_drill: Target,
  weak_points: Crosshair,
  practice_exam: ClipboardList,
  new_content: Compass,
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
  locked = false,
}: {
  block: SessionBlock;
  certSlug: string;
  /** 1-based position in today's plan, shown as a step number. */
  order?: number;
  /** Free plan can't cover this session today — badge it (server enforces). */
  locked?: boolean;
}) {
  const Icon = ICON[block.type];
  return (
    <Link href={blockHref(block, certSlug)} className="group block">
      <Card className="py-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-muted-foreground/25 group-hover:shadow-md">
        <CardContent className="flex items-center gap-4">
          <span
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
              TILE[block.color]
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="grid min-w-0 flex-1 gap-0.5">
            <span className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              {block.title}
              {locked && (
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  <Lock className="size-3" />
                  Pro
                </span>
              )}
            </span>
            <span className="text-sm text-muted-foreground">
              {block.description}
            </span>
            <span className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
              {order !== undefined && (
                <span className="font-mono text-muted-foreground/70">
                  {String(order).padStart(2, "0")}
                </span>
              )}
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
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}
