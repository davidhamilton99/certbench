import "server-only";

import { captureServerEvent } from "@/server/analytics";

/**
 * Reporting a server error to the owner. Until this existed a failing page or
 * endpoint left a line in the host's logs and nothing else, so a fault was
 * learned from a customer's email.
 *
 * Every error becomes one `server_error` event in PostHog, where the product's
 * other events already are. Sentry receives it as well, but only in a
 * deployment that has a DSN: without one its package is never loaded.
 */

/** Server errors are filed under the server, never under a person. */
export const SERVER_ID = "certbench-server";

/**
 * Route parameters that name an exam, an objective or a page. An address is
 * reported only when every parameter of its route is one of these: any other
 * parameter can be a signed token or an id that belongs to an account.
 */
const PUBLIC_PARAMS = new Set(["cert", "code", "slug"]);

/** Where an error happened. */
export interface ErrorPlace {
  /** The route as the code names it: "/path/[cert]" or "/api/path/progress". */
  route: string;
  /** The address that was asked for. Its query string is never reported. */
  path?: string;
  method?: string;
  /** What was running: a page render, a route handler or the proxy. */
  kind?: string;
}

/**
 * What a `server_error` event carries: where it happened, the kind of error
 * and the digest that finds its full report in the host's logs. No message,
 * no headers, no query string and no account: an error's own words can hold
 * what a member typed, and the event is not about a person.
 */
export function serverErrorEvent(error: unknown, place: ErrorPlace): Record<string, unknown> {
  const params = [...place.route.matchAll(/\[+(?:\.\.\.)?([^\]]+)\]+/g)].map((match) => match[1]);
  const pathname = place.path?.split(/[?#]/)[0];
  const digest =
    typeof error === "object" && error !== null && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;
  return {
    route: place.route,
    path: pathname && params.every((param) => PUBLIC_PARAMS.has(param)) ? pathname : place.route,
    method: place.method,
    kind: place.kind,
    digest,
    error_name: error instanceof Error ? error.name : typeof error,
    // An event about the server makes no person in PostHog.
    $process_person_profile: false,
  };
}

/**
 * True in a deployment where Sentry has been given a DSN: the same test as
 * sentry.server.config.ts makes before it starts Sentry.
 */
function sentryConfigured(): boolean {
  return Boolean(process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN);
}

/**
 * Reports an error that the code caught itself (an endpoint's handler, for
 * example). Never throws. The PostHog send has its own two second limit.
 */
export async function reportServerError(error: unknown, place: ErrorPlace): Promise<void> {
  try {
    await captureServerEvent(SERVER_ID, "server_error", serverErrorEvent(error, place));
    if (sentryConfigured()) {
      const { captureException } = await import("@sentry/nextjs");
      captureException(error);
    }
  } catch (err) {
    console.error("[server error] the report could not be sent:", err);
  }
}

/**
 * Reports an error that Next caught while serving a request: the body of the
 * `onRequestError` hook in src/instrumentation.ts. Never throws.
 */
export async function reportRequestError(
  error: unknown,
  request: Readonly<{ path: string; method: string; headers: NodeJS.Dict<string | string[]> }>,
  context: Readonly<{ routerKind: string; routePath: string; routeType: string }>
): Promise<void> {
  try {
    await captureServerEvent(
      SERVER_ID,
      "server_error",
      serverErrorEvent(error, {
        route: context.routePath,
        path: request.path,
        method: request.method,
        kind: context.routeType,
      })
    );
    if (sentryConfigured()) {
      const { captureRequestError } = await import("@sentry/nextjs");
      captureRequestError(error, request, context);
    }
  } catch (err) {
    console.error("[server error] the report could not be sent:", err);
  }
}
