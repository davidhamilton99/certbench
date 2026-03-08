import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="max-w-3xl mx-auto px-6 pt-24 pb-16 text-center">
      <h1 className="text-[36px] sm:text-[44px] font-bold text-text-primary tracking-tight leading-[1.15]">
        Know exactly what to study.
        <br />
        Pass your certification.
      </h1>
      <p className="text-[17px] sm:text-[18px] text-text-secondary mt-6 max-w-xl mx-auto leading-relaxed">
        CertBench builds a personalised study plan from your actual performance
        data. No guessing, no wasted time — just the topics you need to master.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link href="/register">
          <Button size="lg">Start Studying Free</Button>
        </Link>
      </div>

      {/* Quick facts */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
        {[
          { value: "90", label: "Questions per practice exam" },
          { value: "5", label: "Exam domains weighted by importance" },
          { value: "1", label: "Readiness score that tracks everything" },
        ].map((fact) => (
          <div key={fact.value + fact.label}>
            <p className="text-[36px] sm:text-[44px] font-bold font-mono text-text-primary tabular-nums">
              {fact.value}
            </p>
            <p className="text-[15px] text-text-secondary mt-1">
              {fact.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
