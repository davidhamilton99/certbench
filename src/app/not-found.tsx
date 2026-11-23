import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

// The page says what it is in the browser's tab, and names no canonical
// address: without this it took the home page's title, and the root layout's
// canonical ("./") resolved to the internal route name "/_not-found".
export const metadata: Metadata = {
  title: "Page not found",
  alternates: { canonical: null },
};

/**
 * A dead link still lands somewhere useful: one plain statement and the way to
 * the exam list. Kept to plain server markup on purpose: Next sends this tree
 * with every page (it is the root layout's not-found boundary), so a header
 * with its navigation, a footer or a client component here would ship on
 * every page of the site. For the same reason its buttons carry no arrow.
 */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center overflow-hidden aurora-bg px-5 text-center">
      <header className="mt-8">
        <Logo />
      </header>
      {/* The page's one main region, where the "Skip to main content" link leads. */}
      <main
        id="main-content"
        tabIndex={-1}
        className="grid flex-1 content-center justify-items-center gap-5 pb-24 outline-none"
      >
        <p className="cb-label text-muted-foreground">Error 404</p>
        <h1 className="cb-title">This page could not be found.</h1>
        <p className="cb-measure-xs text-lede text-muted-foreground sm:text-xl">
          The page may have moved, or the address may be incorrect. You can choose your exam and begin from the first
          step.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/start">Choose your exam</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Return to the home page</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
