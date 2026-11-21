import { Lock } from "lucide-react";
import { pbqRegistry } from "@/data/pbq";
import type { PbqScenario } from "@/data/pbq/types";
import { EXAM_NAMES } from "@/data/path/titles";
import { labLibrary, minutesOf } from "@/core/path/labs";
import { freeLabs } from "@/core/path/free-labs";
import { JsonLd } from "@/components/seo/JsonLd";
import type { PbqExamplePage } from "@/lib/seo/cert-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PbqLab, type FreeLab, type LabTier } from "@/components/marketing/PbqLab";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderHero, LanderPage, LanderProse, LanderStage } from "@/components/marketing/lander/Lander";
import { domainLabel, handsOnCount, HANDS_ON_TYPES, LAB_TYPES, labMeta } from "@/components/path/lab-types";

const TIER: Record<PbqScenario["type"], LabTier> = {
  ordering: "Warm-up",
  "threat-hunt": "Core",
  matching: "Core",
  categorization: "Core",
  topology: "Exam-level",
  simulation: "Exam-level",
};

/** Shared server template for the /​*-pbq-examples pages. */
export function PbqExampleLanding({ page }: { page: PbqExamplePage }) {
  const scenarios = pbqRegistry[page.certSlug] ?? [];
  // Most of the exam's labs, free with no account (core/path/free-labs.ts).
  const free = freeLabs(scenarios);
  const freeIds = new Set(free.map((s) => s.id));
  const labs: FreeLab[] = free.map((s) => ({ scenario: s, tier: TIER[s.type], minutes: minutesOf(s) }));

  // The rest, as the path's lab library lists them: domain by domain, hands-on first.
  const rest = labLibrary(scenarios.filter((s) => !freeIds.has(s.id)));
  const domains = [...new Map(scenarios.map((s) => [s.domain_number, s.domain_title] as const))]
    .filter(([number]) => rest.some((l) => l.domain === number))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const drills = rest.filter((l) => !HANDS_ON_TYPES.has(l.type)).length;

  const path = `/path/${page.certSlug}`;
  const examName = EXAM_NAMES[page.certSlug] ?? page.title.replace(/ PBQ examples$/, "");

  // GEO/SEO: a free, interactive practice resource, so search and AI answers
  // can say what it is and how many labs it gives away.
  const learningResource = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: page.metaTitle,
    description: page.metaDescription,
    url: `https://certbench.dev/${page.path}`,
    learningResourceType: "Interactive simulation",
    interactivityType: "active",
    educationalUse: "Practice",
    isAccessibleForFree: true,
    inLanguage: "en",
    provider: { "@type": "Organization", name: "CertBench", url: "https://certbench.dev" },
    about: [{ "@type": "Thing", name: `CompTIA ${examName} performance-based questions` }],
  };

  return (
    <LanderPage>
      <JsonLd data={learningResource} />
      <LanderHero
        eyebrow={`${examName} · PBQ labs`}
        title={page.h1}
        sub="Pick one and work it right here."
        specs={[`${free.length} free interactive PBQs`, "Graded with partial credit", "Start with no account"]}
      />

      {/* Lead with the thing they came for: a lab, on the path's own stage. */}
      {labs.length > 0 && (
        <LanderStage width="lg">
          <PbqLab labs={labs} examName={examName} pathHref={path} labCount={scenarios.length} />
        </LanderStage>
      )}

      <div className="mx-auto mt-10 grid w-full max-w-3xl gap-8 px-5 sm:px-6">
        <ExamVersionNote certSlugs={[page.certSlug]} />

        {/* Every other lab, listed the way the path's lab library lists them,
            folded so it's there for anyone looking (and for search) without
            being a wall under the lab. */}
        {rest.length > 0 && (
          <ReferenceFold
            title={`${rest.length} more labs with Pro`}
            summary={
              <>
                {handsOnCount(rest)}
                {drills > 0 && <>, plus {drills} quick drills</>}, graded with partial credit. Pro opens all{" "}
                {scenarios.length} on your {examName} path, offered after its readiness checkpoint, with your
                progress kept.
              </>
            }
          >
            <div className="grid gap-6 p-1 sm:p-2">
              {domains.map(([number, title]) => {
                const inDomain = rest.filter((l) => l.domain === number);
                return (
                  <section key={number} aria-labelledby={`labs-${number}`} className="grid gap-2.5">
                    <h3 id={`labs-${number}`} className="text-sm font-medium leading-snug">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{domainLabel(number)}</span>
                      {title}
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {inDomain.map((lab) => {
                        const { Icon } = LAB_TYPES[lab.type];
                        return (
                          <li
                            key={lab.id}
                            className="flex min-w-0 items-center gap-3.5 rounded-2xl border border-border bg-card/60 p-3.5"
                          >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                              <Icon className="size-[18px]" aria-hidden />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-balance font-medium leading-snug">{lab.title}</span>
                              <span className="mt-1 block font-mono text-[11px] uppercase leading-relaxed tracking-wider text-muted-foreground">
                                {labMeta(lab)}
                              </span>
                            </span>
                            <Lock className="size-4 shrink-0 text-muted-foreground" aria-label="With Pro" />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </ReferenceFold>
        )}
      </div>

      <div className="mx-auto w-full max-w-5xl px-3 pt-20 sm:px-6 sm:pt-28">
        <PathCard
          kicker={`Your ${examName} path`}
          title="PBQs are only part of it"
          href={path}
          label="Start my path"
          context="pbq_page"
        >
          Your guided path walks every exam objective in short stops, and a readiness checkpoint shows where you
          stand.
        </PathCard>
      </div>

      <LanderProse>
        {page.intro.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </LanderProse>

      <div className="mx-auto w-full max-w-3xl px-5 sm:px-6">
        <RelatedLinks links={page.related ?? []} />
        <FaqSection faqs={page.faqs} />
      </div>
    </LanderPage>
  );
}
