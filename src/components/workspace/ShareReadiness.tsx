"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ShareReadinessProps {
  url: string;
  score: number;
  certName: string;
}

/**
 * The owner's control for sharing a readiness score, on the readiness panel.
 * It is a disclosure: a button that opens a small panel with the link and two
 * places to post it. The panel closes on Escape (the focus returns to the
 * button), on a press outside it and when the focus leaves it; nothing
 * invisible lies over the page to catch a press.
 */
export function ShareReadiness({ url, score, certName }: ShareReadinessProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"yes" | "failed" | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  const text = `My readiness score for the ${certName} exam is ${score}%, measured on CertBench.`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    }
    function onPointer(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied("yes");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        // The focus has left the control and its panel (by Tab, for example).
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <Button
        ref={buttonRef}
        variant="ghost"
        size="icon"
        className="text-muted-foreground"
        aria-label="Share your readiness score"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => {
          setOpen((v) => !v);
          setCopied(null);
        }}
      >
        <Share2 aria-hidden className="size-4" />
      </Button>

      {open && (
        <div
          id={panelId}
          // Takes the focus when its text is pressed, so that press does not close it.
          tabIndex={-1}
          className="absolute right-0 top-full z-20 mt-2 grid w-72 max-w-[calc(100vw-2rem)] gap-3 rounded-lg border border-input bg-popover p-4 text-popover-foreground"
        >
          <p className="text-small font-semibold">Share your readiness score</p>
          <p className="text-note text-muted-foreground">
            The link opens a page that shows your first name and last initial, your readiness score and your score in
            each domain. Anyone who has the link can view it.
          </p>
          <div className="grid gap-1.5">
            <Button variant="outline" size="sm" className="justify-start" onClick={copy}>
              Copy the link
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <a href={xUrl} target="_blank" rel="noopener noreferrer">
                Share on X<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="justify-start">
              <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
                Share on LinkedIn<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </Button>
          </div>
          {/* Always present, so that what is written into it is announced. */}
          <p role="status" className="-mt-1 min-h-5 text-note text-muted-foreground">
            {copied === "yes" && "The link has been copied."}
            {copied === "failed" && "The link could not be copied. Please try again."}
          </p>
        </div>
      )}
    </div>
  );
}
