import { Hero } from "@/components/marketing/Hero";
import { FeatureSection } from "@/components/marketing/FeatureSection";
import { SampleQuestions } from "@/components/marketing/SampleQuestions";
import { CTASection } from "@/components/marketing/CTASection";
import { Footer } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-page overflow-x-hidden">
      <MarketingHeader />

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
