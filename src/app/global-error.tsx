"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/analytics";
import { tryAgain } from "@/lib/errors/recover";
import { OG } from "@/lib/og/mark";

/**
 * The last boundary: it replaces the whole document when the root layout
 * itself fails, so it carries its own html and body and leans on nothing
 * (no stylesheet, no fonts, no components) that the failure may have taken
 * with it. Plain system type on white, the navy band drawn inline. The
 * imports are plain functions and one table of colours (the site's tokens as
 * hex, src/lib/og/mark.tsx), with no stylesheet or component behind them.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    captureError(error, { digest: error.digest, page: window.location.pathname, boundary: "global" });
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>This page could not be displayed | CertBench</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: OG.paper,
          color: OG.ink,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        <div
          style={{ background: OG.sheet, color: OG.sheetText, padding: "18px 24px", fontWeight: 600, fontSize: 19 }}
        >
          CertBench
        </div>
        <main id="main-content" tabIndex={-1} style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px" }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.15, margin: "0 0 16px" }}>This page could not be displayed.</h1>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: OG.muted, margin: "0 0 12px" }}>
            An error occurred while the page was loading. Progress that has already been saved is not affected. Please
            try again. If the problem continues, write to{" "}
            <a href="mailto:support@certbench.dev" style={{ color: OG.primary }}>
              support@certbench.dev
            </a>
            .
          </p>
          {error.digest && (
            <p style={{ fontSize: 14, color: OG.muted, margin: "0 0 24px" }}>Reference for support: {error.digest}</p>
          )}
          <p style={{ margin: "24px 0 0", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => tryAgain(error, reset)}
              style={{
                height: 48,
                padding: "0 24px",
                border: 0,
                borderRadius: 6,
                background: OG.primary,
                color: OG.paper,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {/* A full page load on purpose: the app that failed is not asked to route. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: 46,
                padding: "0 24px",
                border: `1px solid ${OG.control}`,
                borderRadius: 6,
                color: OG.ink,
                fontSize: 16,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              Return to the home page
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
