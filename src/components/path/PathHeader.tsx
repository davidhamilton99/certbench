"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutGrid, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import { resetAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";

/**
 * The path's only chrome: the brand, which exam this is, and the account.
 * Deliberately sparse — the next step lives on the page, not in a menu.
 */
export function PathHeader({
  cert,
  examName,
  signedIn,
  pro,
}: {
  cert: string;
  examName: string;
  signedIn: boolean;
  pro: boolean;
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
          <Link
            href="/start?pick=1"
            className="truncate rounded-md px-1.5 py-1 text-sm font-medium hover:bg-accent"
            title="Switch exam"
          >
            {examName}
          </Link>
        </div>
        <nav className="flex items-center gap-1">
          <ThemeToggle />
          {pro && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard">
                <LayoutGrid />
                <span className="hidden sm:inline">Toolkit</span>
              </Link>
            </Button>
          )}
          {signedIn ? (
            <Button variant="ghost" size="icon" aria-label="Sign out" onClick={signOut}>
              <LogOut />
            </Button>
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
