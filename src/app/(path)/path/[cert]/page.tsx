import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPathBank } from "@/server/path/bank";
import { buildStop } from "@/server/path/build-stop";
import { buildPlan } from "@/core/path/plan";
import { seedFrom } from "@/core/path/compose";
import { isPathCert, PATH_CERTS } from "@/core/path/types";
import { studyPathTitle } from "@/core/path/versions";
import { EXAM_NAMES } from "@/data/path/titles";
import { PathApp } from "@/components/path/PathApp";
import { holdScript } from "@/components/path/path-hold";
import { usesOfficialObjectiveNumbers } from "@/lib/seo/exam-versions";
import { pageMetadata } from "@/lib/seo/metadata";
import { freeOnPublicPages } from "./free-parts";

// The page holds what every first-time visitor is given: the introductory
// questions and the course outline. They change only with a deployment, which
// builds the page again, or when the question bank changes. Every later step is
// built by the server from its own copy of the bank, which it refreshes every
// hour (src/server/path/bank.ts). So the page is rebuilt once a day; a
// correction that must show at once is published by deploying again.
export const revalidate = 86400;

// Only the exams listed below have a study path. Any other address under
// /path/ is answered as not found at once, without running the page for it.
export const dynamicParams = false;

export function generateStaticParams() {
  return PATH_CERTS.map((cert) => ({ cert }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cert: string }>;
}): Promise<Metadata> {
  const { cert } = await params;
  const name = EXAM_NAMES[cert] ?? "CompTIA";
  // Security+ and A+ are taught objective by objective, as CompTIA lists them.
  // The Network+ questions are grouped into topics of CertBench's own, which
  // are not CompTIA's N10-009 objectives, so its description says "topic".
  const official = usesOfficialObjectiveNumbers(cert);
  // The app itself: a few words of server HTML and no heading, so it stays out
  // of search. The practice-test and objective pages are what should rank.
  return pageMetadata({
    // An exam that is taught in two versions carries its code in the title.
    title: studyPathTitle(cert, name),
    description: official
      ? `Study for ${name} one short step at a time: quick questions on every exam objective, a readiness checkpoint, and a chart of where you stand on every objective.`
      : `Study for ${name} one short step at a time: quick questions on every topic, a readiness checkpoint, and a chart of where you stand on every topic.`,
    path: `/path/${cert}`,
    noindex: true,
  });
}

export default async function PathPage({ params }: { params: Promise<{ cert: string }> }) {
  const { cert } = await params;
  if (!isPathCert(cert)) notFound();
  const bank = await loadPathBank(cert);
  if (!bank) notFound();

  const plan = buildPlan(bank.structure);
  const warmup = buildStop({
    bank,
    plan,
    index: 0,
    seen: [],
    missed: [],
    seed: seedFrom("visitor", cert, 0, 0),
  });
  if (!warmup) notFound();

  return (
    <>
      {/* Before first paint: has this device started this study path, is
          someone signed in, or are they back from paying? Then the stage is
          held until the page knows where they are, instead of flashing the
          introductory questions. A first visit paints them at once. */}
      <script dangerouslySetInnerHTML={{ __html: holdScript(cert) }} />
      <PathApp
        cert={cert}
        structure={bank.structure}
        plan={plan}
        warmup={warmup}
        questionCount={bank.questions.length}
        free={freeOnPublicPages(cert)}
      />
    </>
  );
}
