"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

/**
 * A public page's way onto the guided path, in the path's own card: what the
 * path is, and one button there. Clicks are counted per page as
 * `upsell_clicked` with the page's `context`.
 */
export function PathCard({
  kicker,
  title,
  children,
  href,
  label,
  context,
  note = "Free, no account needed to start.",
  className,
}: {
  /** Small line over the title, e.g. "Next · your Network+ path". */
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
    <section className={`glass grid gap-5 rounded-3xl p-6 sm:p-8 ${className ?? ""}`}>
      <div className="grid gap-1.5">
        {kicker && (
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p>
        )}
        <h2 className="text-balance font-display text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-xl leading-relaxed text-muted-foreground">{children}</p>
      </div>
      <div className="grid gap-2 sm:justify-items-start">
        <Button asChild size="lg" className="h-12 w-full px-6 text-base sm:w-auto">
          <Link href={href} onClick={() => track("upsell_clicked", { context, href })}>
            {label}
            <ArrowRight />
          </Link>
        </Button>
        {note && <p className="text-center text-xs text-muted-foreground sm:text-left">{note}</p>}
      </div>
    </section>
  );
}
