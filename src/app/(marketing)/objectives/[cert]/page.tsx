import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { loadObjectiveHub } from "@/server/seo/objective-data";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { PathCard } from "@/components/marketing/PathCard";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderHero, LanderPage, LanderProse, LanderSection } from "@/components/marketing/lander/Lander";
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
import { breadcrumbList } from "@/lib/seo/structured-data";

export const revalidate = 86400; // daily — objectives are stable
export const dynamicParams = false; // only exams with a hub

/** Each hub's own links, after its practice test, PBQ examples and readiness check. */
const MORE_LINKS: Record<string, { href: string; label: string; note: string }[]> = {
  [SECURITY_PLUS_CERT]: [
    {
      href: "/tools/security-plus-acronyms-quiz",
      label: "Security+ acronyms list and quiz",
      note: "The acronyms the exam leans on",
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
      note: "Core 1 networking — the ports you need cold",
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
    title: `${data.examCode} Exam Objectives with Practice Questions`,
    description: `All ${data.objectiveCount} ${data.certName} ${data.examCode} exam objectives by domain and exam weight, each with original practice questions and full explanations. Free, no account needed.`,
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

  // Every objective as a tile, grouped by domain with its share of the exam.
  const groups = data.domains
    .filter((d) => d.objectives.length > 0)
    .map((d) => ({
      label: (
        <>
          Domain {domainLabel(d.number)} · {d.title}
          <span className="ml-2 font-normal text-muted-foreground">{d.weight}% of the exam</span>
        </>
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
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
            <Link href={practicePage} className="hover:text-foreground">
              {data.shortCertName} practice
            </Link>
            <ChevronRight className="size-3" />
            <span>{data.examCode} objectives</span>
          </nav>
        }
        eyebrow={`${data.certName} · ${data.examCode}`}
        title={`${data.examCode} exam objectives, with practice for each one`}
        sub="Each one opens its own practice questions, explained."
        specs={[`${data.objectiveCount} objectives`, `${data.domains.length} domains`, "No account needed"]}
      />

      <div className="mx-auto mt-10 max-w-2xl px-5 sm:px-6">
        <ExamVersionNote certSlugs={[cert]} />
      </div>

      <LanderSection width="xl" className="pt-14 sm:pt-20">
        <TileGrid groups={groups} details="always" />
      </LanderSection>

      <div className="mx-auto w-full max-w-5xl px-3 pt-20 sm:px-6 sm:pt-28">
        <PathCard
          kicker={`Your ${data.shortCertName} path`}
          title="Study them in order, one short stop at a time"
          href={`/path/${cert}`}
          label={`Start my ${data.shortCertName} path`}
          context="objective_hub"
          note="No account needed to start."
        >
          Your {data.shortCertName} path walks every objective above in quick rounds, then a readiness checkpoint shows
          where you stand.
        </PathCard>
      </div>

      <LanderProse>
        <p>
          The {data.examCode} exam has {data.objectiveCount} objectives across {data.domains.length} domains. Each one
          above opens a page of original practice questions with full explanations, no account needed. CompTIA
          publishes the full objectives on its{" "}
          <a
            href={COMPTIA_EXAM_PAGES[cert]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            {data.examCode} exam page
          </a>
          .
        </p>
      </LanderProse>

      <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">
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
                    note: "12 free interactive PBQs, 3 with no account",
                  },
                ]
              : []),
            {
              href: `/readiness-check/${cert}`,
              label: `${data.shortCertName} readiness check`,
              note: "10 questions, no account: an estimate by domain",
            },
            ...(MORE_LINKS[cert] ?? []),
          ]}
        />
      </div>
    </LanderPage>
  );
}
