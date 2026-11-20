import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Tile {
  href: string;
  title: ReactNode;
  /** A code set in mono before the title: "1.2". */
  code?: string;
  /** A short line under the title. */
  detail?: ReactNode;
}

/**
 * Links as tiles: a grid of small cards instead of a column of full-width
 * rows, each lifting toward the light on hover. Groups get a small label.
 */
export function TileGrid({
  groups,
  columns = 3,
  details = "sm",
  className,
}: {
  groups: { label?: ReactNode; tiles: Tile[] }[];
  columns?: 2 | 3;
  /** Where the detail line shows: from sm (phones get a compact list), or always. */
  details?: "sm" | "always";
  className?: string;
}) {
  return (
    <div className={cn("grid gap-10", className)}>
      {groups.map((g, gi) => (
        <div key={gi} className="grid gap-3">
          {g.label && <p className="text-left text-sm font-medium">{g.label}</p>}
          <ul className={cn("grid gap-2.5 sm:grid-cols-2", columns === 3 && "lg:grid-cols-3")}>
            {g.tiles.map((t) => (
              <li key={t.href} className="min-w-0">
                <Link
                  href={t.href}
                  className="glass group flex h-full min-w-0 items-start gap-3 rounded-2xl px-4 py-3.5 text-left transition-[transform,border-color,box-shadow] duration-200 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_22px_50px_-30px_var(--primary)] sm:p-5"
                >
                  {t.code && (
                    <span className="mt-0.5 shrink-0 font-mono text-xs font-medium tabular-nums text-primary">{t.code}</span>
                  )}
                  <span className="grid min-w-0 flex-1 gap-1">
                    <span className="text-[15px] font-medium leading-snug">{t.title}</span>
                    {t.detail && (
                      <span
                        className={cn(
                          "text-[13px] leading-relaxed text-muted-foreground",
                          details === "always" ? "line-clamp-2" : "hidden sm:line-clamp-2"
                        )}
                      >
                        {t.detail}
                      </span>
                    )}
                  </span>
                  <ArrowUpRight
                    aria-hidden
                    className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-[color,transform] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
