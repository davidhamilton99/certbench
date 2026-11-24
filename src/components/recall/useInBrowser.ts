"use client";

import { useSyncExternalStore } from "react";

// Once a page runs in the browser it stays there, so there is nothing to listen for.
const subscribeToNothing = () => () => {};
const inBrowser = () => true;
const onServer = () => false;

/**
 * Whether this render takes place in the browser, past the first pass over the
 * server's HTML. It is false on the server and in that first pass, so what
 * depends on the device (its storage, a random draw) is drawn after it and
 * hydration never mismatches. A component that first appears on a page that is
 * already running has it true from its first render.
 */
export function useInBrowser(): boolean {
  return useSyncExternalStore(subscribeToNothing, inBrowser, onServer);
}
