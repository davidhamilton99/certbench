import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PricingCheckout } from "@/components/marketing/PricingCheckout";
import { Footer } from "@/components/marketing/Footer";

export const metadata = {
  title: "Pricing — CertBench",
};

const FREE_FEATURES = [
  "3 AI quiz generations per month",
  "Built-in question bank",
  "Practice exams & diagnostics",
  "Spaced repetition (SRS)",
  "Community study sets",
];

const PRO_FEATURES = [
  "Unlimited AI quiz generations",
  "Everything in Free",
  "Priority AI processing",
  "Upload PDF, DOCX, and more",
  "Early access to new features",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-bg-page overflow-x-hidden">
      {/* Header */}
      <header className="border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/"
            className="text-[18px] font-bold text-text-primary tracking-tight"
          >
            CertBench
          </Link>
          <div className="flex items-center gap-3">
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

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-[32px] font-bold text-text-primary tracking-tight">
            Simple pricing
          </h1>
          <p className="text-[17px] text-text-secondary mt-2">
            Start free, upgrade when you need unlimited AI-generated quizzes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <Card padding="lg">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-[20px] font-semibold text-text-primary">
                  Free
                </h2>
                <div className="mt-2">
                  <span className="text-[36px] font-bold text-text-primary">
                    $0
                  </span>
                  <span className="text-[15px] text-text-muted">/month</span>
                </div>
                <p className="text-[14px] text-text-secondary mt-2">
                  Perfect for trying CertBench out.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {FREE_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[14px] text-text-secondary"
                  >
                    <svg
                      className="w-4 h-4 text-success shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="secondary" size="lg" className="w-full">
                  Get Started
                </Button>
              </Link>
            </div>
          </Card>

          {/* Pro Plan */}
          <Card padding="lg" accent="primary">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-[20px] font-semibold text-text-primary">
                  Pro
                </h2>
                <div className="mt-2">
                  <span className="text-[36px] font-bold text-text-primary">
                    $8
                  </span>
                  <span className="text-[15px] text-text-muted">/month</span>
                </div>
                <p className="text-[14px] text-text-secondary mt-2">
                  Unlimited AI quizzes for serious learners.
                </p>
              </div>
              <ul className="flex flex-col gap-2.5">
                {PRO_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[14px] text-text-secondary"
                  >
                    <svg
                      className="w-4 h-4 text-primary shrink-0 mt-0.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
              <PricingCheckout />
            </div>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
