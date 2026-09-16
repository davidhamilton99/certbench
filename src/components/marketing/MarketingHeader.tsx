import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";

export function MarketingHeader() {
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-lg font-semibold tracking-tight"
        >
          <span className="flex size-6 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
            CB
          </span>
          CertBench
        </Link>
        <nav className="flex items-center gap-1">
          <ThemeToggle />
          {/* Pricing is secondary on a phone-width header (still linked in the
              footer); dropping it keeps the primary "Get started" CTA from
              being pushed off-screen on mobile. */}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
