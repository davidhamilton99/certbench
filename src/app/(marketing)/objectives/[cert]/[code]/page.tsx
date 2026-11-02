import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  listObjectivePages,
  loadObjectivePage,
} from "@/server/seo/objective-data";
import { ObjectiveLanding } from "@/components/marketing/ObjectiveLanding";
import { loadQuickRound } from "@/server/path/quick-round";
import { pageMetadata } from "@/lib/seo/metadata";
import { objectivePageDescription, objectivePageTitle } from "@/lib/seo/objective-meta";

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
  return pageMetadata({
    title: objectivePageTitle(data),
    description: objectivePageDescription(data),
    path: `/objectives/${cert}/${code}`,
  });
}

export default async function ObjectivePage({
  params,
}: {
  params: Promise<{ cert: string; code: string }>;
}) {
  const { cert, code } = await params;
  const data = await loadObjectivePage(cert, code);
  if (!data) notFound();
  // Lead with this objective's stop of the guided path, playable inline.
  const round = await loadQuickRound(data.certSlug, data.code);
  return <ObjectiveLanding data={data} round={round} />;
}
