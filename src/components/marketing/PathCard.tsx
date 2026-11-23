"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { LinkArrow } from "@/components/ui/link-arrow";
import { COLUMN, PAGE } from "@/components/marketing/lander/layout";
import { cn } from "@/lib/utils";

/**
 * A public page's way onto the study path: the navy band, with one heading,
 * one or two sentences and one button. It is set left on the page's edge, and
 * it runs the full width of whatever holds it: placed straight inside the
 * page it is a band from one side of the window to the other, as the header
 * is. Clicks are counted for each page as `upsell_clicked` with the page's
 * `context`.
 */
export function PathCard({
  kicker,
  title,
  children,
  href,
  label,
  context,
  note = "It is free, and you do not need an account to start.",
  className,
}: {
  /** A short line over the title. Use it only for a fact the title does not hold, such as the exam. */
  kicker?: string;
  title: string;
  children: ReactNode;
  href: string;
  label: string;
  /** Analytics context for the click, e.g. "subnet_calculator". */
  context: string;
  /** Under the button; null for none. */
  note?: string | null;
  className?: string;
}) {
  return (
    <section className={cn("cb-sheet", className)}>
      {/* One column that can shrink: on a narrow screen a long title or
          button wraps inside the band and never pushes past its edge. */}
      <div className={cn(PAGE, "grid grid-cols-[minmax(0,1fr)] justify-items-start gap-4 py-12 text-left sm:py-16")}>
        {kicker && <p className="cb-label text-muted-foreground">{kicker}</p>}
        <h2 className={cn("cb-subsection", COLUMN)}>{title}</h2>
        <p className="cb-measure text-body text-muted-foreground">{children}</p>
        <Button asChild size="lg" className="mt-2 h-auto min-h-12 max-w-full whitespace-normal py-2.5 text-left">
          <Link href={href} onClick={() => track("upsell_clicked", { context, href })}>
            {label}
            <LinkArrow />
          </Link>
        </Button>
        {note && <p className="text-small text-muted-foreground">{note}</p>}
      </div>
    </section>
  );
}
