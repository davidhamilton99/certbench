import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Phase-0 placeholder landing page. The full marketing site is rebuilt in
 * Phase 10; this keeps `/` rendering on the preview deploy meanwhile.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <span className="text-lg font-semibold tracking-tight">CertBench</span>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 pb-24 text-center">
        <h1 className="max-w-2xl text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Know exactly what to study
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          CertBench builds a personalised study plan from your actual
          performance — adaptive practice exams, spaced repetition, and a
          readiness score for CompTIA Security+, Network+, and A+.
        </p>
        <Button asChild size="lg">
          <Link href="/register">
            Start studying free
            <ArrowRight />
          </Link>
        </Button>
      </main>
    </div>
  );
}
