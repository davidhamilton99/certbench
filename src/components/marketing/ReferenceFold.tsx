import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A long reference list folded away under its heading, on the path's glass:
 * every row is in the page from the start, for search and for anyone who
 * opens it, without standing between a visitor and the next thing to do.
 */
export function ReferenceFold({
  title,
  summary,
  children,
  className,
}: {
  title: string;
  /** One line under the heading, e.g. the best-known rows in brief. */
  summary: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={`group glass rounded-3xl ${className ?? ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-3xl p-5 sm:p-6 [&::-webkit-details-marker]:hidden">
        <span className="grid min-w-0 gap-1">
          <h2 className="text-balance text-xl font-semibold tracking-tight">{title}</h2>
          <span className="text-sm leading-relaxed text-muted-foreground">{summary}</span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-foreground">
          <span className="hidden group-open:hidden sm:inline">Show all</span>
          <span className="hidden sm:group-open:inline">Hide</span>
          <ChevronDown aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="border-t border-border/70 p-3 sm:p-4">{children}</div>
    </details>
  );
}
