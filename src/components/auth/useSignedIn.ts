"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Who is signed in on this browser, read from the local session (no network
 * round trip) and kept current as they sign in or out, including an inline
 * signup on the same page. undefined until known; null when signed out.
 *
 * A UI hint for picking links, copy and whose device data to show, never an
 * access check.
 */
export function useSessionUserId(): string | null | undefined {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
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
