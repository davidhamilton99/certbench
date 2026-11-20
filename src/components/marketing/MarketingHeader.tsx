import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/workspace/ThemeToggle";
import { HeaderAccountLinks } from "./HeaderAccountLinks";

export function MarketingHeader() {
  return (
    <header className="glass-nav sticky top-0 z-40">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          {/* Pricing is secondary on a phone-width header (still linked in the
              footer); dropping it keeps the primary action from being pushed
              off-screen on mobile. */}
          <Button asChild variant="ghost" size="sm" className="hidden text-muted-foreground hover:text-foreground sm:inline-flex">
            <Link href="/pricing">Pricing</Link>
          </Button>
          <ThemeToggle />
          <HeaderAccountLinks />
        </nav>
      </div>
    </header>
  );
}
