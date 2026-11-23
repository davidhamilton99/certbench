import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { loadObjectiveHub } from "@/server/seo/objective-data";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderHero, LanderPage, LanderProse, LanderSection } from "@/components/marketing/lander/Lander";
import { TileGrid } from "@/components/marketing/lander/TileGrid";
import { JsonLd } from "@/components/seo/JsonLd";
import { PBQ_EXAMPLE_PAGES, practicePageFor } from "@/lib/seo/cert-pages";
import {
  A_PLUS_CORE1_CERT,
  A_PLUS_CORE2_CERT,
  COMPTIA_EXAM_PAGES,
  OBJECTIVE_HUB_CERTS,
  SECURITY_PLUS_CERT,
} from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { OBJECTIVES_IN_OWN_WORDS } from "@/lib/seo/objective-meta";
import { breadcrumbList } from "@/lib/seo/structured-data";

export const revalidate = 86400; // Once a day: the objectives of an exam rarely change.
export const dynamicParams = false; // Only the exams that have an objectives page.

/** Each page's own links, after its practice test, PBQ examples and readiness check. */
const MORE_LINKS: Record<string, { href: string; label: string; note: string }[]> = {
  [SECURITY_PLUS_CERT]: [
    {
      href: "/tools/security-plus-acronyms-quiz",
      label: "Security+ acronyms list and quiz",
      note: "The SY0-701 acronyms, with a quiz",
    },
  ],
  [A_PLUS_CORE1_CERT]: [
    {
      href: `/objectives/${A_PLUS_CORE2_CERT}`,
      label: "220-1202 exam objectives",
      note: "Core 2, the other half of A+",
    },
    {
      href: "/tools/port-numbers-quiz",
      label: "Port numbers quiz",
      note: "Practice port numbers and protocols for Core 1",
    },
  ],
  [A_PLUS_CORE2_CERT]: [
    {
      href: `/objectives/${A_PLUS_CORE1_CERT}`,
      label: "220-1201 exam objectives",
      note: "Core 1, the other half of A+",
    },
  ],
};

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
    title: `${data.examCode} exam objectives with practice questions`,
    // The count is of the objectives that have a page, so it is not called "all" of the exam's objectives.
    description: `This page lists ${data.objectiveCount} ${data.certName} ${data.examCode} exam objectives by domain and exam weight, each with original practice questions and full explanations. The pages are free, and no account is needed.`,
    path: `/objectives/${cert}`,
  });
}

const domainLabel = (n: string) => n.replace(/\.0$/, "");

export default async function ObjectiveHubPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  const data = await loadObjectiveHub(cert);
  if (!data) notFound();

  const practicePage = practicePageFor(cert);
  const pbqPage = PBQ_EXAMPLE_PAGES.find((p) => p.certSlug === cert);

  // Every objective as a row, grouped by domain with the domain's share of the exam.
  const groups = data.domains
    .filter((d) => d.objectives.length > 0)
    .map((d) => ({
      label: (
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
          <span>
            Domain {domainLabel(d.number)}: {d.title}
          </span>{" "}
          <span className="text-note font-normal text-muted-foreground">{d.weight}% of the exam</span>
        </span>
      ),
      tiles: d.objectives.map((o) => ({
        href: `/objectives/${cert}/${o.slug}`,
        code: o.code,
        title: o.topic,
        detail: o.title,
      })),
    }));

  return (
    <LanderPage>
      <JsonLd
        data={breadcrumbList([
          { name: "CertBench", path: "/" },
          { name: `${data.shortCertName} practice`, path: practicePage },
          { name: `${data.examCode} objectives`, path: `/objectives/${cert}` },
        ])}
      />
      <LanderHero
        above={
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-note text-muted-foreground">
            <Link
              href={practicePage}
              className="underline decoration-foreground/30 underline-offset-4 hover:text-foreground hover:decoration-current"
            >
              {data.shortCertName} practice
            </Link>
            <ChevronRight aria-hidden className="size-3" />
            <span aria-current="page">{data.examCode} objectives</span>
          </nav>
        }
        eyebrow={`${data.certName} (${data.examCode})`}
        title={`${data.examCode} exam objectives, with practice for each one`}
        sub="Each objective opens its own practice questions, with explanations."
        specs={[
          { label: "Objectives", value: data.objectiveCount },
          { label: "Domains", value: data.domains.length },
          { label: "Account", value: "Not required" },
        ]}
      />

      <LanderBlock className="mt-10">
        <ExamVersionNote certSlugs={[cert]} />
      </LanderBlock>

      {/* The domains are this page's sections, so each is a second-level heading. */}
      <LanderSection width="xl" className="pt-14 sm:pt-20">
        <TileGrid groups={groups} details="always" headingLevel={2} />
      </LanderSection>

      <PathCard
        className="mt-20 sm:mt-28"
        kicker={`${data.shortCertName} study path`}
        title="Study them in order, one short step at a time"
        href={`/path/${cert}`}
        label={`Start the ${data.shortCertName} study path`}
        context="objective_hub"
        note="You do not need an account to start."
      >
        The {data.shortCertName} study path takes you through every objective above in short steps, and a readiness
        checkpoint then shows where you stand.
      </PathCard>

      <LanderProse>
        <p>
          The {data.examCode} exam has {data.objectiveCount} objectives across {data.domains.length} domains. Each
          objective above opens a page of original practice questions with full explanations, and no account is
          needed. CompTIA publishes the full objectives on its{" "}
          <a href={COMPTIA_EXAM_PAGES[cert]} target="_blank" rel="noopener noreferrer" className="cb-link">
            {data.examCode} exam page
          </a>
          .
        </p>
        {OBJECTIVES_IN_OWN_WORDS.includes(cert) && (
          <p>
            The objective names and descriptions on this page are CertBench&apos;s own wording, and CompTIA&apos;s
            objectives document has the official wording.
          </p>
        )}
      </LanderProse>

      <LanderBlock>
        <RelatedLinks
          links={[
            {
              href: practicePage,
              label: `${data.shortCertName} practice test`,
              note: `Sample questions across all ${data.domains.length} domains`,
            },
            ...(pbqPage
              ? [
                  {
                    href: `/${pbqPage.path}`,
                    label: `${data.shortCertName} PBQ examples`,
                    note: `${FREE_LAB_COUNT} free hands-on labs, three of them with no account`,
                  },
                ]
              : []),
            {
              href: `/readiness-check/${cert}`,
              label: `${data.shortCertName} readiness check`,
              note: "Ten questions for an estimate by domain, with no account",
            },
            ...(MORE_LINKS[cert] ?? []),
          ]}
        />
      </LanderBlock>
    </LanderPage>
  );
}
