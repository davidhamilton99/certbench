import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border py-8">
      <div className="max-w-5xl mx-auto px-6 flex flex-col items-center gap-3">
        <p className="text-[13px] text-text-muted">
          CertBench — Certification preparation, simplified.
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/privacy"
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
          >
            Privacy Policy
          </Link>
          <span className="text-[12px] text-text-muted">&middot;</span>
          <Link
            href="/terms"
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
          >
            Terms of Service
          </Link>
          <span className="text-[12px] text-text-muted">&middot;</span>
          <a
            href="mailto:support@certbench.com"
            className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
          >
            Contact
          </a>
        </div>
        <p className="text-[11px] text-text-muted text-center max-w-lg leading-relaxed">
          CompTIA, Security+, Network+, and A+ are registered trademarks of
          CompTIA, Inc. CertBench is not affiliated with or endorsed by CompTIA.
        </p>
        <p className="text-[11px] text-text-muted">
          &copy; {new Date().getFullYear()} CertBench. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
