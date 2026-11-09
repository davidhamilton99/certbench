/**
 * Where a buyer lands after paying: back on the guided path they bought from,
 * or /start, which opens their exam's path. Never the workspace: a buyer who
 * lands somewhere unfamiliar right after paying thinks something went wrong.
 * `upgraded=1` tells the path to wait for Stripe's confirmation and then open
 * with the unlock moment.
 *
 * `from` is a checkout's `returnTo` ("path/<exam>", "pricing", ...) or an old
 * success link's `next` ("/path/<exam>"); anything else lands on /start.
 */
export function afterCheckoutPath(from: string | null | undefined): string {
  const path = from?.match(/^\/?(path\/[a-z0-9-]{3,48})$/)?.[1];
  return `/${path ?? "start"}?upgraded=1`;
}
