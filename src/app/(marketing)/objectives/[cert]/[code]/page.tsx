import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  listObjectivePages,
  loadObjectivePage,
} from "@/server/seo/objective-data";
import { ObjectiveLanding } from "@/components/marketing/ObjectiveLanding";

export const revalidate = 86400; // daily — question samples are stable
export const dynamicParams = false; // only the pre-built objective pages exist

export async function generateStaticParams() {
  return listObjectivePages();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cert: string; code: string }>;
}): Promise<Metadata> {
  const { cert, code } = await params;
  const data = await loadObjectivePage(cert, code);
  if (!data) return {};
  // Kept short: the root layout appends " — CertBench".
  return {
    title: `${data.shortCertName} Objective ${data.code} Practice Questions`,
    description: `Free ${data.shortCertName} (${data.examCode}) practice questions for objective ${data.code}: ${data.title}. Original, exam-style, with full explanations.`,
  };
}

export default async function ObjectivePage({
  params,
}: {
  params: Promise<{ cert: string; code: string }>;
}) {
  const { cert, code } = await params;
  const data = await loadObjectivePage(cert, code);
  if (!data) notFound();
  return <ObjectiveLanding data={data} />;
}
