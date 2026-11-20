import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

/**
 * A dead link still lands somewhere useful: one big line and the way to the
 * exam picker. Kept to plain server markup on purpose: Next sends this tree
 * with every page (it's the root layout's not-found boundary), so a header,
 * footer or client component here would ship on every page of the site.
 */
export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-svh flex-col items-center overflow-hidden aurora-bg px-5 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-18rem] -z-10 h-[34rem] w-[64rem] max-w-[200vw] -translate-x-1/2 [background:radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_17%,transparent),transparent)]"
      />
      <Logo className="mt-8" />
      <div className="grid flex-1 content-center justify-items-center gap-5 pb-24">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">404</p>
        <h1 className="cb-display text-balance text-[2.35rem] sm:text-6xl">This stop isn&apos;t on the map.</h1>
        <p className="max-w-md text-balance text-lg text-muted-foreground">
          The page moved or never existed. Pick your exam and start from the first stop.
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/start">
              Pick my exam
              <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
