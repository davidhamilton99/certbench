"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { hasSessionCookie, loadBrowserClient, onBrowserClientLoaded } from "@/lib/supabase-lazy";

// The cookie is read once, when the page is first drawn in the browser. A
// session that begins later on the same page is noticed through the client
// (see below), so there is nothing here to listen for.
const subscribeToNothing = () => () => {};
/** The server cannot know, and the first paint in the browser repeats what the server sent. */
const unknownOnServer = () => null;

/**
 * Who is signed in on this browser, read from the local session (no network
 * round trip) and kept current as they sign in or out, including an inline
 * signup on the same page. undefined until known; null when signed out.
 *
 * A browser with no session cookie has nobody signed in, and the hook says so
 * at once without fetching the Supabase client: every public page asks this,
 * and supabase-js is among the largest scripts a page would otherwise load
 * only to learn that the visitor is signed out. If something on the page (a
 * sign-up form) loads the client later, the hook starts to follow it then, so
 * a sign-in on the same page is still noticed. With a session cookie the
 * client is loaded once the page is up, and the session is read from it.
 *
 * A UI hint for picking links, copy and whose device data to show, never an
 * access check.
 */
export function useSessionUserId(): string | null | undefined {
  /** null on the server and at hydration, then whether the browser holds a session cookie. */
  const hasCookie = useSyncExternalStore<boolean | null>(subscribeToNothing, hasSessionCookie, unknownOnServer);
  /** What the client has reported: undefined until it has reported anything. */
  const [reported, setReported] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (hasCookie === null) return;
    let live = true;
    let unsubscribe = () => {};

    /** Read the session from the client and keep following it. */
    function follow() {
      loadBrowserClient().then(
        (supabase) => {
          if (!live) return;
          const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            setReported(session?.user.id ?? null);
          });
          unsubscribe = () => data.subscription.unsubscribe();
        },
        // No client, no session to find: the page stays as it is for a visitor.
        () => {
          if (live) setReported(null);
        }
      );
    }

    // With a cookie the session is read now. Without one the client is left
    // alone until something else on the page has loaded it.
    let stopWaiting = () => {};
    if (hasCookie) follow();
    else stopWaiting = onBrowserClientLoaded(follow);
    return () => {
      live = false;
      stopWaiting();
      unsubscribe();
    };
  }, [hasCookie]);

  if (reported !== undefined) return reported;
  // No cookie: signed out, known at once. A cookie: unknown until the client reports.
  return hasCookie === false ? null : undefined;
}

/**
 * Whether someone is signed in on this browser. null until known: static
 * marketing pages render the signed-out view first, then switch.
 */
export function useSignedIn(): boolean | null {
  const userId = useSessionUserId();
  return userId === undefined ? null : userId !== null;
}
