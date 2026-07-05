import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PracticeTestPage } from "@/lib/seo/cert-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SampleQuestion } from "@/components/marketing/SampleQuestion";
import { Button } from "@/components/ui/button";

export interface PracticeTestLandingData {
  certs: {
    cert: { id: string; name: string; examCode: string };
    domains: { id: string; domainNumber: string; title: string; examWeight: number }[];
  }[];
  totalQuestions: number;
  samples: {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
}

/** Presentational template for the /​*-practice-test pages; pages load data via @/server/seo. */
export function PracticeTestLanding({
  page,
  data,
}: {
  page: PracticeTestPage;
  data: PracticeTestLandingData;
}) {
  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.h1}
        </h1>
        <div className="mt-4 grid gap-3 text-muted-foreground">
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Domain weights — useful content and it shows we mirror the real exam */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            What the exam covers
          </h2>
          {data.certs.map(({ cert, domains }) => (
            <div key={cert.id} className="mt-4">
              {data.certs.length > 1 && (
                <h3 className="mb-2 text-sm font-medium">
                  {cert.name}{" "}
                  <span className="font-mono text-xs text-muted-foreground">
                    {cert.examCode}
                  </span>
                </h3>
              )}
              <div className="grid gap-1.5">
                {domains.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-baseline justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm"
                  >
                    <span>
                      <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                        {d.domainNumber}
                      </span>
                      {d.title}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {d.examWeight}% of exam
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* Interactive samples */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            Sample questions
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick an answer to see instant grading and the explanation — the
            same experience as the full bank of{" "}
            {data.totalQuestions.toLocaleString()} questions.
          </p>
          <div className="mt-4 grid gap-4">
            {data.samples.map((q, i) => (
              <SampleQuestion key={i} number={i + 1} question={q} />
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Find out if you&apos;d pass today
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Take the free 25-question diagnostic and get a readiness score with
            a domain-by-domain breakdown — then a daily study plan built from
            your actual weak spots.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Take the free diagnostic
              <ArrowRight />
            </Link>
          </Button>
        </section>

        <FaqSection faqs={page.faqs} />
      </main>
      <Footer />
    </div>
  );
}
