import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ArticleBody, ArticleSection } from "@/components/marketing/lander/Article";
import { LanderPage } from "@/components/marketing/lander/Lander";
import { COLUMN } from "@/components/marketing/lander/layout";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "CertBench Privacy Policy: how we collect, use, and protect your personal data.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    // The page is set like every reading page: on the page's one left edge,
    // inside the public frame, which draws the header and the footer.
    <LanderPage className="pb-16 sm:pb-24">
      <ArticleBody>
        <header className={COLUMN}>
          <h1 className="cb-title">Privacy Policy</h1>
          <p className="mt-4 text-small text-muted-foreground">
            Effective date: March 14, 2026. Last updated: November 22, 2026.
          </p>
          <p className="cb-measure mt-6 text-body text-muted-foreground">
            This Privacy Policy describes how CertBench (&ldquo;we,&rdquo;
            &ldquo;us,&rdquo; or &ldquo;our&rdquo;) collects, uses, shares, and
            protects your personal information when you use our website,
            applications, and services (the &ldquo;Service&rdquo;). By using the
            Service, you agree to the practices described in this policy.
          </p>
        </header>

        <div>
          <Section title="1. Information We Collect">
            <p>We collect the following categories of information:</p>

            <p>
              <strong>1.1 Account information.</strong> When you create an account, we collect your email address, display name, and password. Passwords are stored as secure cryptographic hashes: we never store or have access to your plaintext password. If you sign in with Google instead, Google shares your name, email address, profile picture, and Google account ID with us, and no password is created. Section 5 explains how we handle data from Google.
            </p>
            <p>
              <strong>1.2 Study and usage data.</strong> We collect data
              generated through your use of the Service, including quiz
              responses, practice exam results, readiness scores, study
              progress, spaced-repetition scheduling data, and study set
              interactions.
            </p>
            <p>
              <strong>1.3 User-generated content.</strong> Study sets you have
              created, the questions in them, and any excerpt of your study
              materials that was saved with a study set are stored on our
              servers to provide the Service.
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
              <strong>1.5 Usage analytics and session recordings.</strong> We
              use PostHog to understand how the Service is used. It records the
              pages you view, what you click, the features you use, your browser,
              operating system, and device type, and your approximate location
              (derived from your IP address). It also makes session recordings:
              a replay of what happens on our pages during your visit, in which
              anything you type into a form field is masked. When you are signed
              in, this data is linked to your account and email address.
            </p>
            <p>
              <strong>1.6 Communications.</strong> If you contact us for
              support, we retain your messages and any information you provide
              to resolve your inquiry.
            </p>
            <p>
              <strong>1.7 Emails we send.</strong> We send account emails (such
              as password resets) and emails about your study, such as progress
              reminders and exam countdowns. Every study email includes an
              unsubscribe link.
            </p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul>
              <li>
                <strong>Provide the Service</strong>: authenticate your
                account, deliver study content, calculate readiness scores,
                record your progress on your study path, and schedule your
                spaced review
              </li>
              <li>
                <strong>Process payments</strong>: manage your subscription and
                billing through Stripe
              </li>
              <li>
                <strong>Communicate with you</strong>: send account emails
                (account verification, password resets, billing receipts) and
                emails about your study, which you can unsubscribe from at any
                time
              </li>
              <li>
                <strong>Improve the Service</strong>: study how the Service is
                used, including session recordings, to find and fix problems and
                decide what to build next
              </li>
              <li>
                <strong>Ensure security</strong>: detect and prevent fraud,
                abuse, and unauthorized access
              </li>
              <li>
                <strong>Comply with legal obligations</strong>: respond to
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
                <strong>Contract performance</strong>: processing necessary to
                provide the Service you signed up for (account data, study
                data, payment processing)
              </li>
              <li>
                <strong>Legitimate interests</strong>: improving the Service,
                ensuring security, and preventing fraud, where these interests
                are not overridden by your rights
              </li>
              <li>
                <strong>Consent</strong>: where you have opted in to receive
                marketing communications (you may withdraw consent at any time)
              </li>
              <li>
                <strong>Legal obligation</strong>: processing required to
                comply with applicable laws
              </li>
            </ul>
          </Section>

          <Section title="4. AI Processing">
            <p>
              Until November 2026, CertBench offered a tool that made practice
              questions from study materials that members uploaded. When a
              member used that tool, the uploaded study materials were sent to
              our AI provider at the time, Anthropic, for processing. The tool
              has been retired, and uploaded study materials are no longer sent
              to an AI provider. While the tool was offered:
            </p>
            <ul>
              <li>
                Content was transmitted securely via encrypted connections (TLS)
              </li>
              <li>
                Anthropic processed content solely for the purpose of generating
                study questions and did not use it to train its AI models
              </li>
              <li>
                Study materials were not shared with any other third party
                through the tool
              </li>
              <li>
                The questions that the tool produced were stored as part of the
                member&apos;s study sets and were not used by Anthropic beyond
                the request that produced them
              </li>
            </ul>
            <p>
              Study sets that were made with the tool remain stored with the
              accounts of the members who made them.
            </p>
          </Section>

          <Section title="5. Google User Data">
            <p>
              You can create or sign in to your CertBench account with Google
              (&ldquo;Sign in with Google&rdquo;). This section explains how
              CertBench accesses, uses, stores, shares, protects, retains, and
              deletes the Google user data it receives.
            </p>
            <ul>
              <li>
                <strong>What Google user data we access</strong>: when you sign
                in with Google, we ask only for Google&apos;s basic sign-in
                permissions (your name, email address, and profile). Google
                shares your name, email address, profile picture, and Google
                account ID with CertBench. We never access your Gmail, Google
                Drive, contacts, calendar, or any other Google data.
              </li>
              <li>
                <strong>How we use Google user data</strong>: only to create
                your CertBench account, recognize you when you sign in, and send
                account and study emails to your email address. We do not use
                Google user data for advertising, we do not sell it, and we do
                not use it to develop, improve, or train AI or machine-learning
                models.
              </li>
              <li>
                <strong>How we share Google user data</strong>: we do not share,
                transfer, or disclose it to anyone except the service providers
                listed in section 6 that need it to run CertBench (our
                authentication provider, Supabase, which stores it), or when the
                law requires it.
              </li>
              <li>
                <strong>How we store and protect Google user data</strong>: it
                is stored with your account by Supabase, encrypted in transit
                (TLS) and at rest, and protected by access controls so that only
                your account and CertBench&apos;s servers can read it.
              </li>
              <li>
                <strong>How long we keep Google user data, and how to delete
                it</strong>: we keep it for as long as your account exists and
                delete it when your account is deleted. To have your account and
                its Google user data deleted, email{" "}
                <a
                  href="mailto:privacy@certbench.dev"
                  className="cb-link"
                >
                  privacy@certbench.dev
                </a>
                . You can also stop CertBench&apos;s access at any time from your
                Google Account settings, under Security, then Third-party apps
                and services.
              </li>
            </ul>
            <p>
              CertBench&apos;s use and transfer of information received from
              Google APIs adheres to the{" "}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                className="cb-link"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements.
            </p>
          </Section>

          <Section title="6. How We Share Your Information">
            <p>
              We do not sell, rent, or trade your personal information. We share
              data only with the following service providers, who process it on
              our behalf under contractual data-processing agreements:
            </p>
            <ul>
              <li>
                <strong>Supabase</strong>: database hosting, authentication,
                and file storage (US-based infrastructure)
              </li>
              <li>
                <strong>Vercel</strong>: application hosting and content
                delivery (global edge network)
              </li>
              <li>
                <strong>Stripe</strong>: payment processing for Pro
                subscribers (PCI DSS Level 1 compliant)
              </li>
              <li>
                <strong>PostHog</strong>: usage analytics and session
                recordings (US-based infrastructure)
              </li>
              <li>
                <strong>Resend</strong>: sending our emails
              </li>
              <li>
                <strong>Google</strong>: sign-in, if you choose to sign in with
                Google
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

          <Section title="7. International Data Transfers">
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

          <Section title="8. Data Retention">
            <p>We retain your information as follows:</p>
            <ul>
              <li>
                <strong>Account data</strong>: retained for as long as your
                account is active, plus 30 days after deletion to allow for
                account recovery
              </li>
              <li>
                <strong>Study data</strong>: retained for as long as your
                account is active and deleted upon account deletion
              </li>
              <li>
                <strong>Payment records</strong>: retained for 7 years after
                the last transaction to comply with tax and financial reporting
                requirements
              </li>
              <li>
                <strong>Analytics data</strong>: session recordings are deleted
                automatically after 30 days; other usage analytics are kept for
                as long as they help us improve the Service
              </li>
              <li>
                <strong>Support communications</strong>: retained for 2 years
                after resolution
              </li>
            </ul>
          </Section>

          <Section title="9. Security">
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

          <Section title="10. Your Rights">
            <p>
              Depending on your location, you may have the following rights
              regarding your personal data:
            </p>
            <ul>
              <li>
                <strong>Access</strong>: request a copy of the personal data we
                hold about you
              </li>
              <li>
                <strong>Correction</strong>: request that we correct inaccurate
                or incomplete data
              </li>
              <li>
                <strong>Deletion</strong>: request that we delete your personal
                data (Pro members can also delete their account directly from
                their profile settings)
              </li>
              <li>
                <strong>Data portability</strong>: request your data in a
                structured, commonly used, machine-readable format
              </li>
              <li>
                <strong>Restriction</strong>: request that we restrict
                processing of your data in certain circumstances
              </li>
              <li>
                <strong>Objection</strong>: object to processing based on
                legitimate interests
              </li>
              <li>
                <strong>Withdraw consent</strong>: where processing is based on
                consent, withdraw it at any time without affecting the
                lawfulness of prior processing
              </li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{" "}
              <a
                href="mailto:privacy@certbench.dev"
                className="cb-link"
              >
                privacy@certbench.dev
              </a>
              . We will respond to your request within 30 days. We may ask you
              to verify your identity before processing your request.
            </p>
          </Section>

          <Section title="11. California Privacy Rights (CCPA)">
            <p>
              If you are a California resident, you have additional rights under
              the California Consumer Privacy Act (CCPA):
            </p>
            <ul>
              <li>
                <strong>Right to know</strong>: request details about the
                categories and specific pieces of personal information we
                collect, the purposes, and the third parties with whom it is
                shared
              </li>
              <li>
                <strong>Right to delete</strong>: request deletion of your
                personal information, subject to certain exceptions
              </li>
              <li>
                <strong>Right to non-discrimination</strong>: we will not
                discriminate against you for exercising your CCPA rights
              </li>
              <li>
                <strong>No sale of personal information</strong>: we do not
                sell personal information as defined under the CCPA
              </li>
            </ul>
            <p>
              To submit a CCPA request, contact us at{" "}
              <a
                href="mailto:privacy@certbench.dev"
                className="cb-link"
              >
                privacy@certbench.dev
              </a>
              .
            </p>
          </Section>

          <Section title="12. Children's Privacy">
            <p>
              The Service is not directed to children under 16. We do not
              knowingly collect personal information from children under 16. If
              we become aware that we have collected data from a child under 16
              without parental consent, we will promptly delete that
              information. If you believe a child under 16 has provided us with
              personal data, please contact us at{" "}
              <a
                href="mailto:privacy@certbench.dev"
                className="cb-link"
              >
                privacy@certbench.dev
              </a>
              .
            </p>
          </Section>

          <Section title="13. Cookies and Tracking Technologies">
            <p>
              <strong>Essential cookies.</strong> We use essential cookies for
              authentication and session management. These are strictly
              necessary for the Service to function and cannot be disabled.
            </p>
            <p>
              <strong>Analytics.</strong> PostHog stores an identifier in a
              first-party cookie and in your browser&apos;s local storage, so it
              can recognize your visits to CertBench and connect them for the
              analytics and session recordings described in section 1.5. It
              does not track you on other websites.
            </p>
            <p>
              <strong>No advertising cookies.</strong> We do not use advertising
              or third-party tracking cookies. We do not participate in ad
              networks or serve targeted advertisements.
            </p>
          </Section>

          <Section title="14. Third-Party Links">
            <p>
              The Service may contain links to third-party websites or services.
              We are not responsible for the privacy practices of those third
              parties. We encourage you to review their privacy policies before
              providing them with your information.
            </p>
          </Section>

          <Section title="15. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time to reflect
              changes in our practices, technology, or legal requirements. If we
              make material changes, we will provide at least 30 days&apos;
              notice via email or a prominent notice within the Service before
              the changes take effect. Your continued use of the Service after
              the effective date constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="16. Contact Us">
            <p>
              If you have questions about this Privacy Policy or how we handle
              your data, please contact us:
            </p>
            <ul className="!list-none !pl-0">
              <li>
                <strong>General inquiries:</strong>{" "}
                <a
                  href="mailto:support@certbench.dev"
                  className="cb-link"
                >
                  support@certbench.dev
                </a>
              </li>
              <li>
                <strong>Privacy-specific requests:</strong>{" "}
                <a
                  href="mailto:privacy@certbench.dev"
                  className="cb-link"
                >
                  privacy@certbench.dev
                </a>
              </li>
              <li>
                <strong>Website:</strong>{" "}
                <a
                  href="https://certbench.dev"
                  className="cb-link"
                >
                  certbench.dev
                </a>
              </li>
            </ul>
          </Section>
        </div>
      </ArticleBody>
    </LanderPage>
  );
}

/**
 * One numbered clause: the rule and heading of every reading page, then the
 * clause's text at the width of its measure. The clauses stand closer
 * together than an article's sections do, because many of them are short.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ArticleSection title={title} className="mt-12 sm:mt-16">
      <div className="cb-measure grid gap-4 text-body text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-2 [&_ul]:pl-5">
        {children}
      </div>
    </ArticleSection>
  );
}