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
        data. Use it alongside your favourite course — it tracks what you get
        wrong and tells you when you&apos;re ready to sit the exam.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link href="/register">
          <Button size="lg">Start Studying Free</Button>
        </Link>
      </div>

      {/* Quick facts */}
      <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
        {[
          { value: "2,000+", label: "Practice questions across 4 exams" },
          { value: "4", label: "CompTIA certifications supported" },
          { value: "100%", label: "Free to start — no credit card" },
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
