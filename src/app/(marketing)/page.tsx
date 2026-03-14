import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Hero } from "@/components/marketing/Hero";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import { CTASection } from "@/components/marketing/CTASection";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-page overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[18px] font-bold text-text-primary tracking-tight">
            CertBench
          </span>
          <div className="flex items-center gap-3">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">
                Pricing
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <Hero />
        <FeatureSection />
        <CTASection />
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-3">
          <p className="text-[13px] text-text-muted">
            CertBench — Certification preparation, simplified.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-[12px] text-text-muted hover:text-text-primary transition-colors">
              Privacy Policy
            </Link>
            <span className="text-[12px] text-text-muted">&middot;</span>
            <Link href="/terms" className="text-[12px] text-text-muted hover:text-text-primary transition-colors">
              Terms of Service
            </Link>
            <span className="text-[12px] text-text-muted">&middot;</span>
            <a href="mailto:support@certbench.com" className="text-[12px] text-text-muted hover:text-text-primary transition-colors">
              Contact
            </a>
          </div>
          <p className="text-[11px] text-text-muted">
            &copy; {new Date().getFullYear()} CertBench. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
