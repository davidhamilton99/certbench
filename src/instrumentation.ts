import type { Instrumentation } from "next";

/**
 * Next's server hooks. The file sits beside the app directory (src/), which is
 * the one place a production build looks for it.
 *
 * Everything here is loaded on demand, inside the function that needs it, so
 * that a server instance starts without waiting for code it may never run.
 */

/**
 * Runs once as a server instance starts.
 *
 * It writes one line to the log saying which settings this deployment has (true
 * or false, never a value), so that a missing key shows on the day it goes
 * missing and not when a member writes in. It then starts Sentry, but only in a
 * deployment that has been given a DSN: without one the package is not loaded.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { logBootLines } = await import("@/server/api/settings");
    logBootLines();
  } catch (err) {
    // The line is for the owner. Failing to write it must not stop the server.
    console.error("[boot] the settings line could not be written:", err);
  }

  if (process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN) {
    await import("../sentry.server.config");
  }
}

/**
 * Runs when a request fails on the server: a page that could not be rendered,
 * a route handler that threw, the proxy. Sends the owner a `server_error`
 * event with the route and the digest printed on the error page, and no
 * personal data (see src/server/api/report-error.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { reportRequestError } = await import("@/server/api/report-error");
  await reportRequestError(error, request, context);
};
