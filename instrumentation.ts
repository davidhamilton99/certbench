// Next.js instrumentation hook. Loads the correct Sentry config based on
// runtime. Both init files are no-ops unless a DSN is configured, so this
// stays cheap in local/dev without Sentry set up.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export { captureRequestError as onRequestError } from "@sentry/nextjs";
