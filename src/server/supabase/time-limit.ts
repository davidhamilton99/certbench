import "server-only";

/** How long one request to Supabase may take before it is abandoned. */
export const SUPABASE_TIME_LIMIT_MS = 8_000;

/**
 * How long a request may wait for the sign-in service to confirm a session.
 * With an expired token the client retries a refresh for up to 30 seconds; a
 * page or an API call must not wait that long for a service that is down.
 */
export const SESSION_CHECK_LIMIT_MS = 3_500;

/**
 * `fetch` with a time limit, for the Supabase clients. Without one, a request
 * to a service that has stopped answering never settles, and the page or API
 * call that awaits it hangs with it. A request that runs out of time is
 * aborted and fails like any other network error, which the client reports as
 * `{ error }` in the usual way.
 *
 * The global `fetch` is looked up on each call, so Next's own `fetch` (and a
 * test's stand-in) is the one that runs.
 */
export function fetchWithTimeLimit(ms: number = SUPABASE_TIME_LIMIT_MS): typeof fetch {
  return (input, init) => fetch(input, { ...init, signal: limited(init?.signal ?? undefined, ms) });
}

/** The caller's own signal, if it sent one, joined with the time limit. */
function limited(own: AbortSignal | undefined, ms: number): AbortSignal {
  const limit = AbortSignal.timeout(ms);
  if (!own) return limit;
  // A runtime without AbortSignal.any keeps the caller's signal: cancelling
  // when the caller asks matters more than the limit.
  return typeof AbortSignal.any === "function" ? AbortSignal.any([own, limit]) : own;
}

/** Raised by `withDeadline` when the work has not settled in time. */
export class DeadlineError extends Error {
  constructor(what: string, ms: number) {
    super(`${what} did not finish within ${ms} ms.`);
    this.name = "DeadlineError";
  }
}

/**
 * The result of `work`, or a DeadlineError once `ms` have passed. The work
 * itself is not stopped: it is only no longer waited for, and whatever it
 * settles with afterwards is ignored.
 */
export function withDeadline<T>(work: PromiseLike<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new DeadlineError(what, ms)), ms);
    Promise.resolve(work).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}
