import Link from "next/link";
import { ArrowRight, ChevronRight } from "lucide-react";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { SampleQuestion } from "@/components/marketing/SampleQuestion";
import { Button } from "@/components/ui/button";

export interface ObjectiveLandingData {
  certSlug: string;
  certName: string;
  shortCertName: string;
  examCode: string;
  code: string;
  title: string;
  domainNumber: string | null;
  domainTitle: string | null;
  domainWeight: number | null;
  samples: {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  siblings: { code: string; title: string; slug: string }[];
}

/** Maps a cert slug to its public practice-test hub page. */
const PRACTICE_HUB: Record<string, string> = {
  "security-plus-sy0-701": "/security-plus-practice-test",
  "network-plus-n10-009": "/network-plus-practice-test",
  "a-plus-core1-220-1101": "/a-plus-practice-test",
  "a-plus-core2-220-1102": "/a-plus-practice-test",
};

export function ObjectiveLanding({ data }: { data: ObjectiveLandingData }) {
  const hub = PRACTICE_HUB[data.certSlug] ?? "/register";

  return (
    <div className="flex min-h-svh flex-col">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        {/* Breadcrumb */}
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href={hub} className="hover:text-foreground">
            {data.shortCertName} practice
          </Link>
          <ChevronRight className="size-3" />
          {data.domainNumber && (
            <>
              <span>Domain {data.domainNumber}</span>
              <ChevronRight className="size-3" />
            </>
          )}
          <span className="font-mono">Objective {data.code}</span>
        </nav>

        <p className="font-mono text-xs text-muted-foreground">
          {data.certName} · {data.examCode}
        </p>
        <h1 className="mt-1 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Objective {data.code}: {data.title}
        </h1>

        <div className="mt-4 grid gap-3 text-muted-foreground">
          <p className="leading-relaxed">
            Practice questions for {data.shortCertName} objective {data.code},{" "}
            &ldquo;{data.title}.&rdquo; Every question is original, written to
            the {data.examCode} exam objectives, and comes with a full
            explanation — answer them below to see instant grading.
          </p>
          {data.domainTitle && data.domainWeight !== null && (
            <p className="leading-relaxed">
              This objective sits in{" "}
              <strong className="text-foreground">
                Domain {data.domainNumber}: {data.domainTitle}
              </strong>
              , which is about {data.domainWeight}% of the exam — so mastering
              it moves your readiness score meaningfully.
            </p>
          )}
        </div>

        {/* Interactive samples */}
        <section className="mt-8 grid gap-4">
          {data.samples.map((q, i) => (
            <SampleQuestion key={i} number={i + 1} question={q} />
          ))}
        </section>

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Practice every objective, adaptively
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            CertBench tracks your score on {data.code} and every other
            objective, then builds a daily plan that targets your weakest
            spots. Start with the free diagnostic.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href="/register">
              Take the free diagnostic
              <ArrowRight />
            </Link>
          </Button>
        </section>

        {/* Sibling objectives — internal linking within the domain */}
        {data.siblings.length > 0 && (
          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">
              More objectives{data.domainNumber ? ` in Domain ${data.domainNumber}` : ""}
            </h2>
            <div className="mt-3 grid gap-1.5">
              {data.siblings.map((s) => (
                <Link
                  key={s.slug}
                  href={`/objectives/${data.certSlug}/${s.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span>
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {s.code}
                    </span>
                    {s.title}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <p className="mt-8 text-sm">
          <Link href={hub} className="text-primary underline underline-offset-4">
            ← All {data.shortCertName} practice questions
          </Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}
