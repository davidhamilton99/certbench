import { Lock } from "lucide-react";
import { pbqRegistry } from "@/data/pbq";
import type { PbqScenario } from "@/data/pbq/types";
import { EXAM_NAMES } from "@/data/path/titles";
import { labLibrary, minutesOf } from "@/core/path/labs";
import { freeLabs } from "@/core/path/free-labs";
import { EXAM_CODES } from "@/core/path/versions";
import { JsonLd } from "@/components/seo/JsonLd";
import type { PbqExamplePage } from "@/lib/seo/cert-pages";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PbqLab, type FreeLab, type LabTier } from "@/components/marketing/PbqLab";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { LanderBlock, LanderHero, LanderPage, LanderProse, LanderStage } from "@/components/marketing/lander/Lander";
import { domainLabel, handsOnCount, HANDS_ON_TYPES, LAB_TYPES, labMeta } from "@/components/path/lab-types";

const TIER: Record<PbqScenario["type"], LabTier> = {
  ordering: "Introductory",
  "threat-hunt": "Core",
  matching: "Core",
  categorization: "Core",
  topology: "Exam level",
  simulation: "Exam level",
};

/** The labs that the chooser leads with, which need no account (see PbqLab). */
const OPEN_TO_ALL = 3;

/** The server template that the four PBQ example pages share. */
export function PbqExampleLanding({ page }: { page: PbqExamplePage }) {
  const scenarios = pbqRegistry[page.certSlug] ?? [];
  // Most of the exam's labs are free on this page (core/path/free-labs.ts).
  const free = freeLabs(scenarios);
  const freeIds = new Set(free.map((s) => s.id));
  const labs: FreeLab[] = free.map((s) => ({ scenario: s, tier: TIER[s.type], minutes: minutesOf(s) }));

  // The rest, as the study path's list of labs sets them out: domain by domain, hands-on first.
  const rest = labLibrary(scenarios.filter((s) => !freeIds.has(s.id)));
  const domains = [...new Map(scenarios.map((s) => [s.domain_number, s.domain_title] as const))]
    .filter(([number]) => rest.some((l) => l.domain === number))
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const drills = rest.filter((l) => !HANDS_ON_TYPES.has(l.type)).length;

  const path = `/path/${page.certSlug}`;
  const examName = EXAM_NAMES[page.certSlug] ?? page.title.replace(/ PBQ examples$/, "");
  const examCode = (EXAM_CODES as Record<string, string | undefined>)[page.certSlug];

  // A free, interactive practice resource, described so that search and AI
  // answers can say what it is and that it is free.
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
        // The exam's code is the one fact here that the title does not hold.
        eyebrow={examCode ? `${examName} ${examCode}` : undefined}
        title={page.h1}
        sub="Choose a lab and complete it on this page."
        specs={[
          { label: "Free labs", value: free.length },
          { label: "Grading", value: "With partial credit" },
          {
            label: "Account",
            value: free.length > OPEN_TO_ALL ? `Not required for the first ${OPEN_TO_ALL} labs` : "Not required",
          },
        ]}
      />

      {/* The thing the visitor came for comes first: a lab, on the study path's own stage. */}
      {labs.length > 0 && (
        <LanderStage width="lg">
          <PbqLab labs={labs} examName={examName} pathHref={path} labCount={scenarios.length} />
        </LanderStage>
      )}

      {/* Nothing is drawn for an exam that has no note. */}
      <LanderBlock className="mt-10 empty:hidden">
        <ExamVersionNote certSlugs={[page.certSlug]} />
      </LanderBlock>

      {/* Every other lab, listed domain by domain and folded: in the page for
          anyone who looks for it, and for search, without standing as a wall
          under the lab. */}
      {rest.length > 0 && (
        <LanderBlock className="mt-8">
          <ReferenceFold
            title={`${rest.length} more labs with Pro`}
            summary={
              <>
                {handsOnCount(rest)}
                {drills > 0 && (
                  <>
                    , and {drills} short {drills === 1 ? "drill" : "drills"}
                  </>
                )}
                , all graded with partial credit. Pro opens all {scenarios.length} on your {examName} study path. It
                is offered after the readiness checkpoint, and your progress is kept.
              </>
            }
          >
            <div className="grid gap-8 p-2 sm:p-3">
              {domains.map(([number, title]) => {
                const inDomain = rest.filter((l) => l.domain === number);
                return (
                  <section key={number} aria-labelledby={`labs-${number}`}>
                    <h3 id={`labs-${number}`} className="border-b border-foreground/70 pb-2 text-small font-semibold">
                      Domain {domainLabel(number)}: {title}
                    </h3>
                    {/* A ruled list: these rows are read, not pressed, so they have no boxes. */}
                    <ul className="divide-y divide-border border-b border-border">
                      {inDomain.map((lab) => {
                        const { Icon } = LAB_TYPES[lab.type];
                        return (
                          <li key={lab.id} className="flex min-w-0 items-center gap-3.5 py-3">
                            <span
                              aria-hidden
                              className="flex size-8 shrink-0 items-center justify-center rounded-xs bg-primary/10 text-primary"
                            >
                              <Icon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-small font-medium leading-snug">{lab.title}</span>
                              <span className="mt-0.5 block text-note text-muted-foreground">{labMeta(lab)}</span>
                            </span>
                            <Lock
                              className="size-4 shrink-0 text-muted-foreground"
                              role="img"
                              aria-label="Included with Pro"
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}
            </div>
          </ReferenceFold>
        </LanderBlock>
      )}

      <PathCard
        className="mt-16 sm:mt-24"
        kicker={`${examName} study path`}
        title="PBQs are one part of the exam"
        href={path}
        label="Start the study path"
        context="pbq_page"
      >
        The study path covers every exam objective in short steps, and a readiness checkpoint shows where you stand.
      </PathCard>

      <LanderProse>
        {page.intro.map((p) => (
          <p key={p.slice(0, 32)}>{p}</p>
        ))}
      </LanderProse>

      <LanderBlock>
        <RelatedLinks links={page.related ?? []} />
        <FaqSection faqs={page.faqs} />
      </LanderBlock>
    </LanderPage>
  );
}
