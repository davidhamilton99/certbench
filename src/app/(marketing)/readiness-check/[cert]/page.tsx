import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { listReadinessCheckCerts, loadReadinessCheck } from "@/server/seo/readiness-check-data";
import { FREE_LAB_COUNT } from "@/core/path/free-labs";
import { ReadinessCheck } from "@/components/marketing/ReadinessCheck";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks, type RelatedLink } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderHero, LanderPage, LanderProse, LanderStage } from "@/components/marketing/lander/Lander";
import { pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 86400;
export const dynamicParams = false;

const READINESS_RELATED: Record<string, RelatedLink[]> = {
  "security-plus-sy0-701": [
    { href: "/security-plus-practice-test", label: "Security+ practice test", note: "A free full-length SY0-701 exam: 90 questions, 90 minutes" },
    { href: "/security-plus-pbq-examples", label: "Security+ PBQ examples", note: `${FREE_LAB_COUNT} free hands-on labs, three of them with no account` },
  ],
  "network-plus-n10-009": [
    { href: "/network-plus-practice-test", label: "Network+ practice test", note: "A free full-length N10-009 exam: 90 questions, 90 minutes" },
    { href: "/network-plus-pbq-examples", label: "Network+ PBQ examples", note: "Network diagram and troubleshooting labs" },
  ],
  "a-plus-core1-220-1201": [
    { href: "/a-plus-core-1-practice-test", label: "A+ Core 1 practice test", note: "A free full-length 220-1201 exam: 90 questions, 90 minutes" },
    { href: "/objectives/a-plus-core1-220-1201", label: "220-1201 exam objectives", note: "All 27 objectives, each with its own practice questions" },
    { href: "/a-plus-core-1-pbq-examples", label: "A+ Core 1 PBQ examples", note: "Hardware, networking and troubleshooting labs" },
  ],
  "a-plus-core2-220-1202": [
    { href: "/a-plus-core-2-practice-test", label: "A+ Core 2 practice test", note: "A free full-length 220-1202 exam: 90 questions, 90 minutes" },
    { href: "/objectives/a-plus-core2-220-1202", label: "220-1202 exam objectives", note: "All 36 objectives, each with its own practice questions" },
    { href: "/a-plus-core-2-pbq-examples", label: "A+ Core 2 PBQ examples", note: "Windows, security and malware removal labs" },
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
  const count = data.questions.length;
  return pageMetadata({
    title: `Free ${data.shortCertName} readiness check (${count} questions)`,
    description: `Am I ready for ${data.shortCertName}? Answer ${count} questions, weighted as the exam weights its domains, and see an estimate of your readiness at once. The check is free, and no account is needed.`,
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
    <LanderPage>
      <LanderHero
        // The exam's code is the one fact here that the title does not hold.
        eyebrow={`${data.shortCertName} ${data.examCode}`}
        title={`Am I ready for ${data.shortCertName}?`}
        sub="This check gives you an estimate in about three minutes."
        specs={[
          { label: "Questions", value: data.questions.length },
          { label: "Weighting", value: "By exam domain" },
          { label: "Account", value: "Not required" },
        ]}
      />

      <LanderStage>
        <ReadinessCheck
          cert={cert}
          questions={data.questions}
          shortCertName={data.shortCertName}
          objectiveCount={data.objectiveCount}
        />
      </LanderStage>

      {/* Nothing is drawn for an exam that has no note. */}
      <LanderBlock className="mt-10 empty:hidden">
        <ExamVersionNote certSlugs={[cert]} />
      </LanderBlock>

      <LanderProse>
        <p>
          The check has {data.questions.length} questions, weighted in the same way as the domains of the{" "}
          {data.examCode} exam. Each answer is marked at once and explained, and the check ends with an estimate of
          your readiness. No account is needed.
        </p>
      </LanderProse>

      <LanderBlock>
        <RelatedLinks links={READINESS_RELATED[cert] ?? []} />
      </LanderBlock>
    </LanderPage>
  );
}
