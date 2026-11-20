import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { QuestionDeck } from "@/components/marketing/QuestionDeck";
import { PathCard } from "@/components/marketing/PathCard";
import { LanderHero, LanderPage, LanderProse, LanderSection, LanderStage } from "@/components/marketing/lander/Lander";
import { TileGrid } from "@/components/marketing/lander/TileGrid";
import { ExamVersionNote } from "@/components/marketing/ExamVersionNote";
import { QuickRound } from "@/components/path/QuickRound";
import { JsonLd } from "@/components/seo/JsonLd";
import { practicePageFor } from "@/lib/seo/cert-pages";
import {
  OBJECTIVE_HUB_CERTS,
  replacedBy,
  usesOfficialObjectiveNumbers,
} from "@/lib/seo/exam-versions";
import { codeToSlug } from "@/lib/seo/objective-code";
import { breadcrumbList } from "@/lib/seo/structured-data";
import type { QuickRoundData } from "@/core/path/types";

export interface ObjectiveLandingData {
  certSlug: string;
  certName: string;
  shortCertName: string;
  examCode: string;
  code: string;
  title: string;
  topic: string;
  domainNumber: string | null;
  domainTitle: string | null;
  domainWeight: number | null;
  samples: {
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }[];
  siblings: { code: string; title: string; topic: string; slug: string }[];
}

