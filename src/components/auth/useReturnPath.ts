"use client";

import { useMemo, useSyncExternalStore } from "react";
import { returnPath } from "./return-path";

// The query string does not change while an account page is open, so there is
// nothing to listen for.
const subscribe = () => () => {};
const onServer = () => "";
const inBrowser = () => window.location.search;

/**
 * The page's own query string, read once the page is in the browser. The
 * server and the first paint see none, so a page that reads it is still drawn
 * ahead of time with its whole form in the HTML (reading it through the
 * router would leave the form out of the HTML until the scripts had run).
 */
export function usePageQuery(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, inBrowser, onServer);
  return useMemo(() => new URLSearchParams(search), [search]);
}

/** The same-site address in `?next=`, or null when there is none to honour. */
export function useReturnPath(): string | null {
  const raw = usePageQuery().get("next");
  return useMemo(
    () => (typeof window === "undefined" ? null : returnPath(raw, window.location.origin)),
    [raw]
  );
}
