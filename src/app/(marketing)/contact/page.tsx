import Link from "next/link";
import { Footer } from "@/components/marketing/Footer";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export const metadata = {
  title: "Contact — CertBench",
  description:
    "Get in touch with the CertBench team. Bug reports, feature requests, feedback — we read and respond to everything.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-bg-page overflow-x-hidden">
      <MarketingHeader />

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-[36px] sm:text-[40px] font-bold text-text-primary tracking-tight">
            Get in touch
          </h1>
          <p className="text-[17px] text-text-secondary mt-3 max-w-md mx-auto">
            Bug reports, feature requests, exam questions, feedback — I read
            and respond to everything personally.
          </p>
        </div>

        {/* Contact options */}
        <div className="flex flex-col gap-6">
          {/* Email */}
          <div className="border border-border rounded-lg bg-bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-info-bg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-primary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-text-primary">
                  Email
                </h2>
                <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
                  Best for bug reports with screenshots, detailed feedback, or
                  anything that needs a back-and-forth conversation.
                </p>
                <a
                  href="mailto:support@certbench.dev"
                  className="inline-block mt-3 text-[15px] text-primary hover:underline font-medium"
                >
                  support@certbench.dev
                </a>
              </div>
            </div>
          </div>

          {/* Response time */}
          <div className="border border-border rounded-lg bg-bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-success-bg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-success"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-text-primary">
                  Response time
                </h2>
                <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
                  CertBench is built and maintained by one person. I aim to
                  respond to every message within 24 hours. If
                  something is broken and blocking your study session, say so in
                  the subject line and I&apos;ll prioritise it.
                </p>
              </div>
            </div>
          </div>

          {/* What to include */}
          <div className="border border-border rounded-lg bg-bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-warning"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-text-primary">
                  Reporting a bug?
                </h2>
                <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
                  To help me fix it fast, include: (1) what you were doing when
                  it happened, (2) what you expected to happen, (3) what
                  actually happened, and (4) a screenshot if you can. Mention
                  which certification and browser you&apos;re using.
                </p>
              </div>
            </div>
          </div>

          {/* Question accuracy */}
          <div className="border border-border rounded-lg bg-bg-surface p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-danger-bg flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-danger"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-text-primary">
                  Found an incorrect question or answer?
                </h2>
                <p className="text-[14px] text-text-secondary mt-1 leading-relaxed">
                  This is the most important feedback you can give me. If you
                  believe a question has the wrong correct answer or a
                  misleading explanation, email me with the question text (or a
                  screenshot) and your reasoning. I take accuracy seriously and
                  will review and correct it within 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Help centre link */}
        <div className="mt-12 text-center">
          <p className="text-[15px] text-text-secondary">
            Looking for answers to common questions?
          </p>
          <Link
            href="/help"
            className="inline-block mt-2 text-[15px] text-primary hover:underline font-medium"
          >
            Visit the Help Centre &rarr;
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
