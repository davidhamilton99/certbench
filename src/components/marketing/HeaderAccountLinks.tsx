"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSignedIn } from "@/components/auth/useSignedIn";

/**
 * The header's account links. Marketing pages are static, so they render the
 * signed-out pair first; once a session is found (including one just created
 * by an inline signup on the page) it becomes a single way back to their path.
 * /start opens the exam they're enrolled in, or lets them pick one.
 */
export function HeaderAccountLinks() {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/start">Your path</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/start">Get started</Link>
      </Button>
    </>
  );
}
