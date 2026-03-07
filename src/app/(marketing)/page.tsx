import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-page">
      {/* Header */}
      <header className="border-b border-border bg-bg-surface">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-[18px] font-bold text-text-primary tracking-tight">
            CertBench
          </span>
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

      {/* Hero */}
      <main className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h1 className="text-[36px] font-bold text-text-primary tracking-tight leading-tight">
          Know exactly what to study.
          <br />
          Pass your certification.
        </h1>
        <p className="text-[18px] text-text-secondary mt-6 max-w-xl mx-auto leading-relaxed">
          CertBench builds a personalised study plan from your actual
          performance data. No guessing, no wasted time — just the topics you
          need to master.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/register">
            <Button size="lg">Start Studying Free</Button>
          </Link>
        </div>

        {/* Quick facts */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="text-[36px] font-bold font-mono text-text-primary">
              90
            </p>
            <p className="text-[15px] text-text-secondary mt-1">
              Questions per practice exam
            </p>
          </div>
          <div>
            <p className="text-[36px] font-bold font-mono text-text-primary">
              5
            </p>
            <p className="text-[15px] text-text-secondary mt-1">
              Exam domains weighted by importance
            </p>
          </div>
          <div>
            <p className="text-[36px] font-bold font-mono text-text-primary">
              1
            </p>
            <p className="text-[15px] text-text-secondary mt-1">
              Readiness score that tracks everything
            </p>
          </div>
        </div>

        {/* Supported certs */}
        <div className="mt-20">
          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-4">
            Now supporting
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {["CompTIA Security+ SY0-701", "CompTIA Network+ N10-009", "CompTIA A+ 220-1101"].map(
              (cert) => (
                <span
                  key={cert}
                  className="px-4 py-2 text-[14px] text-text-secondary bg-bg-surface border border-border rounded-md"
                >
                  {cert}
                </span>
              )
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <p className="text-[13px] text-text-muted">
            CertBench — Certification preparation, simplified.
          </p>
        </div>
      </footer>
    </div>
  );
}
