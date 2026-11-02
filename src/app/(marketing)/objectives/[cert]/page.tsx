import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { loadObjectiveHub } from "@/server/seo/objective-data";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { JsonLd } from "@/components/seo/JsonLd";
import { Button } from "@/components/ui/button";
import { COMPTIA_URLS, OBJECTIVE_HUB_CERTS } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { breadcrumbList } from "@/lib/seo/structured-data";

export const revalidate = 86400; // daily — objectives are stable
export const dynamicParams = false; // only exams with a hub

export function generateStaticParams() {
  return OBJECTIVE_HUB_CERTS.map((cert) => ({ cert }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cert: string }>;
}): Promise<Metadata> {
  const { cert } = await params;
  const data = await loadObjectiveHub(cert);
  if (!data) return {};
  return pageMetadata({
    title: `${data.examCode} Exam Objectives with Practice Questions`,
    description: `All ${data.objectiveCount} ${data.certName} ${data.examCode} exam objectives by domain and exam weight, each with original practice questions and full explanations. Free, no account needed.`,
    path: `/objectives/${cert}`,
  });
}

export default async function ObjectiveHubPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  const data = await loadObjectiveHub(cert);
  if (!data) notFound();

  // Security+ is the only exam with a hub so far (OBJECTIVE_HUB_CERTS).
  const practicePage = "/security-plus-practice-test";

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <JsonLd
        data={breadcrumbList([
          { name: "CertBench", path: "/" },
          { name: `${data.shortCertName} practice`, path: practicePage },
          { name: `${data.examCode} objectives`, path: `/objectives/${cert}` },
        ])}
      />
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <Link href={practicePage} className="hover:text-foreground">
            {data.shortCertName} practice
          </Link>
          <ChevronRight className="size-3" />
          <span>{data.examCode} objectives</span>
        </nav>

        <p className="font-mono text-xs text-muted-foreground">
          {data.certName} · {data.examCode}
        </p>
        <h1 className="mt-1 text-balance font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {data.examCode} exam objectives, with practice for each one
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          The {data.examCode} exam has {data.objectiveCount} objectives across{" "}
          {data.domains.length} domains. Each one below opens a page of original
          practice questions with full explanations, no account needed. CompTIA
          publishes the full objectives on its{" "}
          <a
            href={COMPTIA_URLS.securityV7}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {data.examCode} exam page
          </a>
          .
        </p>
        <ExamVersionNote certSlugs={[cert]} className="mt-4" />

        {data.domains.map((domain) => (
          <section key={domain.number} className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                Domain {domain.number}: {domain.title}
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                {domain.weight}% of exam
              </span>
            </div>
            <div className="mt-3 grid gap-1.5">
              {domain.objectives.map((o) => (
                <Link
                  key={o.slug}
                  href={`/objectives/${cert}/${o.slug}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card px-4 py-2.5 text-sm transition-colors hover:border-muted-foreground/40"
                >
                  <span>
                    <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                      {o.code}
                    </span>
                    {o.title}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <section className="mt-10 grid justify-items-center gap-3 rounded-xl border bg-muted/40 px-6 py-10 text-center">
          <h2 className="text-xl font-semibold tracking-tight">
            Study them in order, one short stop at a time
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Your {data.shortCertName} path walks every objective above in quick
            rounds, then a readiness checkpoint shows where you stand.
          </p>
          <Button asChild size="lg" className="mt-1">
            <Link href={`/path/${cert}`}>
              Start my {data.shortCertName} path
              <ArrowRight />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">No account needed to start.</p>
        </section>

        <RelatedLinks
          links={[
            {
              href: practicePage,
              label: `${data.shortCertName} practice test`,
              note: "Sample questions across all five domains",
            },
            {
              href: "/security-plus-pbq-examples",
              label: `${data.shortCertName} PBQ examples`,
              note: "Work through interactive performance-based questions",
            },
            {
              href: "/tools/security-plus-acronyms-quiz",
              label: `${data.shortCertName} acronyms list and quiz`,
              note: "The acronyms the exam leans on",
            },
          ]}
        />
      </main>
      <Footer />
    </div>
  );
}
