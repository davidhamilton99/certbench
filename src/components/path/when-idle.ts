/**
 * Runs a piece of background work once the page has finished its first load
 * and the browser has nothing else to do. Never during the first load: the
 * work is something that the page will want later (the schemas that read the
 * server's answers, for one), and it must not compete with what the visitor
 * is waiting to see.
 *
 * The browser's own idle callback is used where there is one, with a limit so
 * that a busy page still does the work in the end. Where there is none
 * (Safari), a short timer stands in for it. The function returned calls the
 * work off, if it has not run yet.
 */

/** The longest that a busy page puts the work off once it has loaded. */
export const IDLE_LIMIT_MS = 4000;

/** Where the browser cannot say when it is idle: this long after the page has loaded. */
export const IDLE_FALLBACK_MS = 1500;

export function whenIdleAfterLoad(work: () => void): () => void {
  let calledOff = false;
  let stopWaiting: (() => void) | null = null;

  const waitForIdle = () => {
    if (calledOff) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => work(), { timeout: IDLE_LIMIT_MS });
      stopWaiting = () => window.cancelIdleCallback(id);
    } else {
      const id = window.setTimeout(work, IDLE_FALLBACK_MS);
      stopWaiting = () => window.clearTimeout(id);
    }
  };

  // "complete": every script, stylesheet and image of the first load has arrived.
  if (document.readyState === "complete") waitForIdle();
  else window.addEventListener("load", waitForIdle, { once: true });

  return () => {
    calledOff = true;
    window.removeEventListener("load", waitForIdle);
    stopWaiting?.();
  };
}
