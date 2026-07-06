"use client";

import { useState } from "react";
import { Check, Copy, Linkedin, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ShareReadinessProps {
  url: string;
  score: number;
  certName: string;
}

/**
 * Owner-only "share your readiness" control in the readiness panel. Opens a
 * small menu with copy + social intents. Deliberately understated — the card
 * it links to does the talking.
 */
export function ShareReadiness({ url, score, certName }: ShareReadinessProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = `I'm ${score}% ready for my ${certName} exam — measured on CertBench.`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground"
        aria-label="Share your readiness"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Share2 className="size-4" />
      </Button>

      {open && (
        <>
          {/* Click-away backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border bg-popover p-3 shadow-lg">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Share your readiness</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">
              A clean, professional card — no account needed to view it.
            </p>
            <div className="grid gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={copy}
              >
                {copied ? (
                  <Check className="text-success" />
                ) : (
                  <Copy />
                )}
                {copied ? "Copied" : "Copy link"}
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <a href={xUrl} target="_blank" rel="noopener noreferrer">
                  <span className={cn("font-mono text-sm font-semibold")}>𝕏</span>
                  Share on X
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="justify-start">
                <a href={linkedInUrl} target="_blank" rel="noopener noreferrer">
                  <Linkedin />
                  Share on LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
