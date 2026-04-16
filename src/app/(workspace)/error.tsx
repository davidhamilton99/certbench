"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/Button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace error:", error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <p className="text-[13px] font-medium text-text-muted uppercase tracking-wider mb-3">
          Something went wrong
        </p>
        <h2 className="text-[24px] font-bold text-text-primary tracking-tight mb-2">
          Unable to load this page
        </h2>
        <p className="text-[15px] text-text-secondary mb-6">
          An unexpected error occurred. This has been logged and we&apos;ll look
          into it. You can try again or go back to your dashboard.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
            Go to Dashboard
          </Button>
          <Button onClick={() => reset()}>Try Again</Button>
        </div>
        {error.digest && (
          <p className="text-[12px] text-text-muted mt-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
