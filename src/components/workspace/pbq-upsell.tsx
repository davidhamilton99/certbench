"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

/** Post-result CTA — "convert at the win", shown after a scenario is graded. */
export interface PbqUpsell {
  heading: string;
  note: string;
  href: string;
  label: string;
  /** Analytics label for the funnel, e.g. "public_pbq" / "authed_pbq". */
  context?: string;
}

/**
 * The convert-at-the-win card. Rendered after any PBQ / simulation / topology /
 * threat-hunt is graded, just above the retry/back actions, so the pitch lands
 * on the success — not buried in a pricing page the user never opens.
 */
export function PbqUpsellCard({ upsell }: { upsell: PbqUpsell }) {
  const context = upsell.context ?? upsell.href;

  useEffect(() => {
    track("upsell_viewed", { context });
  }, [context]);

  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-5">
      <h3 className="text-[15px] font-semibold text-foreground">
        {upsell.heading}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {upsell.note}
      </p>
      <Button asChild className="mt-3">
        <Link
          href={upsell.href}
          onClick={() => track("upsell_clicked", { context, href: upsell.href })}
        >
          {upsell.label}
        </Link>
      </Button>
    </div>
  );
}
