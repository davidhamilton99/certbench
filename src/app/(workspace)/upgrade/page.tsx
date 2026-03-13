import { Card } from "@/components/ui/Card";
import { PricingCheckout } from "@/components/marketing/PricingCheckout";

export const metadata = {
  title: "Upgrade to Pro — CertBench",
};

const FREE_FEATURES = [
  "3 AI quiz generations per month",
  "Tab-separated flashcard import",
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

export default function UpgradePage() {
  return (
    <div>
      <h1 className="text-[24px] font-bold text-text-primary tracking-tight mb-2">
        Upgrade to Pro
      </h1>
      <p className="text-[15px] text-text-secondary mb-8">
        Unlock unlimited AI-generated quizzes for serious learners.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        {/* Free Plan */}
        <Card padding="lg">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-[18px] font-semibold text-text-primary">
                Free
              </h2>
              <div className="mt-2">
                <span className="text-[32px] font-bold text-text-primary">
                  $0
                </span>
                <span className="text-[14px] text-text-muted">/month</span>
              </div>
              <p className="text-[13px] text-text-secondary mt-1">
                Your current plan
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {FREE_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[13px] text-text-secondary"
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
          </div>
        </Card>

        {/* Pro Plan */}
        <Card padding="lg" accent="primary">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-[18px] font-semibold text-text-primary">
                Pro
              </h2>
              <div className="mt-2">
                <span className="text-[32px] font-bold text-text-primary">
                  $8
                </span>
                <span className="text-[14px] text-text-muted">/month</span>
              </div>
              <p className="text-[13px] text-text-secondary mt-1">
                Unlimited AI quizzes
              </p>
            </div>
            <ul className="flex flex-col gap-2.5">
              {PRO_FEATURES.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-[13px] text-text-secondary"
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
    </div>
  );
}
