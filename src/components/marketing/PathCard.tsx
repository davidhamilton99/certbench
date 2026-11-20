"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * A public page's way onto the guided path: one big line, one short one, one
 * button, on a panel with the light pooling under it. Clicks are counted per
 * page as `upsell_clicked` with the page's `context`.
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
    <section
      className={cn(
        "glass relative isolate overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-[-60%] -z-10 h-full [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_24%,transparent),transparent)]"
      />
      <div className="mx-auto grid max-w-xl justify-items-center gap-4">
        {kicker && (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{kicker}</p>
        )}
        <h2 className="cb-display text-balance text-[2rem] sm:text-5xl">{title}</h2>
        <p className="text-balance leading-relaxed text-muted-foreground">{children}</p>
        <Button asChild size="lg" className="mt-2">
          <Link href={href} onClick={() => track("upsell_clicked", { context, href })}>
            {label}
            <ArrowRight />
          </Link>
        </Button>
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
      </div>
    </section>
  );
}
