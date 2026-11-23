"use client";

import { useEffect, useState } from "react";
import { useLinkStatus } from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** A navigation quicker than this shows no spinner at all: nothing to wait for. */
const SHOW_AFTER_MS = 120;

/**
 * The arrow at the end of a link, which says so when the link has been pressed
 * and its page is still on the way. A study path is drawn for the visitor when
 * they ask for it, which can take a second or two; until now the page they
 * pressed on gave no sign of having heard them. The arrow turns into the
 * small spinner for exactly that wait and for nothing else.
 *
 * Use it as a child of a `next/link` `Link` (it reads that link's status).
 */
export function LinkArrow({ className }: { className?: string }) {
  const { pending } = useLinkStatus();
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setWaiting(true), SHOW_AFTER_MS);
    return () => {
      window.clearTimeout(timer);
      setWaiting(false);
    };
  }, [pending]);

  return pending && waiting ? (
    <Loader2 aria-hidden className={cn("animate-spin", className)} />
  ) : (
    <ArrowRight aria-hidden className={className} />
  );
}
