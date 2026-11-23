"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/analytics";
import { tryAgain } from "@/lib/errors/recover";
import { Button } from "@/components/ui/button";

/** A signed-in screen that failed to render, inside the workspace's own frame. */
export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    captureError(error, { digest: error.digest, page: window.location.pathname, boundary: "workspace" });
  }, [error]);

  return (
    <div className="mx-auto grid max-w-md gap-4 py-24">
      <h1 className="cb-subsection">This page could not be displayed.</h1>
      <p className="text-small text-muted-foreground">
        An error occurred while the page was loading. Progress that has already been saved is not affected. Please
        try again. If the problem continues, write to{" "}
        <a href="mailto:support@certbench.dev" className="cb-link">
          support@certbench.dev
        </a>
        .
      </p>
      {error.digest && (
        <p className="text-note text-muted-foreground">
          Reference for support: <span className="font-mono">{error.digest}</span>
        </p>
      )}
      <Button onClick={() => tryAgain(error, reset)} className="justify-self-start">
        Try again
      </Button>
    </div>
  );
}
