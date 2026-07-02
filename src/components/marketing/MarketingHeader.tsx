import Link from "next/link";
import { Button } from "@/components/ui/button";

export function MarketingHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
      <Link href="/" className="text-lg font-semibold tracking-tight">
        CertBench
      </Link>
      <nav className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pricing">Pricing</Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href="/register">Get started</Link>
        </Button>
      </nav>
    </header>
  );
}
