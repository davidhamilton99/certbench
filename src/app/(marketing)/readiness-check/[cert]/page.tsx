import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  listReadinessCheckCerts,
  loadReadinessCheck,
} from "@/server/seo/readiness-check-data";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { ReadinessCheck } from "@/components/marketing/ReadinessCheck";

export const revalidate = 86400;
export const dynamicParams = false;

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
  return {
    title: `Free ${data.shortCertName} Readiness Check (10 Questions)`,
    description: `Am I ready for ${data.shortCertName}? Answer 10 exam-weighted questions and get an instant readiness estimate — free, no account needed.`,
  };
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
    <div className="flex min-h-svh flex-col">
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
        <div className="mt-8">
          <ReadinessCheck
            questions={data.questions}
            shortCertName={data.shortCertName}
            objectiveCount={data.objectiveCount}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
