"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSignedIn } from "@/components/auth/useSignedIn";

/**
 * The header's account links. Public pages are static, so they render the
 * signed-out pair first. Once a session is found (including one just created
 * by a sign-up form on the page) the pair becomes a single way back to the
 * visitor's study path: /start opens the exam they are enrolled in, or asks
 * them to choose one.
 *
 * On a phone the bar has no room for "Sign in" beside the name, the way in
 * and the menu, so it is in the menu there (MarketingHeader).
 */
export function HeaderAccountLinks() {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/start">Your study path</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/start">Start for free</Link>
      </Button>
    </>
  );
}
