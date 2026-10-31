"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase-browser";

/**
 * Whether someone is signed in on this browser, read from the local session
 * (no network round trip) and kept current as they sign in or out — including
 * an inline signup on the same page. null until known: static marketing pages
 * render the signed-out view first, then switch.
 *
 * A UI hint for picking links and copy, never an access check.
 */
export function useSignedIn(): boolean | null {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    const { data } = createClient().auth.onAuthStateChange((_event, session) => {
      setSignedIn(session !== null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return signedIn;
}
