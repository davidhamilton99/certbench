"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLinkStatus } from "next/link";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** A navigation quicker than this shows no spinner at all: nothing to wait for. */
const SHOW_AFTER_MS = 120;

/**
 * Whether the link this is drawn in has been pressed and its page has been on
 * the way for longer than SHOW_AFTER_MS. Read inside a `next/link` `Link`.
 */
function useLinkWait(): boolean {
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

  return pending && waiting;
}

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
  return useLinkWait() ? (
    <Loader2 aria-hidden className={cn("animate-spin", className)} />
  ) : (
    <ArrowRight aria-hidden className={className} />
  );
}

/**
 * The words of a link with no arrow, for the same wait: a link drawn as a
 * button (the header's "Start for free") or a link in running text (a
 * `cb-link`). While the link's page is on the way the words give way to the
 * small spinner, as a button's own `loading` state does. The words stay in
 * place unseen, so the link keeps its width and its name.
 *
 * The boxes are inline, because a text link's underline reaches only the words
 * in inline boxes: a flex box here would take the underline off a text link.
 * The spinner is placed over the words at a size of its own, since outside a
 * Button nothing else sizes it.
 *
 * Use it as the child of a `next/link` `Link` (it reads that link's status).
 */
export function LinkPending({ children }: { children: ReactNode }) {
  const waiting = useLinkWait();
  return (
    <span className="relative">
      <span className={cn(waiting && "opacity-0")}>{children}</span>
      {waiting && <Loader2 aria-hidden className="absolute inset-0 m-auto size-4 animate-spin" />}
    </span>
  );
}
