"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, LogOut, UserRound } from "lucide-react";
import { loadBrowserClient } from "@/lib/supabase-lazy";
import { resetAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { IntentLink } from "@/components/marketing/IntentLink";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";
import { Logo } from "@/components/brand/Logo";

/** Shown in the account panel when signing out did not work. */
const SIGN_OUT_FAILED = "You could not be signed out. Please try again.";

/**
 * The study path's only chrome: the brand, which exam this is, and the
 * account. It is sparse on purpose. The next step is on the page and not in a
 * menu, and the exam name leads back to the path's own first screen, the way a
 * breadcrumb reads; changing exam is a link under the outline.
 *
 * The bar's content is as wide as the stage under it, so "CertBench" and the
 * exam name stand over the left edge of the question, and the account over its
 * right edge.
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
  /** Shown in the account panel, so it's plain which account the path saves to. */
  email?: string | null;
  /** False until the account is known: a member mustn't see "Sign in" meanwhile. */
  ready?: boolean;
  /** Show this exam's first screen. The page is already this path, so it's a view change. */
  onHome: () => void;
}) {
  // On a screen too narrow for both on one line, the exam code goes under the
  // name: it is never cut short, because it says which version of the exam this is.
  const exam = (
    <>
      {examName}
      {version && (
        <>
          {" "}
          <span className="whitespace-nowrap font-mono text-note text-muted-foreground">{version}</span>
        </>
      )}
    </>
  );

  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-2 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo wordmark="sm" />
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
              className="cb-tap min-w-0 rounded-md px-1.5 py-1 text-small font-medium leading-tight transition-[background-color] hover:bg-accent"
            >
              {/* The link shows the exam; the hidden words say where it leads. */}
              <span className="sr-only">Your </span>
              {exam}
              <span className="sr-only"> study path</span>
            </Link>
          ) : (
            // Without an account the introductory questions are the whole visit: there is nothing to go back to.
            <span className="min-w-0 px-1.5 py-1 text-small font-medium leading-tight">{exam}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {/* The account's place is as wide as its widest state ("Sign in"), so
              the theme switch beside it stays where it is when the account is known. */}
          <div data-slot="account" className="flex min-w-16 justify-end">
            {!ready ? (
              <span className="size-9" aria-hidden />
            ) : signedIn ? (
              <AccountPanel email={email ?? null} />
            ) : (
              // Its words end on the stage's right edge: the button's own padding hangs outside it. The
              // sign-in page carries the sign-in client, so it is fetched only once the link is reached.
              <Button asChild variant="ghost" size="sm" className="-mr-3">
                <IntentLink href={`/login?next=/path/${cert}`}>Sign in</IntentLink>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * The account, behind a press: which account the path saves to, the plan and
 * billing page, and signing out. Signing out was once a bare icon beside the
 * theme switch; a learner pressed it mid-path, was signed out, found a blank
 * path and played the introductory questions again (replay, Nov 16).
 *
 * It is a disclosure and not a menu: a button that shows and hides a small
 * panel. A menu promises arrow keys and its own focus handling, which a panel
 * of one link and one button does not need. It closes on Escape (the focus
 * goes back to the button), on a press outside it, and when the focus leaves it.
 */
function AccountPanel({ email }: { email: string | null }) {
  const router = useRouter();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const leaving = useRef(false);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      toggle.current?.focus();
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    if (leaving.current) return;
    leaving.current = true;
    setError("");
    try {
      // The sign-in client is fetched when it is needed, not with the page.
      const client = await loadBrowserClient();
      const { error: failed } = await client.auth.signOut();
      if (failed) throw failed;
    } catch {
      leaving.current = false;
      setError(SIGN_OUT_FAILED);
      return;
    }
    resetAnalytics();
    router.push("/");
    router.refresh();
  }

  return (
    // The margin sets the icon, and not the button's box, on the stage's right edge.
    <div
      ref={root}
      className="relative -mr-2.5"
      onBlur={(e) => {
        // The focus has gone to something outside the button and its panel. A
        // press that moves the focus nowhere (some browsers do not focus a
        // button that is pressed with a mouse) is left to the handler above.
        const next = e.relatedTarget as Node | null;
        if (next && !e.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <Button
        ref={toggle}
        variant="ghost"
        size="icon"
        aria-label="Account"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <UserRound aria-hidden />
      </Button>
      {open && (
        <div
          id={panelId}
          // Its right edge is the stage's, like the icon above it.
          className="cb-paper path-rise absolute right-2.5 top-full z-50 mt-2 grid w-64 gap-1 rounded-md border border-border bg-card p-1.5 shadow-lg"
        >
          <p className="px-3 pb-1.5 pt-2 text-note text-muted-foreground [overflow-wrap:anywhere]">
            {email ? (
              <>
                Signed in as <span className="font-medium text-foreground">{email}</span>
              </>
            ) : (
              "You are signed in. Your study path is saved to your account."
            )}
          </p>
          <Link
            href="/upgrade"
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-small transition-[background-color] hover:bg-accent"
          >
            <CreditCard className="size-4" aria-hidden />
            Plan and billing
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-small transition-[background-color] hover:bg-accent"
          >
            <LogOut className="size-4" aria-hidden />
            Sign out
          </button>
          {error && (
            <p role="alert" className="px-3 pb-2 pt-1 text-note text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
