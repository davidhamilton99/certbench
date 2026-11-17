"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { resetAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";

/**
 * The path's only chrome: the brand, which exam this is, and the account.
 * Deliberately sparse — the next step lives on the page, not in a menu. The
 * exam name leads back to its map, the way a breadcrumb reads; switching
 * exams is a link under the map. Nothing here leads off the path: a member
 * sent somewhere unfamiliar mid-study tends to leave.
 */
export function PathHeader({
  cert,
  examName,
  version,
  signedIn,
  email,
  ready = true,
  onHome,
}: {
  cert: string;
  examName: string;
  /** The exam code, for an exam taught in more than one version (Security+ SY0-801). */
  version?: string;
  signedIn: boolean;
  /** Shown in the account menu, so it's plain which account the path saves to. */
  email?: string | null;
  /** False until the account is known: a member mustn't see "Sign in" meanwhile. */
  ready?: boolean;
  /** Show this exam's map. The page is already this path, so it's a view change. */
  onHome: () => void;
}) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    resetAnalytics();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-display text-base font-semibold tracking-tight"
          >
            <span className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
              CB
            </span>
            <span className="hidden sm:inline">CertBench</span>
          </Link>
          <span className="text-muted-foreground/50" aria-hidden>
            /
          </span>
          {signedIn ? (
            <Link
              href={`/path/${cert}`}
              onClick={(e) => {
                // A new-tab click keeps the browser's default.
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                onHome();
              }}
              className="truncate rounded-md px-1.5 py-1 text-sm font-medium hover:bg-accent"
              title={`Your ${examName} map`}
            >
              {examName}
              {version && <> <span className="font-mono text-xs text-muted-foreground">{version}</span></>}
            </Link>
          ) : (
            // Without an account the warm-up is the whole visit: nothing to go back to.
            <span className="truncate px-1.5 py-1 text-sm font-medium">
              {examName}
              {version && <> <span className="font-mono text-xs text-muted-foreground">{version}</span></>}
            </span>
          )}
        </div>
        <nav className="flex items-center gap-1">
          <ThemeToggle />
          {!ready ? (
            <span className="size-9" aria-hidden />
          ) : signedIn ? (
            <AccountMenu email={email ?? null} onSignOut={signOut} />
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href={`/login?next=/path/${cert}`}>Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

/**
 * The account, behind a tap: which one the path saves to, and signing out.
 * Signing out was a bare icon beside the theme switch; a learner tapped it
 * mid-path, was signed out, found a blank path and played the warm-up again
 * (replay, Nov 16).
 */
function AccountMenu({ email, onSignOut }: { email: string | null; onSignOut: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Account"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <UserRound />
      </Button>
      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="path-rise absolute right-0 top-full z-50 mt-2 grid w-60 gap-1 rounded-xl border border-border bg-card p-1.5 shadow-lg"
        >
          <p className="truncate px-3 pb-1.5 pt-2 text-xs text-muted-foreground">
            {email ? (
              <>
                Signed in as <span className="font-medium text-foreground">{email}</span>
              </>
            ) : (
              "Signed in. Your path saves to your account."
            )}
          </p>
          <button
            type="button"
            role="menuitem"
            onClick={onSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
