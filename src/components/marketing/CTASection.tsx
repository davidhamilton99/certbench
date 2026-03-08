import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function CTASection() {
  return (
    <section className="border-t border-border">
      <div className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-[28px] sm:text-[32px] font-bold text-text-primary tracking-tight">
          Stop studying blind
        </h2>
        <p className="text-[16px] text-text-secondary mt-3 max-w-md mx-auto">
          Take the diagnostic, get your readiness score, and start following a
          plan built from your actual gaps.
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
      </div>
    </section>
  );
}
