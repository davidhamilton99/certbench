import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <a
          href="/"
          className="text-[13px] text-primary hover:underline mb-8 inline-block"
        >
          &larr; Back to home
        </a>
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-text-muted mb-8 font-mono">
          Last updated: March 14, 2026
        </p>

        <div className="prose-custom">
          <Section title="1. Information We Collect">
            <p>
              <strong>Account information:</strong> When you create an account,
              we collect your email address, display name, and password (stored
              as a secure hash — we never store plaintext passwords).
            </p>
            <p>
              <strong>Study data:</strong> Your quiz responses, practice exam
              results, readiness scores, and study progress are stored to
              personalise your experience and track your certification
              preparation.
            </p>
            <p>
              <strong>User-generated content:</strong> Study materials you
              upload, questions you generate, and study sets you create are
              stored on our servers.
            </p>
            <p>
              <strong>Usage data:</strong> We collect anonymised analytics on
              page views, feature usage, and session duration to improve the
              product.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use your information to:</p>
            <ul>
              <li>Provide and personalise the CertBench study experience</li>
              <li>
                Calculate your readiness score and generate adaptive study plans
              </li>
              <li>Process AI-powered question generation from your content</li>
              <li>Process payments and manage your subscription</li>
              <li>Send essential account notifications (password resets, billing)</li>
              <li>Improve the product based on aggregated, anonymised usage data</li>
            </ul>
          </Section>

          <Section title="3. AI Processing">
            <p>
              When you generate questions from study materials, your content is
              sent to our AI provider (Anthropic) for processing. This content
              is used solely for question generation and is not stored by the AI
              provider for training purposes. We do not share your study
              materials with any other third party.
            </p>
          </Section>

          <Section title="4. Data Sharing">
            <p>We do not sell your personal data. We share data only with:</p>
            <ul>
              <li>
                <strong>Supabase</strong> — database and authentication hosting
              </li>
              <li>
                <strong>Vercel</strong> — application hosting
              </li>
              <li>
                <strong>Stripe</strong> — payment processing (for Pro
                subscribers)
              </li>
              <li>
                <strong>Anthropic</strong> — AI question generation
              </li>
            </ul>
            <p>
              If you make a study set public, its title, questions, and your
              display name are visible to other users and anyone with the share
              link.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p>
              Your account data is retained for as long as your account is
              active. You can delete your account and associated data by
              contacting us at certbench@proton.me. Study data from
              public study sets may be retained in anonymised form after account
              deletion.
            </p>
          </Section>

          <Section title="6. Security">
            <p>
              We use industry-standard security measures including encrypted
              connections (TLS), secure password hashing, and row-level security
              policies on our database. Your payment information is handled
              entirely by Stripe and never touches our servers.
            </p>
          </Section>

          <Section title="7. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your study data</li>
              <li>Withdraw consent for optional data processing</li>
            </ul>
            <p>
              To exercise these rights, contact us at certbench@proton.me.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p>
              CertBench uses essential cookies for authentication and session
              management. We do not use advertising or tracking cookies. Our
              analytics use privacy-focused, cookie-free tracking.
            </p>
          </Section>

          <Section title="9. Changes">
            <p>
              We may update this policy from time to time. We will notify you of
              material changes via email or an in-app notice.
            </p>
          </Section>

          <Section title="10. Contact">
            <p>
              Questions about this policy? Email us at{" "}
              <a
                href="mailto:certbench@proton.me"
                className="text-primary hover:underline"
              >
                certbench@proton.me
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-[17px] font-semibold text-text-primary mb-3">
        {title}
      </h2>
      <div className="text-[14px] text-text-secondary leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-[14px]">
        {children}
      </div>
    </section>
  );
}
