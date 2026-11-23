"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Work that a public page keeps on this device belongs to whoever is signed in
 * (local-path.ts). For a moment after the page loads, that is not known yet:
 * `useSessionUserId` answers undefined while the sign-in client loads. Work
 * written in that moment would be kept as an anonymous visitor's, and on a
 * shared computer the next person at the keyboard would be shown it as their
 * own. So a write waits in memory until it is known whose work it is, and is
 * made then, in the order in which it was given.
 *
 * `session` is what `useSessionUserId` answers. The function returned makes a
 * write at once when the session is known, and otherwise as soon as it is. A
 * write still waiting when the page is left is not made.
 */
export function useWhenKnown(session: string | null | undefined) {
  const waiting = useRef<((who: string | null) => void)[]>([]);

  useEffect(() => {
    if (session === undefined || waiting.current.length === 0) return;
    const writes = waiting.current;
    waiting.current = [];
    for (const write of writes) write(session);
  }, [session]);

  return useCallback(
    (write: (who: string | null) => void) => {
      if (session === undefined) waiting.current.push(write);
      else write(session);
    },
    [session]
  );
}
