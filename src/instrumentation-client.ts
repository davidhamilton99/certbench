/**
 * Next runs this file in the browser before the page becomes interactive.
 *
 * Its only job is Sentry, which is optional. Sentry's script is requested
 * only by a build that was made with NEXT_PUBLIC_SENTRY_DSN set: the import
 * below is inside that condition, so a build without a DSN sends a visitor
 * nothing more than these few lines.
 */

type RouterTransition = (href: string, navigationType: string) => void;

/** Sentry's own handler for navigations, once Sentry has loaded. */
let reportTransition: RouterTransition | undefined;

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 1.0,
        integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],
      });
      reportTransition = Sentry.captureRouterTransitionStart;
    })
    .catch(() => {
      // The script could not be fetched (offline, or blocked). The page works without it.
    });
}

/** Next calls this when a navigation starts. It does nothing until Sentry has loaded. */
export function onRouterTransitionStart(href: string, navigationType: string): void {
  reportTransition?.(href, navigationType);
}
