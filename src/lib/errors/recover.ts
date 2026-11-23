/**
 * What "Try again" does on an error page.
 *
 * Most failures are worth one more render, which is what the boundary's own
 * `reset` asks for. A script that failed to load is different: the browser
 * keeps the failed import, so another render fails the same way, and a new
 * deployment may have replaced the file it was asking for. Only loading the
 * page again recovers from that.
 */

/** True when the error is a script (a lazily loaded part of the page) that could not be fetched. */
export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Loading chunk|Failed to load chunk|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i.test(
      error.message
    )
  );
}

/** Render again, or load the page again where rendering again cannot help. */
export function tryAgain(error: unknown, reset: () => void): void {
  if (isChunkLoadError(error)) {
    window.location.reload();
    return;
  }
  reset();
}
