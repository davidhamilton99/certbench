"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * If the user unchecked "Stay signed in" and the browser was closed
 * and reopened, sign them out automatically.
 *
 * Detection: localStorage has "certbench_ephemeral" but sessionStorage
 * is missing "certbench_alive" (sessionStorage clears on browser close).
 */
export function SessionGuard() {
  const router = useRouter();

  useEffect(() => {
    const isEphemeral = localStorage.getItem("certbench_ephemeral");
    const isAlive = sessionStorage.getItem("certbench_alive");

    if (isEphemeral && !isAlive) {
      // Browser was closed and reopened — sign out
      localStorage.removeItem("certbench_ephemeral");
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        router.push("/login");
        router.refresh();
      });
    } else if (isEphemeral) {
      // Browser still open — keep the sentinel alive
      sessionStorage.setItem("certbench_alive", "1");
    }
  }, [router]);

  return null;
}
