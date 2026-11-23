"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";

/** What a page may offer once a lab is graded: a sentence, a note and one way on. */
export interface PbqUpsell {
  heading: string;
  note: string;
  href: string;
  label: string;
  /** The analytics label for the funnel, for example "public_pbq" or "authed_pbq". */
  context?: string;
}

/**
 * The offer shown under a lab's score, above the buttons that repeat the lab
 * or leave it. It is a plain sheet like the others on the page: the one
 * coloured thing in it is the button.
 */
export function PbqUpsellCard({ upsell }: { upsell: PbqUpsell }) {
  const context = upsell.context ?? upsell.href;

  useEffect(() => {
    track("upsell_viewed", { context });
  }, [context]);

  return (
    <div className="glass rounded-lg p-5">
      <h3 className="text-base font-semibold leading-snug">{upsell.heading}</h3>
      <p className="cb-measure mt-1 text-small text-muted-foreground">{upsell.note}</p>
      <Button asChild className="mt-3">
        <Link href={upsell.href} onClick={() => track("upsell_clicked", { context, href: upsell.href })}>
          {upsell.label}
        </Link>
      </Button>
    </div>
  );
}
