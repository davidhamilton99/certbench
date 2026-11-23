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

export const revalidate = 86400; // Once a day: the sample questions rarely change.
export const dynamicParams = false; // Only the objective pages that were built exist.

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
    // The whole title tag, kept to the length a search result shows: the layout adds nothing to it.
    title: objectivePageTitle(data),
    absoluteTitle: true,
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
  // The page leads with this objective's step of the study path, played on the page itself.
  const round = await loadQuickRound(data.certSlug, data.code);
  return <ObjectiveLanding data={data} round={round} />;
}
