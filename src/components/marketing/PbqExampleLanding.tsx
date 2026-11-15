import { Lock } from "lucide-react";
import { pbqRegistry } from "@/data/pbq";
import type { PbqScenario } from "@/data/pbq/types";
import { EXAM_NAMES } from "@/data/path/titles";
import { labLibrary, minutesOf } from "@/core/path/labs";
import type { PbqExamplePage } from "@/lib/seo/cert-pages";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { Footer } from "@/components/marketing/Footer";
import { FaqSection } from "@/components/marketing/FaqSection";
import { PbqLab, type FreeLab, type LabTier } from "@/components/marketing/PbqLab";
import { PathCard } from "@/components/marketing/PathCard";
import { ReferenceFold } from "@/components/marketing/ReferenceFold";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { RelatedLinks } from "@/components/marketing/RelatedLinks";
import { domainLabel, handsOnCount, HANDS_ON_TYPES, LAB_TYPES, labMeta } from "@/components/path/lab-types";

/** Difficulty rank per PBQ type — the on-ramp leads with the lowest. */
function rank(type: PbqScenario["type"]): number {
  return {
    ordering: 1,
    "threat-hunt": 2,
    matching: 2,
    categorization: 3,
    topology: 4,
    simulation: 5,
  }[type];
}

const TIER: Record<PbqScenario["type"], LabTier> = {
  ordering: "Warm-up",
  "threat-hunt": "Core",
  matching: "Core",
  categorization: "Core",
  topology: "Exam-level",
  simulation: "Exam-level",
};

/** Pick up to 3 free scenarios that span easy → exam-level for the chooser. */
function pickFree(scenarios: PbqScenario[]): PbqScenario[] {
  const pool = [...scenarios].sort((a, b) => rank(a.type) - rank(b.type));
  const seen = new Set<string>();
  const chosen: PbqScenario[] = [];
  const add = (s?: PbqScenario) => {
    if (s && !seen.has(s.id)) {
      seen.add(s.id);
      chosen.push(s);
    }
  };
  add(pool[0]); // easiest (warm-up)
  add(pool.find((s) => rank(s.type) >= 2 && rank(s.type) <= 3)); // a core one
  add([...pool].reverse().find((s) => rank(s.type) >= 4)); // an exam-level one
  for (const s of pool) {
    if (chosen.length >= 3) break;
    add(s);
  }
  return chosen.slice(0, 3);
}

/** Shared server template for the /​*-pbq-examples pages. */
export function PbqExampleLanding({ page }: { page: PbqExamplePage }) {
  const scenarios = pbqRegistry[page.certSlug] ?? [];
  const free = pickFree(scenarios);
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

  return (
    <div className="flex min-h-svh flex-col aurora-bg text-foreground">
      <MarketingHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 sm:py-14">
        <h1 className="text-balance font-display text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl">
          {page.h1}
        </h1>
        <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
          Pick one and work it right here: graded straight away, with partial credit and the explanation. No
          account needed.
        </p>

        {/* Lead with the thing they came for: a lab, on the path's own stage. */}
        {labs.length > 0 && (
          <div className="mt-6">
            <PbqLab labs={labs} examName={examName} pathHref={path} labCount={scenarios.length} />
          </div>
        )}

        <ExamVersionNote certSlugs={[page.certSlug]} className="mt-10 max-w-2xl" />
        <div className="mt-6 grid max-w-2xl gap-3 text-muted-foreground">
          {page.intro.map((p) => (
            <p key={p.slice(0, 32)} className="leading-relaxed">
              {p}
            </p>
          ))}
        </div>

        {/* Every other lab, listed the way the path's lab library lists them,
            folded so it's there for anyone looking (and for search) without
            being a wall under the lab. */}
        {rest.length > 0 && (
          <ReferenceFold
            className="mt-8"
            title={`${rest.length} more labs on your ${examName} path`}
            summary={
              <>
                {handsOnCount(rest)}
                {drills > 0 && <>, plus {drills} quick drills</>}, graded with partial credit. All{" "}
                {scenarios.length} come with Pro, offered after your path&apos;s readiness checkpoint.
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
                    <ul className="grid gap-2">
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

        <PathCard
          className="mt-10"
          kicker={`Your ${examName} path`}
          title="PBQs are only part of it"
          href={path}
          label="Start my path"
          context="pbq_page"
        >
          Your guided path walks every exam objective in short stops, and a readiness checkpoint shows where you
          stand.
        </PathCard>

        <RelatedLinks links={page.related ?? []} />

        <FaqSection faqs={page.faqs} />
      </main>
      <Footer />
    </div>
  );
}
