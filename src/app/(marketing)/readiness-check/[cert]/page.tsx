import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  listReadinessCheckCerts,
  loadReadinessCheck,
} from "@/server/seo/readiness-check-data";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { ReadinessCheck } from "@/components/marketing/ReadinessCheck";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks, type RelatedLink } from "@/components/marketing/RelatedLinks";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;
export const dynamicParams = false;

const READINESS_RELATED: Record<string, RelatedLink[]> = {
  "security-plus-sy0-701": [
    { href: "/security-plus-practice-test", label: "Security+ practice test", note: "Original SY0-701 questions with full explanations" },
    { href: "/security-plus-pbq-examples", label: "Security+ PBQ examples", note: "Work through interactive performance-based questions" },
  ],
  "network-plus-n10-009": [
    { href: "/network-plus-practice-test", label: "Network+ practice test", note: "Original N10-009 questions with full explanations" },
    { href: "/network-plus-pbq-examples", label: "Network+ PBQ examples", note: "Try interactive topology and troubleshooting scenarios" },
  ],
  "a-plus-core1-220-1201": [
    { href: "/a-plus-core-1-practice-test", label: "A+ Core 1 practice test", note: "Original 220-1201 questions with full explanations" },
    { href: "/objectives/a-plus-core1-220-1201", label: "220-1201 exam objectives", note: "All 27 objectives, each with its own practice questions" },
    { href: "/a-plus-core-1-pbq-examples", label: "A+ Core 1 PBQ examples", note: "Hardware, networking and troubleshooting scenarios to work through" },
  ],
  "a-plus-core2-220-1202": [
    { href: "/a-plus-core-2-practice-test", label: "A+ Core 2 practice test", note: "Original 220-1202 questions with full explanations" },
    { href: "/objectives/a-plus-core2-220-1202", label: "220-1202 exam objectives", note: "All 36 objectives, each with its own practice questions" },
    { href: "/a-plus-core-2-pbq-examples", label: "A+ Core 2 PBQ examples", note: "Windows, security and malware removal scenarios to work through" },
  ],
};

export async function generateStaticParams() {
  return listReadinessCheckCerts();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cert: string }>;
}): Promise<Metadata> {
  const { cert } = await params;
  const data = await loadReadinessCheck(cert);
  if (!data) return {};
  return pageMetadata({
    title: `Free ${data.shortCertName} Readiness Check (10 Questions)`,
    description: `Am I ready for ${data.shortCertName}? Answer 10 exam-weighted questions and get an instant readiness estimate — free, no account needed.`,
    path: `/readiness-check/${cert}`,
  });
}

export default async function ReadinessCheckPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  const data = await loadReadinessCheck(cert);
  if (!data || data.questions.length === 0) notFound();

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12 sm:py-16">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Am I ready for {data.shortCertName}?
        </h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Find out in about three minutes: {data.questions.length} questions,
          weighted the way the real {data.examCode} exam weights its domains,
          with instant grading and explanations. No account needed.
        </p>
        <ExamVersionNote certSlugs={[cert]} className="mt-4" />
        <div className="mt-8">
          <ReadinessCheck
            cert={cert}
            questions={data.questions}
            shortCertName={data.shortCertName}
            objectiveCount={data.objectiveCount}
          />
        </div>
        <RelatedLinks links={READINESS_RELATED[cert] ?? []} />
      </main>
      <Footer />
    </div>
  );
}
