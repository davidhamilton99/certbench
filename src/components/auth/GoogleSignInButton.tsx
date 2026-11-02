"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { SIGNIN_CANCELLED_PARAM } from "@/lib/google-signin";
import { Button } from "@/components/ui/button";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const leaving = useRef(false);

  // Sent back from Google without signing in: say so here, and tidy the address.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SIGNIN_CANCELLED_PARAM)) return;
    url.searchParams.delete(SIGNIN_CANCELLED_PARAM);
    window.history.replaceState(null, "", url.pathname + url.search);
    track("google_signin_cancelled", { page: url.pathname, via: "google" });
    // The address can only be read after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCancelled(true);
  }, []);

  // The browser's back button from Google can restore this page just as it was
  // left, with the button still waiting on a redirect that's over.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted || !leaving.current) return;
      leaving.current = false;
      track("google_signin_cancelled", { page: window.location.pathname, via: "back" });
      setLoading(false);
      setCancelled(true);
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  async function handleGoogleSignIn() {
    leaving.current = true;
    setLoading(true);
    setCancelled(false);
    track("google_signin_clicked", { page: window.location.pathname });
    const supabase = createClient();

    const redirect = next && next.startsWith("/") ? next : "/dashboard";
    const back = window.location.pathname + window.location.search;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}&back=${encodeURIComponent(back)}`,
      },
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
            fill="#EA4335"
          />
        </svg>
        {loading ? "Redirecting…" : "Continue with Google"}
      </Button>
      {cancelled && (
        <p role="status" className="text-sm text-muted-foreground">
          Google sign-in didn&apos;t finish, and nothing&apos;s lost. Try again, or use your email
          below.
        </p>
      )}
    </>
  );
}
