import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Hero } from "@/components/marketing/Hero";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import { SampleQuestions } from "@/components/marketing/SampleQuestions";
import { CTASection } from "@/components/marketing/CTASection";
import { Footer } from "@/components/marketing/Footer";

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
        <SampleQuestions />
        <CTASection />
      </main>

      <Footer />
    </div>
  );
}
