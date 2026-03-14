import { Metadata } from "next";
import { BackLink } from "@/components/marketing/BackLink";

export const metadata: Metadata = {
  title: "Terms of Service — CertBench",
  description: "CertBench Terms of Service — the rules governing your use of our certification study platform.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-page">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <BackLink />
        <h1 className="text-[28px] font-bold text-text-primary tracking-tight mb-2">
          Terms of Service
        </h1>
        <p className="text-[13px] text-text-muted mb-2">
          Effective date: March 14, 2026
        </p>
        <p className="text-[13px] text-text-muted mb-8">
          These Terms of Service (&ldquo;Terms&rdquo;) are a legally binding
          agreement between you and CertBench (&ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;). They govern your access to
          and use of the CertBench website, applications, and services
          (collectively, the &ldquo;Service&rdquo;). Please read them carefully.
        </p>

        <div className="prose-custom">
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using the Service, creating an account, or
              clicking &ldquo;I agree,&rdquo; you confirm that you have read,
              understood, and agree to be bound by these Terms and our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              , which is incorporated by reference. If you do not agree to these
              Terms, you must not access or use the Service.
            </p>
            <p>
              If you are using the Service on behalf of an organization, you
              represent and warrant that you have the authority to bind that
              organization to these Terms.
            </p>
          </Section>

          <Section title="2. Eligibility">
            <p>
              You must be at least 16 years old to create an account or use the
              Service. By using the Service, you represent and warrant that you
              meet this age requirement. If we learn that a user is under 16, we
              will promptly terminate their account and delete associated data.
            </p>
          </Section>

          <Section title="3. Description of Service">
            <p>
              CertBench is a certification study platform that provides practice
              questions, adaptive assessments, spaced-repetition scheduling,
              AI-powered question generation, study planning tools, and
              community study sets for IT certification preparation.
            </p>
            <p>
              The Service is provided &ldquo;as is.&rdquo; We do not guarantee
              that using CertBench will result in passing any certification
              exam. The Service is a supplemental study aid and should be used
              alongside official study resources and exam objectives.
            </p>
          </Section>

          <Section title="4. Accounts and Registration">
            <p>
              To access most features of the Service, you must create an
              account. When registering, you agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>
                Keep your login credentials confidential and not share them with
                any third party
              </li>
              <li>
                Notify us immediately at{" "}
                <a
                  href="mailto:support@certbench.com"
                  className="text-primary hover:underline"
                >
                  support@certbench.com
                </a>{" "}
                if you suspect unauthorized access to your account
              </li>
            </ul>
            <p>
              You are solely responsible for all activity that occurs under your
              account. We reserve the right to suspend or terminate accounts
              that contain inaccurate information or violate these Terms.
            </p>
          </Section>

          <Section title="5. Subscriptions, Billing, and Cancellation">
            <p>
              CertBench offers both a free tier and a paid Pro subscription.
              Details of what each tier includes are described on our{" "}
              <a href="/pricing" className="text-primary hover:underline">
                Pricing page
              </a>
              .
            </p>
            <p>
              <strong>Billing.</strong> Pro subscriptions are billed on a
              recurring monthly basis through our payment processor, Stripe. By
              subscribing, you authorize us to charge your payment method on
              each billing date. All fees are stated in US dollars unless
              otherwise indicated.
            </p>
            <p>
              <strong>Cancellation.</strong> You may cancel your Pro
              subscription at any time through the billing portal in your
              account settings. Upon cancellation, your Pro access continues
              until the end of the current billing period, after which your
              account reverts to the free tier.
            </p>
            <p>
              <strong>Refunds.</strong> We do not provide refunds for partial
              billing periods. If you believe you were charged in error, contact
              us at{" "}
              <a
                href="mailto:support@certbench.com"
                className="text-primary hover:underline"
              >
                support@certbench.com
              </a>{" "}
              within 14 days of the charge.
            </p>
            <p>
              <strong>Price changes.</strong> We may change subscription pricing
              at any time. We will provide at least 30 days&apos; notice of any
              price increase via email. Continued use of the Service after the
              price change takes effect constitutes acceptance of the new price.
            </p>
          </Section>

          <Section title="6. AI-Generated Content">
            <p>
              CertBench uses artificial intelligence to generate practice
              questions from your uploaded study materials. You acknowledge and
              agree that:
            </p>
            <ul>
              <li>
                AI-generated content may contain inaccuracies, errors, or
                outdated information
              </li>
              <li>
                You are responsible for verifying AI-generated content against
                official exam objectives and authoritative sources
              </li>
              <li>
                CertBench is not liable for any consequences arising from
                reliance on AI-generated content
              </li>
              <li>
                AI-generated questions are produced for study purposes only and
                do not represent actual certification exam content
              </li>
            </ul>
          </Section>

          <Section title="7. User Content and Intellectual Property">
            <p>
              <strong>Your content.</strong> You retain all ownership rights to
              study materials you upload and study sets you create
              (&ldquo;User Content&rdquo;). By uploading User Content, you
              grant CertBench a non-exclusive, worldwide, royalty-free licence
              to host, store, and process that content solely for the purpose of
              providing the Service to you.
            </p>
            <p>
              <strong>Public study sets.</strong> If you choose to make a study
              set public, you grant other CertBench users a non-exclusive,
              non-transferable licence to view and practice with that content
              through the Service. You may revoke this by making the set private
              at any time.
            </p>
            <p>
              <strong>Prohibited content.</strong> You must not upload content
              that infringes on the intellectual property rights of any third
              party, contains actual certification exam questions
              (&ldquo;brain dumps&rdquo;), or otherwise violates applicable law.
            </p>
            <p>
              <strong>Our content.</strong> All CertBench branding, design,
              software, and proprietary content are owned by CertBench and
              protected by intellectual property laws. You may not copy,
              reproduce, distribute, or create derivative works from our content
              without prior written permission.
            </p>
          </Section>

          <Section title="8. Acceptable Use">
            <p>You agree not to:</p>
            <ul>
              <li>
                Use the Service to distribute actual certification exam
                questions or answers (brain dumps)
              </li>
              <li>
                Reverse-engineer, decompile, disassemble, or otherwise attempt
                to derive the source code of the Service
              </li>
              <li>
                Scrape, crawl, or use automated tools to extract data from the
                Service without prior written permission
              </li>
              <li>Share your account credentials or allow others to access your account</li>
              <li>Use the AI generation feature to produce harmful, abusive, or misleading content</li>
              <li>Circumvent usage limits, rate limiting, or billing mechanisms</li>
              <li>
                Use the Service in any manner that could damage, disable,
                overburden, or impair our infrastructure
              </li>
              <li>Violate any applicable law or regulation while using the Service</li>
            </ul>
            <p>
              We reserve the right to investigate violations and take
              appropriate action, including suspending or terminating your
              account and reporting illegal activity to law enforcement.
            </p>
          </Section>

          <Section title="9. Third-Party Trademark Disclaimer">
            <p>
              CertBench is an independent study platform. We are not affiliated
              with, endorsed by, or sponsored by CompTIA, Amazon Web Services
              (AWS), Microsoft, Cisco, Google, or any other certification body
              or vendor. All certification names, exam codes, and logos are
              trademarks of their respective owners and are used solely for
              identification purposes. Our practice questions are independently
              created and are not sourced from actual certification exams.
            </p>
          </Section>

          <Section title="10. Copyright and DMCA Policy">
            <p>
              We respect the intellectual property rights of others. If you
              believe that content available through the Service infringes your
              copyright, please send a notice to{" "}
              <a
                href="mailto:support@certbench.com"
                className="text-primary hover:underline"
              >
                support@certbench.com
              </a>{" "}
              containing:
            </p>
            <ul>
              <li>
                A description of the copyrighted work you claim has been
                infringed
              </li>
              <li>
                The URL or location of the infringing content on the Service
              </li>
              <li>Your contact information (name, email address, and phone number)</li>
              <li>
                A statement that you have a good-faith belief that the use is
                not authorized by the copyright owner
              </li>
              <li>
                A statement, under penalty of perjury, that the information in
                your notice is accurate and that you are the copyright owner or
                authorized to act on the owner&apos;s behalf
              </li>
              <li>Your physical or electronic signature</li>
            </ul>
            <p>
              We will respond to valid notices in accordance with applicable
              copyright law and may remove or disable access to the infringing
              content.
            </p>
          </Section>

          <Section title="11. Disclaimer of Warranties">
            <p>
              THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS
              AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS,
              IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED
              WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              TITLE, AND NON-INFRINGEMENT.
            </p>
            <p>
              We do not warrant that the Service will be uninterrupted,
              error-free, or secure, that defects will be corrected, or that the
              Service or the servers that make it available are free of viruses
              or other harmful components. We do not guarantee any specific
              results from use of the Service.
            </p>
          </Section>

          <Section title="12. Limitation of Liability">
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT
              SHALL CERTBENCH, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE
              LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR
              PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF PROFITS,
              DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF
              OR IN CONNECTION WITH YOUR USE OF OR INABILITY TO USE THE SERVICE.
            </p>
            <p>
              OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR
              RELATING TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE
              GREATER OF (A) THE AMOUNTS YOU HAVE PAID US IN THE TWELVE (12)
              MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED US DOLLARS
              ($100.00).
            </p>
          </Section>

          <Section title="13. Indemnification">
            <p>
              You agree to indemnify, defend, and hold harmless CertBench and
              its officers, directors, employees, and agents from and against
              any claims, liabilities, damages, losses, and expenses (including
              reasonable attorneys&apos; fees) arising out of or in any way
              connected with (a) your use of the Service, (b) your User
              Content, (c) your violation of these Terms, or (d) your violation
              of any rights of a third party.
            </p>
          </Section>

          <Section title="14. Termination">
            <p>
              <strong>By you.</strong> You may delete your account at any time
              from your profile settings. Upon deletion, we will remove your
              personal data in accordance with our{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
              .
            </p>
            <p>
              <strong>By us.</strong> We may suspend or terminate your account
              at any time, with or without notice, if we reasonably believe you
              have violated these Terms. In the case of a first-time minor
              violation, we will attempt to provide notice and an opportunity to
              cure before termination.
            </p>
            <p>
              <strong>Effect of termination.</strong> Upon termination, your
              right to use the Service ceases immediately. Sections 7 (IP), 11
              (Disclaimers), 12 (Limitation of Liability), 13
              (Indemnification), 15 (Governing Law), and 16 (Dispute
              Resolution) survive termination.
            </p>
          </Section>

          <Section title="15. Governing Law">
            <p>
              These Terms shall be governed by and construed in accordance with
              the laws of the State of Delaware, United States, without regard
              to its conflict-of-law provisions.
            </p>
          </Section>

          <Section title="16. Dispute Resolution">
            <p>
              <strong>Informal resolution.</strong> Before filing any formal
              claim, you agree to first contact us at{" "}
              <a
                href="mailto:support@certbench.com"
                className="text-primary hover:underline"
              >
                support@certbench.com
              </a>{" "}
              and attempt to resolve the dispute informally for at least 30
              days.
            </p>
            <p>
              <strong>Arbitration.</strong> If the dispute cannot be resolved
              informally, you and CertBench agree to resolve it through binding
              individual arbitration administered by the American Arbitration
              Association under its Consumer Arbitration Rules. The arbitration
              shall take place in the State of Delaware or, at your election,
              may be conducted remotely.
            </p>
            <p>
              <strong>Class action waiver.</strong> You and CertBench agree that
              disputes will be resolved on an individual basis only. Neither
              party may participate in a class action, class arbitration, or
              representative proceeding.
            </p>
            <p>
              <strong>Small claims exception.</strong> Either party may bring an
              individual action in small claims court in lieu of arbitration.
            </p>
          </Section>

          <Section title="17. Modifications to Terms">
            <p>
              We reserve the right to modify these Terms at any time. If we
              make material changes, we will provide at least 30 days&apos;
              notice via email to the address associated with your account or
              through a prominent notice within the Service. Your continued use
              of the Service after the effective date of the revised Terms
              constitutes acceptance. If you do not agree to the updated Terms,
              you must stop using the Service and delete your account.
            </p>
          </Section>

          <Section title="18. General Provisions">
            <p>
              <strong>Entire agreement.</strong> These Terms, together with our
              Privacy Policy, constitute the entire agreement between you and
              CertBench regarding the Service and supersede all prior
              agreements.
            </p>
            <p>
              <strong>Severability.</strong> If any provision of these Terms is
              held to be invalid or unenforceable, the remaining provisions will
              remain in full force and effect.
            </p>
            <p>
              <strong>Waiver.</strong> Our failure to enforce any right or
              provision of these Terms will not constitute a waiver of that
              right or provision.
            </p>
            <p>
              <strong>Assignment.</strong> You may not assign or transfer these
              Terms or your rights under them without our prior written consent.
              We may assign these Terms without restriction.
            </p>
            <p>
              <strong>Force majeure.</strong> We shall not be liable for any
              failure or delay in performing our obligations where such failure
              or delay results from events beyond our reasonable control,
              including but not limited to natural disasters, acts of
              government, internet service disruptions, or third-party service
              outages.
            </p>
          </Section>

          <Section title="19. Contact Us">
            <p>
              If you have questions about these Terms, please contact us:
            </p>
            <ul className="!list-none !pl-0">
              <li>
                <strong>Email:</strong>{" "}
                <a
                  href="mailto:support@certbench.com"
                  className="text-primary hover:underline"
                >
                  support@certbench.com
                </a>
              </li>
              <li>
                <strong>Website:</strong>{" "}
                <a
                  href="https://certbench.com"
                  className="text-primary hover:underline"
                >
                  certbench.com
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
