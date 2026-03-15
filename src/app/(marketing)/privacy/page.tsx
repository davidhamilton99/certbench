import { Metadata } from "next";
import { BackLink } from "@/components/marketing/BackLink";

export const metadata: Metadata = {
  title: "Privacy Policy — CertBench",
  description: "CertBench Privacy Policy — how we collect, use, and protect your personal data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <BackLink />
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-[13px] text-text-muted mb-2">
          Effective date: March 14, 2026
        </p>
        <p className="text-[13px] text-text-muted mb-8">
          This Privacy Policy describes how CertBench (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, shares, and
          protects your personal information when you use our website,
          applications, and services (the &ldquo;Service&rdquo;). By using the
          Service, you agree to the practices described in this policy.
        </p>

        <div className="prose-custom">
          <Section title="1. Information We Collect">
            <p>We collect the following categories of information:</p>

            <p>
              <strong>1.1 Account information.</strong> When you create an
              account, we collect your email address, display name, and
              password. Passwords are stored as secure cryptographic hashes — we
              never store or have access to your plaintext password.
            </p>
            <p>
              <strong>1.2 Study and usage data.</strong> We collect data
              generated through your use of the Service, including quiz
              responses, practice exam results, readiness scores, study
              progress, spaced-repetition scheduling data, and study set
              interactions.
            </p>
            <p>
              <strong>1.3 User-generated content.</strong> Study materials you
              upload, questions you generate, and study sets you create are
              stored on our servers to provide the Service.
            </p>
            <p>
              <strong>1.4 Payment information.</strong> If you subscribe to
              CertBench Pro, payment details (credit card number, billing
              address) are collected and processed directly by Stripe. We do not
              store your full payment card details on our servers. We receive
              only a transaction identifier, subscription status, and the last
              four digits of your card.
            </p>
            <p>
              <strong>1.5 Device and usage analytics.</strong> We collect
              anonymized analytics data including page views, feature usage,
              session duration, browser type, operating system, and device type.
              This data is used in aggregate to improve the product and cannot
              be used to identify individual users.
            </p>
            <p>
              <strong>1.6 Communications.</strong> If you contact us for
              support, we retain your messages and any information you provide
              to resolve your inquiry.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>
                <strong>Provide the Service</strong> — authenticate your
                account, deliver study content, calculate readiness scores, and
                generate adaptive study plans
              </li>
              <li>
                <strong>Process AI question generation</strong> — send your
                uploaded study materials to our AI provider for processing when
                you use the generation feature
              </li>
              <li>
                <strong>Process payments</strong> — manage your subscription and
                billing through Stripe
              </li>
              <li>
                <strong>Communicate with you</strong> — send transactional
                emails (account verification, password resets, billing
                receipts) and, with your consent, product updates
              </li>
              <li>
                <strong>Improve the Service</strong> — analyze aggregated,
                anonymized usage patterns to inform product development
              </li>
              <li>
                <strong>Ensure security</strong> — detect and prevent fraud,
                abuse, and unauthorized access
              </li>
              <li>
                <strong>Comply with legal obligations</strong> — respond to
                lawful requests from authorities and meet regulatory
                requirements
              </li>
            </ul>
          </Section>

          <Section title="3. Lawful Basis for Processing (EEA/UK Users)">
            <p>
              If you are located in the European Economic Area (EEA) or United
              Kingdom, we process your personal data under the following legal
              bases:
            </p>
            <ul>
              <li>
                <strong>Contract performance</strong> — processing necessary to
                provide the Service you signed up for (account data, study
                data, payment processing)
              </li>
              <li>
                <strong>Legitimate interests</strong> — improving the Service,
                ensuring security, and preventing fraud, where these interests
                are not overridden by your rights
              </li>
              <li>
                <strong>Consent</strong> — where you have opted in to receive
                marketing communications (you may withdraw consent at any time)
              </li>
              <li>
                <strong>Legal obligation</strong> — processing required to
                comply with applicable laws
              </li>
            </ul>
          </Section>

          <Section title="4. AI Processing">
            <p>
              When you use the AI question generation feature, your uploaded
              study materials are sent to our AI provider, Anthropic, for
              processing. Important details:
            </p>
            <ul>
              <li>
                Content is transmitted securely via encrypted connections (TLS)
              </li>
              <li>
                Anthropic processes content solely for the purpose of generating
                study questions and does not use it to train their AI models
              </li>
              <li>
                Your study materials are not shared with any other third party
                through the AI generation process
              </li>
              <li>
                AI-generated output may be stored as part of your study sets but
                is not used by Anthropic beyond the generation request
              </li>
            </ul>
          </Section>

          <Section title="5. How We Share Your Information">
            <p>
              We do not sell, rent, or trade your personal information. We share
              data only with the following service providers, who process it on
              our behalf under contractual data-processing agreements:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong> — database hosting, authentication,
                and file storage (US-based infrastructure)
              </li>
              <li>
                <strong>Vercel</strong> — application hosting and content
                delivery (global edge network)
              </li>
              <li>
                <strong>Stripe</strong> — payment processing for Pro
                subscribers (PCI DSS Level 1 compliant)
              </li>
              <li>
                <strong>Anthropic</strong> — AI-powered question generation
              </li>
            </ul>
            <p>
              <strong>Public study sets.</strong> If you choose to make a study
              set public, its title, questions, and your display name are
              visible to other CertBench users and anyone with the share link.
              No other personal data is shared through public study sets.
            </p>
            <p>
              <strong>Legal requirements.</strong> We may disclose your
              information if required to do so by law, or if we believe in good
              faith that disclosure is necessary to comply with legal process,
              protect our rights, or ensure user safety.
            </p>
          </Section>

          <Section title="6. International Data Transfers">
            <p>
              Your data may be processed in the United States and other
              countries where our service providers operate. If you are located
              outside the United States, your information will be transferred
              to, stored, and processed in the US. We ensure that such
              transfers comply with applicable data protection laws through
              appropriate safeguards, including standard contractual clauses
              where required.
            </p>
          </Section>

          <Section title="7. Data Retention">
            <p>We retain your information as follows:</p>
            <ul>
              <li>
                <strong>Account data</strong> — retained for as long as your
                account is active, plus 30 days after deletion to allow for
                account recovery
              </li>
              <li>
                <strong>Study data</strong> — retained for as long as your
                account is active and deleted upon account deletion
              </li>
              <li>
                <strong>Payment records</strong> — retained for 7 years after
                the last transaction to comply with tax and financial reporting
                requirements
              </li>
              <li>
                <strong>Analytics data</strong> — aggregated and anonymized data
                may be retained indefinitely for product improvement
              </li>
              <li>
                <strong>Support communications</strong> — retained for 2 years
                after resolution
              </li>
            </ul>
          </Section>

          <Section title="8. Security">
            <p>
              We implement industry-standard security measures to protect your
              data, including:
            </p>
            <ul>
              <li>
                Encrypted connections (TLS/HTTPS) for all data in transit
              </li>
              <li>
                Encryption at rest for stored data
              </li>
              <li>
                Secure password hashing using modern cryptographic algorithms
              </li>
              <li>
                Row-level security (RLS) policies on our database, ensuring
                users can only access their own data
              </li>
              <li>
                Regular security reviews and dependency audits
              </li>
              <li>
                Payment information handled entirely by Stripe (PCI DSS Level 1
                compliant) and never stored on our servers
              </li>
            </ul>
            <p>
              While we take reasonable precautions, no method of transmission
              over the internet or electronic storage is 100% secure. We cannot
              guarantee absolute security.
            </p>
          </Section>

          <Section title="9. Your Rights">
            <p>
              Depending on your location, you may have the following rights
              regarding your personal data:
            </p>
            <ul>
              <li>
                <strong>Access</strong> — request a copy of the personal data we
                hold about you
              </li>
              <li>
                <strong>Correction</strong> — request that we correct inaccurate
                or incomplete data
              </li>
              <li>
                <strong>Deletion</strong> — request that we delete your personal
                data (you can also delete your account directly from your
                profile settings)
              </li>
              <li>
                <strong>Data portability</strong> — request your data in a
                structured, commonly used, machine-readable format
              </li>
              <li>
                <strong>Restriction</strong> — request that we restrict
                processing of your data in certain circumstances
              </li>
              <li>
                <strong>Objection</strong> — object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Withdraw consent</strong> — where processing is based on
                consent, withdraw it at any time without affecting the
                lawfulness of prior processing
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:privacy@certbench.dev"
                className="text-primary hover:underline"
              >
                privacy@certbench.dev
              </a>
              . We will respond to your request within 30 days. We may ask you
              to verify your identity before processing your request.
            </p>
          </Section>

          <Section title="10. California Privacy Rights (CCPA)">
            <p>
              If you are a California resident, you have additional rights under
              the California Consumer Privacy Act (CCPA):
            </p>
            <ul>
              <li>
                <strong>Right to know</strong> — request details about the
                categories and specific pieces of personal information we
                collect, the purposes, and the third parties with whom it is
                shared
              </li>
              <li>
                <strong>Right to delete</strong> — request deletion of your
                personal information, subject to certain exceptions
              </li>
              <li>
                <strong>Right to non-discrimination</strong> — we will not
                discriminate against you for exercising your CCPA rights
              </li>
              <li>
                <strong>No sale of personal information</strong> — we do not
                sell personal information as defined under the CCPA
              </li>
            </ul>
            <p>
              To submit a CCPA request, contact us at{" "}
              <a
                href="mailto:privacy@certbench.dev"
                className="text-primary hover:underline"
              >
                privacy@certbench.dev
              </a>
              .
            </p>
          </Section>

          <Section title="11. Children's Privacy">
            <p>
              The Service is not directed to children under 16. We do not
              knowingly collect personal information from children under 16. If
              we become aware that we have collected data from a child under 16
              without parental consent, we will promptly delete that
              information. If you believe a child under 16 has provided us with
              personal data, please contact us at{" "}
              <a
                href="mailto:privacy@certbench.dev"
                className="text-primary hover:underline"
              >
                privacy@certbench.dev
              </a>
              .
            </p>
          </Section>

          <Section title="12. Cookies and Tracking Technologies">
            <p>
              <strong>Essential cookies.</strong> We use essential cookies for
              authentication and session management. These are strictly
              necessary for the Service to function and cannot be disabled.
            </p>
            <p>
              <strong>Analytics.</strong> We use privacy-focused, cookie-free
              analytics to collect aggregated usage data. This does not involve
              tracking cookies or cross-site tracking.
            </p>
            <p>
              <strong>No advertising cookies.</strong> We do not use advertising
              or third-party tracking cookies. We do not participate in ad
              networks or serve targeted advertisements.
            </p>
          </Section>

          <Section title="13. Third-Party Links">
            <p>
              The Service may contain links to third-party websites or services.
              We are not responsible for the privacy practices of those third
              parties. We encourage you to review their privacy policies before
              providing them with your information.
            </p>
          </Section>

          <Section title="14. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, or legal requirements. If we
              make material changes, we will provide at least 30 days&apos;
              notice via email or a prominent notice within the Service before
              the changes take effect. Your continued use of the Service after
              the effective date constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="15. Contact Us">
            <p>
              If you have questions about this Privacy Policy or how we handle
              your data, please contact us:
            </p>
            <ul className="!list-none !pl-0">
              <li>
                <strong>General inquiries:</strong>{" "}
                <a
                  href="mailto:support@certbench.dev"
                  className="text-primary hover:underline"
                >
                  support@certbench.dev
                </a>
              </li>
              <li>
                <strong>Privacy-specific requests:</strong>{" "}
                <a
                  href="mailto:privacy@certbench.dev"
                  className="text-primary hover:underline"
                >
                  privacy@certbench.dev
                </a>
              </li>
              <li>
                <strong>Website:</strong>{" "}
                <a
                  href="https://certbench.dev"
                  className="text-primary hover:underline"
                >
                  certbench.dev
                </a>
              </li>
            </ul>
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
    <section className="mb-10">
      <h2 className="text-[17px] font-semibold text-text-primary mb-3">
        {title}
      </h2>
      <div className="text-[14px] text-text-secondary leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_li]:text-[14px]">
        {children}
      </div>
    </section>
  );
}
