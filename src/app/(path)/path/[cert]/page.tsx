import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPathBank } from "@/server/path/bank";
import { buildStop } from "@/server/path/build-stop";
import { buildPlan } from "@/core/path/plan";
import { seedFrom } from "@/core/path/compose";
import { isPathCert, PATH_CERTS } from "@/core/path/types";
import { EXAM_NAMES } from "@/data/path/titles";
import { PathApp } from "@/components/path/PathApp";
import { holdScript } from "@/components/path/path-hold";
import { pageMetadata } from "@/lib/seo/metadata";

// The warm-up is the same for every first-time visitor; rebuild hourly.
export const revalidate = 3600;

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
  // The app itself: a few words of server HTML and no heading, so it stays out
  // of search. The practice-test and objective pages are what should rank.
  return pageMetadata({
    title: `${name} study path`,
    description: `Study for ${name} one short step at a time: quick questions on every exam objective, a readiness checkpoint, and a map of where you stand.`,
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
      {/* Before first paint: has this device started this path, or are they
          back from paying? Then hold the stage until the client picks up where
          they are, instead of flashing the warm-up. A first visit paints the
          warm-up immediately. */}
      <script dangerouslySetInnerHTML={{ __html: holdScript(cert) }} />
      <PathApp
        cert={cert}
        structure={bank.structure}
        plan={plan}
        warmup={warmup}
        questionCount={bank.questions.length}
      />
    </>
  );
}
