"use client";

import { useEffect, useState } from "react";
import { loadBrowserClient } from "@/lib/supabase-lazy";

/**
 * Who is signed in on this browser, read from the local session (no network
 * round trip) and kept current as they sign in or out, including an inline
 * signup on the same page. undefined until known; null when signed out.
 *
 * The Supabase client loads once the page is up, not with it: every public
 * page asks this, and supabase-js is among the largest scripts a page would
 * otherwise have to parse before it answers a tap.
 *
 * A UI hint for picking links, copy and whose device data to show, never an
 * access check.
 */
export function useSessionUserId(): string | null | undefined {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    let unsubscribe = () => {};
    loadBrowserClient().then(
      (supabase) => {
        if (!live) return;
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          setUserId(session?.user.id ?? null);
        });
        unsubscribe = () => data.subscription.unsubscribe();
      },
      // No client, no session to find: the page stays as it is for a visitor.
      () => {
        if (live) setUserId(null);
      }
    );
    return () => {
      live = false;
      unsubscribe();
    };
  }, []);
  return userId;
}

/**
 * Whether someone is signed in on this browser. null until known: static
 * marketing pages render the signed-out view first, then switch.
 */
export function useSignedIn(): boolean | null {
  const userId = useSessionUserId();
  return userId === undefined ? null : userId !== null;
}
