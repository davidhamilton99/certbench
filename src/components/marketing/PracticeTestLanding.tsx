import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PRACTICE_TEST_PAGES, type PracticeTestPage } from "@/lib/seo/cert-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { SampleQuestion } from "@/components/marketing/SampleQuestion";
import { QuickRound } from "@/components/path/QuickRound";
import type { QuickRoundData } from "@/core/path/types";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";

export interface PracticeTestLandingData {
  certs: {
    cert: { id: string; name: string; examCode: string };
    domains: { id: string; domainNumber: string; title: string; examWeight: number }[];
  }[];
  totalQuestions: number;
  sampleGroups: {
    certName: string;
    examCode: string;
    questions: {
      questionText: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }[];
  }[];
}

export interface ObjectiveLink {
  certSlug: string;
  code: string;
  title: string;
  slug: string;
}

/** Presentational template for the /​*-practice-test pages; pages load data via @/server/seo. */
export function PracticeTestLanding({
  page,
  data,
  objectives = [],
  round = null,
}: {
  page: PracticeTestPage;
  data: PracticeTestLandingData;
  objectives?: ObjectiveLink[];
  /** The exam's warm-up, played inline at the top (single-exam pages). */
  round?: QuickRoundData | null;
}) {
  const otherHubs = PRACTICE_TEST_PAGES.filter((p) => p.path !== page.path);

  // GEO/SEO: mark the page as a free educational practice resource so search
  // and generative engines can identify and cite it for "free CompTIA … test".
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: page.metaTitle,
    description: page.metaDescription,
    url: `https://certbench.dev/${page.path}`,
    learningResourceType: "Practice test",
    educationalUse: "Practice",
    isAccessibleForFree: true,
    inLanguage: "en",
    provider: {
      "@type": "Organization",
      name: "CertBench",
      url: "https://certbench.dev",
    },
    about: data.certs.map(({ cert }) => ({ "@type": "Thing", name: cert.name })),
  };

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd data={learningResource} />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.h1}
        </h1>
        {/* Lead with something to do: the exam's warm-up, the same quick
            round the guided path opens with. */}
        {round && (
          <section className="mt-6 grid gap-3">
            <p className="text-sm text-muted-foreground">
              Start with {round.reps.length} quick questions, no account needed.
            </p>
            <QuickRound
              cert={round.cert}
              stopId="warmup"
              examName={round.examName}
              reps={round.reps}
              label={`${round.examName} warm-up`}
              surface="practice_test_page"
              pitch={`That's the warm-up. Your ${round.examName} path covers all ${round.objectiveCount} objectives in short stops like this, then shows where you stand.`}
            />
          </section>
        )}

        <div className={round ? "mt-10 grid gap-3 text-muted-foreground" : "mt-4 grid gap-3 text-muted-foreground"}>
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Interactive samples — someone who searched "practice test" should
            be answering real exam questions right away, not reading a pitch
            and a table. Sorted shortest-first so the opener is approachable
            rather than the most daunting question. */}
        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">
            {round ? "Exam-style sample questions" : "Sample questions"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick an answer to see instant grading and the explanation — the
            same experience as the full bank of{" "}
            {data.totalQuestions.toLocaleString()} questions.
          </p>
          {data.sampleGroups.map((group, gi) => {
            // Continuous numbering across groups, computed purely.
            const offset = data.sampleGroups
              .slice(0, gi)
              .reduce((sum, g) => sum + g.questions.length, 0);
            // Lead with the shortest (least intimidating) question, then ramp up.
            const ordered = [...group.questions].sort(
              (a, b) => a.questionText.length - b.questionText.length
            );
            return (
              <div key={group.examCode} className="mt-5">
                {data.sampleGroups.length > 1 && (
                  <h3 className="mb-3 text-sm font-medium">
                    {group.certName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {group.examCode}
                    </span>
                  </h3>
                )}
                <div className="grid gap-4">
                  {ordered.map((q, i) => (
                    <SampleQuestion key={i} number={offset + i + 1} question={q} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Domain weights — useful, fully-indexed content that shows we mirror
            the real exam. Kept on the page, just moved below the interactive
            moment so it never blocks a visitor from doing a question. */}
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

        {/* Practice by objective — hub links to the programmatic pages */}
        {objectives.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Practice by exam objective
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Drill a specific objective — each page has its own set of
              questions with explanations.
            </p>
            <div className="mt-4 grid gap-1.5">
              {objectives.map((o) => (
                <Link
                  key={`${o.certSlug}/${o.slug}`}
                  href={`/objectives/${o.certSlug}/${o.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span>
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {o.code}
                    </span>
                    {o.title}
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Related free resources — internal links to tools, PBQ pages, roundup */}
        {page.related && page.related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Keep practising — free
            </h2>
            <div className="mt-4 grid gap-1.5">
              {page.related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span>
                    <span className="font-medium">{r.label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {r.note}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Other CompTIA practice tests — cross-link the sibling hubs */}
        {otherHubs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-semibold tracking-tight">
              Other CompTIA practice tests
            </h2>
            <div className="mt-4 grid gap-1.5 sm:grid-cols-2">
              {otherHubs.map((h) => (
                <Link
                  key={h.path}
                  href={`/${h.path}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span className="font-medium">{h.title}</span>
                  <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Study it one short step at a time
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            The guided path walks every exam objective in quick rounds like the
            questions above, then a readiness checkpoint shows where you&apos;d
            stand today.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={page.certSlugs.length === 1 ? `/path/${page.certSlugs[0]}` : "/start"}>
              Start my path
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">No account needed to start.</p>
        </section>

        <FaqSection faqs={page.faqs} />
      </main>
      <Footer />
    </div>
  );
}
