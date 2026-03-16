import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="border-t border-border">
      <div className="max-w-3xl mx-auto px-6 py-14 sm:py-20 text-center">
        <h2 className="text-[28px] sm:text-[32px] font-bold text-text-primary tracking-tight">
          Stop guessing. Start knowing.
        </h2>
        <p className="text-[16px] text-text-secondary mt-3 max-w-md mx-auto">
          Use alongside your favourite video course or textbook. CertBench
          handles the practice — so you know exactly when you&apos;re ready
          for exam day.
        </p>
        <div className="mt-8">
          <Link href="/register">
            <Button size="lg">Get Started Free</Button>
          </Link>
        </div>

        {/* Supported certs */}
        <div className="mt-16">
          <p className="text-[12px] font-medium text-text-muted uppercase tracking-wider mb-4">
            Now supporting
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              "CompTIA Security+ SY0-701",
              "CompTIA Network+ N10-009",
              "CompTIA A+ 220-1101",
              "CompTIA A+ 220-1102",
            ].map((cert) => (
              <span
                key={cert}
                className="px-4 py-2 text-[14px] text-text-secondary bg-bg-surface border border-border rounded-md"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>

        {/* Founder note */}
        <div className="mt-16 pt-8 border-t border-border">
          <p className="text-[14px] text-text-secondary italic max-w-md mx-auto leading-relaxed">
            &ldquo;I built CertBench because I got tired of guessing whether I
            was ready — practising hundreds of questions with no real signal on
            where I stood. This is the tool I wished I had.&rdquo;
          </p>
          <p className="text-[13px] text-text-muted mt-2">
            — David, founder of CertBench
          </p>
        </div>
      </div>
    </section>
  );
}
