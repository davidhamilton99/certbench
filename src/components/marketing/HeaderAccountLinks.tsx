"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useSignedIn } from "@/components/auth/useSignedIn";

/**
 * The header's account links. Marketing pages are static, so they render the
 * signed-out pair first; once a session is found (including one just created
 * by an inline signup on the page) it becomes a single way into the app.
 * /dashboard routes a free account on to its goal flow and the offer.
 */
export function HeaderAccountLinks() {
  const signedIn = useSignedIn();

  if (signedIn) {
    return (
      <Button asChild size="sm">
        <Link href="/dashboard">Your plan</Link>
      </Button>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm">
        <Link href="/login">Sign in</Link>
      </Button>
      <Button asChild size="sm">
        <Link href="/register">Get started</Link>
      </Button>
    </>
  );
}
