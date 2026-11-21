"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { CHECKPOINT_SIZE, MINUTES_PER_STOP } from "@/core/path/plan";
import type { PathCert, PathStop } from "@/core/path/types";
import { InlineSignup } from "@/components/auth/InlineSignup";

/** The stop an account opens next, named when it's one to learn from, or the checkpoint. */
export function nextUpTitle(next: PathStop | null): string | null {
  if (next?.kind === "learn") return `Next up: ${next.title}`;
  if (next?.kind === "checkpoint") return "Next up: your readiness checkpoint";
  return null;
}

/** How long that stop takes: the sentence ahead of what an account does. */
export function nextUpLead(next: PathStop | null): string {
  if (next?.kind === "learn") return `About ${MINUTES_PER_STOP} minutes of quick questions. `;
  if (next?.kind === "checkpoint") return `${CHECKPOINT_SIZE} exam-style questions, then your score by domain. `;
  return "";
}

/**
 * The path's one account ask, where a first stop ends: what an account is
 * for, and the signup right there. On the path it sits in its own card; a
 * public page that played the stop inline puts it under the round's score.
 * Renders its two blocks bare, so the card around them sets the spacing.
 */
export function SaveAsk({
  cert,
  surface,
  title,
  titleAs: Title = "h3",
  children,
  onSaved,
  staysOnPage = true,
}: {
  cert: PathCert;
  /** Where it's shown: "path", or the public page's surface. */
  surface: string;
  title: string;
  /** "h2" on a public page, where the round sits straight under the page's title. */
  titleAs?: "h2" | "h3";
  /** What an account does here. */
  children: ReactNode;
  onSaved: (userId: string, email: string | undefined, method: "email_signup" | "email_login") => Promise<void> | void;
  /** false where signing up moves on to the path. */
  staysOnPage?: boolean;
}) {
  const viewed = useRef(false);
  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    track("path_save_viewed", { cert, surface });
  }, [cert, surface]);

  return (
    <>
      <div className="grid gap-1">
        <Title className="font-display text-xl font-semibold tracking-tight">{title}</Title>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
      <InlineSignup
        nextPath={`/path/${cert}`}
        submitLabel="Save and continue"
        onSignedIn={onSaved}
        staysOnPage={staysOnPage}
      />
    </>
  );
}