export function ObjectiveLanding({
  data,
  round = null,
}: {
  data: ObjectiveLandingData;
  /** This objective's stop of the guided path, played inline at the top. */
  round?: QuickRoundData | null;
}) {
  const hub = practicePageFor(data.certSlug);
  const objectiveHub = OBJECTIVE_HUB_CERTS.includes(data.certSlug)
    ? `/objectives/${data.certSlug}`
    : null;
  // Network+ objective numbers aren't CompTIA's yet, so these pages go by topic.
  const official = usesOfficialObjectiveNumbers(data.certSlug);
  const retired = replacedBy(data.certSlug) !== null;
  const heading = official ? `Objective ${data.code}: ${data.title}` : `${data.topic}: ${data.shortCertName} practice questions`;
  const crumb = official ? `Objective ${data.code}` : data.topic;

  const breadcrumbs = breadcrumbList([
    { name: "CertBench", path: "/" },
    { name: `${data.shortCertName} practice`, path: hub },
    ...(objectiveHub ? [{ name: `${data.examCode} objectives`, path: objectiveHub }] : []),
    { name: crumb, path: `/objectives/${data.certSlug}/${codeToSlug(data.code)}` },
  ]);

  return (
    <LanderPage>
      <JsonLd data={breadcrumbs} />
      <LanderHero
        above={
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center justify-center gap-1 text-xs text-muted-foreground">
            <Link href={hub} className="hover:text-foreground">
              {data.shortCertName} practice
            </Link>
            <ChevronRight className="size-3" />
            {objectiveHub && (
              <>
                <Link href={objectiveHub} className="hover:text-foreground">
                  {data.examCode} objectives
                </Link>
                <ChevronRight className="size-3" />
              </>
            )}
            {official && data.domainNumber && (
              <>
                <span>Domain {data.domainNumber}</span>
                <ChevronRight className="size-3" />
              </>
            )}
            <span className={official ? "font-mono" : undefined}>{crumb}</span>
          </nav>
        }
        eyebrow={`${data.certName} · ${data.examCode}`}
        title={heading}
        sub={
          round
            ? `Try it now: ${round.reps.length} quick questions on this ${official ? "objective" : "topic"}.`
            : "Original questions, each explained the moment you answer."
        }
        specs={[
          ...(official && data.domainNumber ? [`Domain ${data.domainNumber}`] : []),
          ...(official && data.domainWeight !== null && !retired ? [`${data.domainWeight}% of the exam`] : []),
          "No account needed",
        ]}
      />
      {retired && (
        <div className="mx-auto mt-8 max-w-2xl px-5 sm:px-6">
          <ExamVersionNote certSlugs={[data.certSlug]} />
        </div>
      )}

      {/* Lead with something to do: this objective's stop of the path. */}
      {round && (
        <LanderStage>
          <QuickRound
            cert={round.cert}
            stopId={data.code}
            examName={round.examName}
            structure={round.structure}
            reps={round.reps}
            label={official ? `Objective ${data.code} · ${round.title}` : round.title}
            surface="objective_page"
            unit={official ? "objectives" : "topics"}
          />
        </LanderStage>
      )}

      {/* The objective's bank questions, one at a time on the path's own card. */}
      {data.samples.length > 0 && (
        <LanderSection
          eyebrow="Exam style"
          title={round ? `More ${official ? data.code : data.topic} practice questions` : undefined}
          sub={`${data.samples.length} questions · explained as you answer`}
          width="md"
          className={round ? undefined : "sm:pt-14"}
        >
          <QuestionDeck
            questions={data.samples}
            label={official ? `Objective ${data.code} · practice questions` : `${data.topic} · practice questions`}
            surface="objective_page"
            path={`/path/${data.certSlug}`}
            examName={data.shortCertName}
          />
        </LanderSection>
      )}

      <div className="mx-auto w-full max-w-5xl px-3 pt-20 sm:px-6 sm:pt-28">
        <PathCard
          kicker={`Your ${data.shortCertName} path`}
          title={official ? `Learn ${data.code} and every other objective` : "Learn this and every other objective"}
          href={`/path/${data.certSlug}`}
          label={`Start my ${data.shortCertName} path`}
          context="objective_page"
          note="No account needed to start."
        >
          Your {data.shortCertName} path walks the whole exam in short stops, one objective at a time, and maps where
          you stand as you go.
        </PathCard>
      </div>

      <LanderProse>
        {official ? (
          <p>
            Practice questions for {data.shortCertName} objective {data.code}, &ldquo;{data.title}.&rdquo; Every
            question is original, written to the {data.examCode} exam objectives, and comes with a full explanation —
            answer them above to see instant grading.
          </p>
        ) : (
          <p>
            Practice questions on {data.topic} for {data.shortCertName} {data.examCode}. Every question is original,
            written for the exam, and comes with a full explanation — answer them above to see instant grading.
          </p>
        )}
        {official && data.domainTitle && data.domainWeight !== null && (
          <p>
            This objective sits in{" "}
            <strong>
              Domain {data.domainNumber}: {data.domainTitle}
            </strong>
            {retired ? (
              <> of the {data.examCode} exam.</>
            ) : (
              <>, which is about {data.domainWeight}% of the exam — so mastering it moves your readiness score meaningfully.</>
            )}
          </p>
        )}
      </LanderProse>

      {/* Sibling objectives — internal linking within the domain */}
      {data.siblings.length > 0 && (
        <LanderSection
          title={
            official
              ? `More objectives${data.domainNumber ? ` in Domain ${data.domainNumber}` : ""}`
              : `More ${data.shortCertName} topics`
          }
          width="xl"
          className="sm:pt-24"
        >
          <TileGrid
            groups={[
              {
                tiles: data.siblings.map((sib) =>
                  official
                    ? { href: `/objectives/${data.certSlug}/${sib.slug}`, code: sib.code, title: sib.topic, detail: sib.title }
                    : { href: `/objectives/${data.certSlug}/${sib.slug}`, title: sib.topic }
                ),
              },
            ]}
          />
        </LanderSection>
      )}

      <p className="mx-auto mt-12 w-full max-w-5xl px-5 text-sm sm:px-6">
        <Link href={objectiveHub ?? hub} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          ← All {data.shortCertName} {objectiveHub ? `${data.examCode} objectives` : "practice questions"}
        </Link>
      </p>
    </LanderPage>
  );
}
