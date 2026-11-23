"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { track } from "@/lib/analytics";
import { CHECKPOINT_SIZE, MINUTES_PER_STOP } from "@/core/path/plan";
import type { PathCert, PathStop } from "@/core/path/types";
import { InlineSignup } from "@/components/auth/InlineSignup";
import { clearBegunOnPublicPage } from "./path-start";

/** The stop an account opens next, named when it's one to learn from, or the checkpoint. */
export function nextUpTitle(next: PathStop | null): string | null {
  if (next?.kind === "learn") return `Your next step: ${next.title}`;
  if (next?.kind === "checkpoint") return "Your next step: the readiness checkpoint";
  return null;
}

/** How long that stop takes: the sentence ahead of what an account does. */
export function nextUpLead(next: PathStop | null): string {
  if (next?.kind === "learn") return `It takes about ${MINUTES_PER_STOP} minutes. `;
  if (next?.kind === "checkpoint") return `It has ${CHECKPOINT_SIZE} exam-style questions and gives you a score for each domain. `;
  return "";
}

/**
 * The study path's one request for an account, where a first step ends: what
 * an account is for, and the form to make one in place. On the study path it
 * sits in its own card; a public page that played the step inline puts it
 * under the round's score. It renders its two blocks bare, so the card around
 * them sets the spacing.
 */
export function SaveAsk({
  cert,
  surface,
  title,
  titleAs: Title = "h2",
  children,
  onSaved,
  staysOnPage = true,
}: {
  cert: PathCert;
  /** Where it's shown: "path", or the public page's surface. */
  surface: string;
  title: string;
  /** "h2" straight under a screen's or a page's title; "h3" where a section heading stands between. */
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
    // From now on this request may be what makes the account: the study path
    // counts the link when it carries the visitor's work (path-start.ts).
    clearBegunOnPublicPage(cert);
  }, [cert, surface]);

  return (
    <>
      <div className="grid gap-1.5">
        <Title className="cb-statement">{title}</Title>
        <p className="text-small text-muted-foreground">{children}</p>
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
