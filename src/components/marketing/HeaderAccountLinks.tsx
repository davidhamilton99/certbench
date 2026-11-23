"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkPending } from "@/components/ui/link-arrow";
import { useSignedIn } from "@/components/auth/useSignedIn";
import { IntentLink } from "./IntentLink";

/**
 * The header's account links. Public pages are static, so they render the
 * signed-out pair first. Once a session is found (including one just created
 * by a sign-up form on the page) the pair becomes a single way back to the
 * visitor's study path: /start opens the exam they are enrolled in, or asks
 * them to choose one.
 *
 * /start is drawn for the visitor when it is asked for and has no loading
 * screen, so its button answers the press itself, with the small spinner in
 * place of its words until the page arrives. "Sign in" fetches its page only
 * once the visitor shows that they mean to open it: the sign-in page carries
 * the sign-in client, which no visitor who stays signed out should download.
 *
 * On a phone the bar has no room for "Sign in" beside the name, the way in
 * and the menu, so it is in the menu there (MarketingHeader).
 */
export function HeaderAccountLinks() {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/start">
          <LinkPending>Your study path</LinkPending>
        </Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
        <IntentLink href="/login">Sign in</IntentLink>
      </Button>
      <Button asChild size="sm">
        <Link href="/start">
          <LinkPending>Start for free</LinkPending>
        </Link>
      </Button>
    </>
  );
}
