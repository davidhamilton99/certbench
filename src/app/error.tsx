"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/analytics";
import { tryAgain } from "@/lib/errors/recover";

/**
 * What a visitor sees when a page fails to render: the public pages and the
 * study path had no boundary of their own, so a failure showed the browser a
 * bare "Application error" line. This says what happened and offers the two
 * ways on. It names no cause, because it does not know one.
 *
 * The failure is reported (`captureError` does nothing where analytics is not
 * loaded), because an error caught by a boundary never reaches the browser's
 * own error event and would otherwise be seen by nobody.
 */
export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    captureError(error, { digest: error.digest, page: window.location.pathname, boundary: "root" });
    // The tab, the history entry and a screen reader name the page for what it is.
    const title = document.title;
    document.title = "This page could not be displayed | CertBench";
    return () => {
      document.title = title;
    };
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="glass-nav">
        <div className="mx-auto flex h-[3.75rem] w-full max-w-6xl items-center px-4 sm:px-6">
          <Logo />
        </div>
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto grid w-full max-w-xl flex-1 content-center gap-5 px-5 py-16 outline-none sm:px-6"
      >
        <h1 className="cb-section">This page could not be displayed.</h1>
        <p className="text-body text-muted-foreground">
          An error occurred while the page was loading. Progress that has already been saved is not affected. Please
          try again. If the problem continues, write to{" "}
          <a href="mailto:support@certbench.dev" className="cb-link">
            support@certbench.dev
          </a>
          .
        </p>
        {error.digest && (
          <p className="text-small text-muted-foreground">
            Reference for support: <span className="font-mono">{error.digest}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-2.5">
          <Button size="lg" onClick={() => tryAgain(error, reset)}>
            Try again
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/">Return to the home page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
